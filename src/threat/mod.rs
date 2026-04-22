use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::Instant;

use crate::{SystemState, Alert, AlertType, Severity};

/// Maximum number of alerts to keep in memory
const MAX_ALERTS: usize = 1000;

/// Custom error types for threat detection
#[derive(Debug, thiserror::Error)]
pub enum ThreatError {
    #[error("Detection cycle failed: {0}")]
    DetectionFailed(String),
    #[error("Alert limit exceeded: {0}")]
    AlertLimitExceeded(usize),
    #[error("Invalid signature: {0}")]
    InvalidSignature(String),
}

pub struct ThreatDetector {
    pub alert_count: u64,
    pub alerts: Vec<Alert>,
    threat_signatures: Vec<ThreatSignature>,
    shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>,
    last_detection: Instant,
}

#[derive(Debug, Clone)]
pub struct ThreatSignature {
    pub name: String,
    pub signature_type: SignatureType,
    pub pattern: String,
    pub severity: Severity,
}

#[derive(Debug, Clone)]
pub enum SignatureType {
    NetworkPattern,
    ProcessName,
    FilePath,
    RegistryKey,
    BehaviorPattern,
}

impl ThreatDetector {
    pub fn new() -> Self {
        Self {
            alert_count: 0,
            alerts: Vec::new(),
            threat_signatures: Self::load_default_signatures(),
            shutdown_flag: Arc::new(tokio::sync::watch::channel(false).1),
            last_detection: Instant::now(),
        }
    }
    
    /// Create a ThreatDetector with a shutdown signal receiver
    pub fn with_shutdown(shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>) -> Self {
        Self {
            alert_count: 0,
            alerts: Vec::new(),
            threat_signatures: Self::load_default_signatures(),
            shutdown_flag,
            last_detection: Instant::now(),
        }
    }
    
    fn load_default_signatures() -> Vec<ThreatSignature> {
        vec![
            ThreatSignature {
                name: "Mimikatz Detection".to_string(),
                signature_type: SignatureType::ProcessName,
                pattern: "mimikatz".to_string(),
                severity: Severity::Critical,
            },
            ThreatSignature {
                name: "Procdump Detection".to_string(),
                signature_type: SignatureType::ProcessName,
                pattern: "procdump".to_string(),
                severity: Severity::Critical,
            },
            ThreatSignature {
                name: "Lazagne Detection".to_string(),
                signature_type: SignatureType::ProcessName,
                pattern: "lazagne".to_string(),
                severity: Severity::Critical,
            },
            ThreatSignature {
                name: "Suspicious Network Port".to_string(),
                signature_type: SignatureType::NetworkPattern,
                pattern: "4444".to_string(),
                severity: Severity::High,
            },
            ThreatSignature {
                name: "Reverse Shell Port".to_string(),
                signature_type: SignatureType::NetworkPattern,
                pattern: "4445".to_string(),
                severity: Severity::High,
            },
            ThreatSignature {
                name: "Suspicious File Path".to_string(),
                signature_type: SignatureType::FilePath,
                pattern: "\\temp\\".to_string(),
                severity: Severity::Medium,
            },
            ThreatSignature {
                name: "Suspicious Temp Execution".to_string(),
                signature_type: SignatureType::FilePath,
                pattern: "\\windows\\temp\\".to_string(),
                severity: Severity::High,
            },
        ]
    }
    
    pub async fn start_detection(&mut self, state: Arc<RwLock<SystemState>>) -> Result<(), ThreatError> {
        info!("Starting threat detection");
        
        {
            let mut s = state.write().await;
            s.threat_detection_active = true;
        }
        
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(10));
        let mut shutdown_rx = (*self.shutdown_flag).clone();
        
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = self.run_detection_cycle(state.clone()).await {
                        warn!("Detection cycle error: {}", e);
                    }
                    
