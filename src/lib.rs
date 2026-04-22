// Core types - must be defined before module declarations
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Alert {
    pub id: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub alert_type: AlertType,
    pub severity: Severity,
    pub source: String,
    pub description: String,
    pub details: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum AlertType {
    NetworkAnomaly,
    ProcessAnomaly,
    MalwareDetected,
    SuspiciousActivity,
    SystemAnomaly,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for Alert {
    fn default() -> Self {
        Self {
            id: 0,
            timestamp: chrono::Utc::now(),
            alert_type: AlertType::SuspiciousActivity,
            severity: Severity::Medium,
            source: String::new(),
            description: String::new(),
            details: serde_json::json!({}),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProcessSummary {
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub cpu_usage: f32,
    pub memory_usage: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NetworkConnectionSummary {
    pub local_addr: String,
    pub remote_addr: String,
    pub protocol: String,
    pub state: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SystemState {
    pub network_monitor_active: bool,
    pub process_monitor_active: bool,
    pub threat_detection_active: bool,
    pub alerts: Vec<Alert>,
    pub packet_count: u64,
    pub byte_count: u64,
    pub process_count: u32,
    pub alert_count: u64,
    pub processes: Vec<ProcessSummary>,
    pub network_connections: Vec<NetworkConnectionSummary>,
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
    pub network_in: u64,
    pub network_out: u64,
}

impl Default for SystemState {
    fn default() -> Self {
        Self {
            network_monitor_active: false,
            process_monitor_active: false,
            threat_detection_active: false,
            alerts: Vec::new(),
            packet_count: 0,
            byte_count: 0,
            process_count: 0,
            alert_count: 0,
            processes: Vec::new(),
            network_connections: Vec::new(),
            cpu_usage: 0.0,
            memory_usage: 0.0,
            disk_usage: 0.0,
            network_in: 0,
            network_out: 0,
        }
    }
}

// Module declarations
pub mod network;
pub mod process;
pub mod threat;
pub mod api;

// Re-exports
pub use network::NetworkMonitor;
pub use network::NetworkError;
pub use process::ProcessMonitor;
pub use process::ProcessError;
pub use process::ProcessHandle;
pub use threat::ThreatDetector;
pub use threat::ThreatError;
pub use api::ApiServer;
pub use api::ApiError;
pub use api::ApiConfig;