                    {
                        let mut s = state.write().await;
                        s.alert_count = self.alert_count;
                        s.alerts = self.alerts.clone();
                    }
                }
                _ = shutdown_rx.changed() => {
                    info!("Shutdown signal received, stopping threat detection");
                    break;
                }
            }
        }
        
        // Clean up state on exit
        {
            let mut s = state.write().await;
            s.threat_detection_active = false;
        }
        
        Ok(())
    }
    
    /// Run a complete detection cycle
    async fn run_detection_cycle(&mut self, state: Arc<RwLock<SystemState>>) -> Result<(), ThreatError> {
        let start_time = Instant::now();
        info!("Running threat detection cycle");
        
        let mut threats_found = 0;
        
        // Read current system state for analysis
        let system_state = state.read().await;
        
        // Check for anomalies in network traffic
        if system_state.packet_count > 0 {
            // High packet count could indicate scanning or DDoS
            if system_state.packet_count > 100000 {
                let alert = self.create_alert(
                    AlertType::NetworkAnomaly,
                    Severity::High,
                    "NetworkMonitor",
                    &format!("High network activity detected: {} packets", system_state.packet_count),
                );
                self.add_alert(alert)?;
                threats_found += 1;
            }
        }
        
        // Check for suspicious process patterns
        if system_state.process_count > 500 {
            let alert = self.create_alert(
                AlertType::SystemAnomaly,
                Severity::Medium,
                "ProcessMonitor",
                &format!("Unusually high process count: {}", system_state.process_count),
            );
            self.add_alert(alert)?;
            threats_found += 1;
        }
        
        // Check for rapid alert generation (could indicate ongoing attack)
        if self.alerts.len() > 100 {
            let recent_alerts = self.alerts.iter()
                .filter(|a| a.timestamp.timestamp() > chrono::Utc::now().timestamp() - 300)
                .count();
            
            if recent_alerts > 50 {
                let alert = self.create_alert(
                    AlertType::SystemAnomaly,
                    Severity::Critical,
                    "ThreatDetector",
                    &format!("Rapid alert generation detected: {} alerts in 5 minutes", recent_alerts),
                );
                self.add_alert(alert)?;
                threats_found += 1;
            }
        }
        
        drop(system_state);
        
        // Clean up old alerts if we're at capacity
        if self.alerts.len() > MAX_ALERTS {
            self.alerts.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
            self.alerts.truncate(MAX_ALERTS);
            info!("Trimmed alerts to {} entries", MAX_ALERTS);
        }
        
        self.last_detection = Instant::now();
        
        let duration = start_time.elapsed();
        info!("Detection cycle completed in {:?}ms, {} threats found", duration.as_millis(), threats_found);
        
        Ok(())
    }
    
    /// Add an alert to the list, enforcing limits
    fn add_alert(&mut self, alert: Alert) -> Result<(), ThreatError> {
        if self.alerts.len() >= MAX_ALERTS {
            // Remove oldest alerts
            self.alerts.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
            self.alerts.truncate(MAX_ALERTS - 1);
        }
        
        self.alerts.push(alert);
        Ok(())
    }
    
    pub fn check_network_pattern(&mut self, pattern: &str, source: &str) -> Option<Alert> {
        for signature in &self.threat_signatures {
            if let SignatureType::NetworkPattern = signature.signature_type {
                if pattern.contains(&signature.pattern) {
                    let alert = self.create_alert(
                        AlertType::NetworkAnomaly,
                        signature.severity.clone(),
                        source,
                        &format!("Network pattern matched: {}", signature.name),
                    );
                    return Some(alert);
                }
            }
        }
        None
    }
    
    pub fn check_process_name(&mut self, name: &str, source: &str) -> Option<Alert> {
        for signature in &self.threat_signatures {
            if let SignatureType::ProcessName = signature.signature_type {
                if name.to_lowercase().contains(&signature.pattern.to_lowercase()) {
                    let alert = self.create_alert(
                        AlertType::MalwareDetected,
                        signature.severity.clone(),
                        source,
                        &format!("Malicious process detected: {}", signature.name),
                    );
                    return Some(alert);
                }
            }
        }
        None
    }
    
    pub fn check_file_path(&mut self, path: &str, source: &str) -> Option<Alert> {
        for signature in &self.threat_signatures {
            if let SignatureType::FilePath = signature.signature_type {
                if path.to_lowercase().contains(&signature.pattern.to_lowercase()) {
                    let alert = self.create_alert(
                        AlertType::SuspiciousActivity,
                        signature.severity.clone(),
                        source,
                        &format!("Suspicious file path: {}", signature.name),
                    );
                    return Some(alert);
                }
            }
        }
        None
    }
    
    fn create_alert(
        &mut self,
        alert_type: AlertType,
        severity: Severity,
        source: &str,
        description: &str,
    ) -> Alert {
        self.alert_count += 1;
        
        let alert = Alert {
            id: self.alert_count,
            timestamp: chrono::Utc::now(),
            alert_type,
            severity,
            source: source.to_string(),
            description: description.to_string(),
            details: serde_json::json!({
                "detection_time": chrono::Utc::now().to_rfc3339(),
            }),
        };
        
        warn!("Alert generated: {} - {} [{}]", alert.id, alert.description, alert.severity_as_str());
        
        alert
    }
    
    pub fn get_alert_count(&self) -> u64 {
        self.alert_count
    }
    
    pub fn get_alerts(&self) -> &[Alert] {
        &self.alerts
    }
    
    /// Get alerts filtered by severity
    pub fn get_alerts_by_severity(&self, severity: &Severity) -> Vec<&Alert> {
        self.alerts.iter()
            .filter(|a| std::mem::discriminant(&a.severity) == std::mem::discriminant(severity))
            .collect()
    }
}

impl Alert {
    /// Get severity as string for logging
    pub fn severity_as_str(&self) -> &'static str {
        match self.severity {
            Severity::Low => "LOW",
            Severity::Medium => "MEDIUM",
            Severity::High => "HIGH",
            Severity::Critical => "CRITICAL",
        }
    }
}

pub async fn start_detection(state: Arc<RwLock<SystemState>>) -> Result<(), ThreatError> {
    let mut detector = ThreatDetector::new();
    
    match detector.start_detection(state).await {
        Ok(_) => info!("Threat detection completed"),
        Err(e) => error!("Threat detection error: {}", e),
    }
    
    Ok(())
}

/// Start detection with shutdown signal support
pub async fn start_detection_with_shutdown(
    state: Arc<RwLock<SystemState>>,
    shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>,
) -> Result<(), ThreatError> {
    let mut detector = ThreatDetector::with_shutdown(shutdown_flag);
    detector.start_detection(state).await
}
