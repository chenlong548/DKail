use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::time::{Instant, Duration};
use std::sync::mpsc;

use crate::SystemState;

/// Maximum number of connections to track before cleanup
const MAX_CONNECTIONS: usize = 10000;
/// Connection timeout in seconds (5 minutes)
const CONNECTION_TIMEOUT_SECS: u64 = 300;
/// Cleanup interval in seconds
const CLEANUP_INTERVAL_SECS: u64 = 60;

/// Custom error types for network monitoring
#[derive(Debug, thiserror::Error)]
pub enum NetworkError {
    #[error("Interface not found: {0}")]
    InterfaceNotFound(String),
    #[error("Failed to open capture: {0}")]
    CaptureOpenFailed(String),
    #[error("Packet capture error: {0}")]
    CaptureError(String),
    #[error("Packet analysis error: {0}")]
    AnalysisError(String),
    #[error("Connection limit exceeded: {0}")]
    ConnectionLimitExceeded(usize),
    #[error("Invalid packet: {0}")]
    InvalidPacket(String),
}

pub struct NetworkMonitor {
    pub interface_name: String,
    packet_count: u64,
    byte_count: u64,
    connection_stats: HashMap<String, ConnectionStats>,
    shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>,
    last_cleanup: Instant,
}

#[derive(Debug, Clone)]
pub struct ConnectionStats {
    pub source_ip: String,
    pub dest_ip: String,
    pub source_port: u16,
    pub dest_port: u16,
    pub protocol: String,
    pub packet_count: u64,
    pub byte_count: u64,
    pub first_seen: Instant,
    pub last_seen: Instant,
}

impl NetworkMonitor {
    pub fn new(interface_name: String) -> Self {
        Self {
            interface_name,
            packet_count: 0,
            byte_count: 0,
            connection_stats: HashMap::new(),
            shutdown_flag: Arc::new(tokio::sync::watch::channel(false).1),
            last_cleanup: Instant::now(),
        }
    }
    
    /// Create a NetworkMonitor with a shutdown signal receiver
    pub fn with_shutdown(interface_name: String, shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>) -> Self {
        Self {
            interface_name,
            packet_count: 0,
            byte_count: 0,
            connection_stats: HashMap::new(),
            shutdown_flag,
            last_cleanup: Instant::now(),
        }
    }
    
    pub async fn start_capture(&mut self, state: Arc<RwLock<SystemState>>) -> Result<(), NetworkError> {
        info!("Starting network capture on interface: {}", self.interface_name);
        
        {
            let mut s = state.write().await;
            s.network_monitor_active = true;
        }
        
        let device = pcap::Device::list()
            .map_err(|e| NetworkError::CaptureOpenFailed(e.to_string()))?
            .into_iter()
            .find(|d| d.name == self.interface_name)
            .ok_or_else(|| NetworkError::InterfaceNotFound(self.interface_name.clone()))?;
        
        let cap = pcap::Capture::from_device(device)
            .map_err(|e| NetworkError::CaptureOpenFailed(e.to_string()))?
            .promisc(true)
            .snaplen(65535)
            .timeout(1000)
            .open()
            .map_err(|e| NetworkError::CaptureOpenFailed(e.to_string()))?;
        
        info!("Network capture started successfully");
        
        // Create channel for packet data
        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        
        // Spawn capture thread
        let capture_handle = std::thread::spawn(move || {
            let mut cap = cap;
            loop {
                match cap.next_packet() {
                    Ok(packet) => {
                        if tx.send(packet.data.to_vec()).is_err() {
                            break;
                        }
                    }
                    Err(e) => {
                        if !e.to_string().contains("timeout") {
                            warn!("Capture error in thread: {}", e);
                        }
                    }
                }
            }
            info!("Capture thread exiting");
        });
        
        // Process packets in async context
        let shutdown_rx = (*self.shutdown_flag).clone();
        
        loop {
            // Check shutdown signal
            if *shutdown_rx.borrow() {
                info!("Shutdown signal received, stopping network capture");
                break;
            }
            
            // Try to receive packet with timeout
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(packet_data) => {
                    self.packet_count += 1;
                    self.byte_count += packet_data.len() as u64;
                    
                    if self.packet_count % 100 == 0 {
                        info!("Captured {} packets, {} bytes", self.packet_count, self.byte_count);
                    }
                    
                    if let Err(e) = self.analyze_packet(&packet_data) {
                        warn!("Packet analysis error: {}", e);
                    }
                    
                    // Periodic cleanup to prevent memory growth
                    if self.last_cleanup.elapsed() > Duration::from_secs(CLEANUP_INTERVAL_SECS) {
                        self.cleanup_stale_connections();
                        self.last_cleanup = Instant::now();
                    }
                    
                    // Update state
                    {
                        let mut s = state.write().await;
                        s.packet_count = self.packet_count;
                        s.byte_count = self.byte_count;
                        
                        // Convert connection stats to summary
                        let connections: Vec<crate::NetworkConnectionSummary> = self.connection_stats
                            .values()
                            .take(100)
                            .map(|c| crate::NetworkConnectionSummary {
                                local_addr: format!("{}:{}", c.source_ip, c.source_port),
                                remote_addr: format!("{}:{}", c.dest_ip, c.dest_port),
                                protocol: c.protocol.clone(),
                                state: "ESTABLISHED".to_string(),
                            })
                            .collect();
                        s.network_connections = connections;
                    }
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Continue loop to check shutdown
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    warn!("Capture thread disconnected");
                    break;
                }
            }
        }
        
        // Wait for capture thread to finish
        drop(capture_handle);
        
        // Clean up state on exit
        {
            let mut s = state.write().await;
            s.network_monitor_active = false;
        }
        
        Ok(())
    }
    
    /// Clean up stale connections to prevent memory growth
    fn cleanup_stale_connections(&mut self) {
        let now = Instant::now();
        let timeout = Duration::from_secs(CONNECTION_TIMEOUT_SECS);
        
        let before_count = self.connection_stats.len();
        
        self.connection_stats.retain(|_, stats| {
            now.duration_since(stats.last_seen) < timeout
        });
        
        let after_count = self.connection_stats.len();
        
        if before_count != after_count {
            info!("Cleaned up {} stale connections ({} remaining)", before_count - after_count, after_count);
        }
        
        // If still over limit, remove oldest connections
        if self.connection_stats.len() > MAX_CONNECTIONS {
            // Collect keys to remove
            let mut connections: Vec<_> = self.connection_stats
                .iter()
                .map(|(k, v)| (k.clone(), v.last_seen))
                .collect();
            connections.sort_by_key(|(_, t)| *t);
            
            let to_remove = connections.len() - MAX_CONNECTIONS;
            for (key, _) in connections.into_iter().take(to_remove) {
                self.connection_stats.remove(&key);
            }
            
            warn!("Connection limit reached, removed {} oldest connections", to_remove);
        }
    }
    
    fn analyze_packet(&mut self, data: &[u8]) -> Result<(), NetworkError> {
        if data.len() < 14 {
            return Ok(());
        }
        
        let ethertype = u16::from_be_bytes([data[12], data[13]]);
        
        if self.packet_count % 50 == 0 {
            info!("Packet #{}: len={}, ethertype=0x{:04X}", self.packet_count, data.len(), ethertype);
        }
        
        match ethertype {
            0x0800 => {
                if let Err(e) = self.analyze_ipv4_packet(&data[14..]) {
                    if self.packet_count % 100 == 0 {
                        warn!("IPv4 packet analysis error: {}", e);
                    }
                }
            }
            0x86DD => {
                if let Err(e) = self.analyze_ipv6_packet(&data[14..]) {
                    if self.packet_count % 100 == 0 {
                        warn!("IPv6 packet analysis error: {}", e);
                    }
                }
            }
            _ => {}
        }
        
        Ok(())
    }
    
    fn analyze_ipv4_packet(&mut self, data: &[u8]) -> Result<(), NetworkError> {
        // SECURITY FIX: Check minimum IPv4 header length
        if data.len() < 20 {
            return Err(NetworkError::InvalidPacket("IPv4 packet too short".to_string()));
        }
        
        let version = data[0] >> 4;
        if version != 4 {
            return Err(NetworkError::InvalidPacket(format!("Invalid IP version: {}", version)));
        }
        
        // SECURITY FIX: Validate IHL (Internet Header Length) field
        // IHL is the number of 32-bit words in the header
        let ihl = (data[0] & 0x0F) as usize;
        
        // IHL must be at least 5 (20 bytes) and at most 15 (60 bytes)
        if ihl < 5 || ihl > 15 {
            return Err(NetworkError::InvalidPacket(format!("Invalid IHL field: {}", ihl)));
        }
        
        let header_length = ihl * 4;
        
        // SECURITY FIX: Ensure we have enough data for the header
        if data.len() < header_length {
            return Err(NetworkError::InvalidPacket(
                format!("Packet shorter than header length: {} < {}", data.len(), header_length)
            ));
        }
        
        let protocol = data[9];
        let source_ip = format!("{}.{}.{}.{}", data[12], data[13], data[14], data[15]);
        let dest_ip = format!("{}.{}.{}.{}", data[16], data[17], data[18], data[19]);
        
        // SECURITY FIX: Pass correct offset based on actual header length
        let payload = &data[header_length..];
        
        match protocol {
            6 => self.analyze_tcp_packet(payload, &source_ip, &dest_ip)?,
            17 => self.analyze_udp_packet(payload, &source_ip, &dest_ip)?,
            _ => {}
        }
        
        Ok(())
    }
    
    fn analyze_ipv6_packet(&mut self, data: &[u8]) -> Result<(), NetworkError> {
        // SECURITY FIX: Check minimum IPv6 header length
        if data.len() < 40 {
            return Err(NetworkError::InvalidPacket("IPv6 packet too short".to_string()));
        }
        
        let version = data[0] >> 4;
        if version != 6 {
            return Err(NetworkError::InvalidPacket(format!("Invalid IP version: {}", version)));
        }
        
        // IPv6 has a fixed 40-byte header
        let protocol = data[6];
        let source_ip = format!(
            "{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}",
            data[8], data[9], data[10], data[11], data[12], data[13], data[14], data[15],
            data[16], data[17], data[18], data[19], data[20], data[21], data[22], data[23]
        );
        let dest_ip = format!(
            "{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}:{:02x}{:02x}",
            data[24], data[25], data[26], data[27], data[28], data[29], data[30], data[31],
            data[32], data[33], data[34], data[35], data[36], data[37], data[38], data[39]
        );
        
        let payload = &data[40..];
        
        match protocol {
            6 => self.analyze_tcp_packet(payload, &source_ip, &dest_ip)?,
            17 => self.analyze_udp_packet(payload, &source_ip, &dest_ip)?,
            _ => {}
        }
        
        Ok(())
    }
    
    fn analyze_tcp_packet(&mut self, data: &[u8], source_ip: &str, dest_ip: &str) -> Result<(), NetworkError> {
        // SECURITY FIX: Validate TCP header length
        if data.len() < 20 {
            return Err(NetworkError::InvalidPacket("TCP packet too short".to_string()));
        }
        
        let source_port = u16::from_be_bytes([data[0], data[1]]);
        let dest_port = u16::from_be_bytes([data[2], data[3]]);
        
        // SECURITY FIX: Validate TCP data offset
        let data_offset = ((data[12] >> 4) as usize) * 4;
        if data_offset < 20 || data_offset > data.len() {
            return Err(NetworkError::InvalidPacket(
                format!("Invalid TCP data offset: {}", data_offset)
            ));
        }
        
        let key = format!("{}:{}->{}:{}", source_ip, source_port, dest_ip, dest_port);
        
        let is_new = !self.connection_stats.contains_key(&key);
        
        // Check connection limit before adding new connection
        if is_new && self.connection_stats.len() >= MAX_CONNECTIONS {
            self.cleanup_stale_connections();
            
            if self.connection_stats.len() >= MAX_CONNECTIONS {
                warn!("Connection limit reached, dropping new connection: {}", key);
                return Ok(());
            }
        }
        
        let stats = self.connection_stats.entry(key.clone()).or_insert(ConnectionStats {
            source_ip: source_ip.to_string(),
            dest_ip: dest_ip.to_string(),
            source_port,
            dest_port,
            protocol: "TCP".to_string(),
            packet_count: 0,
            byte_count: 0,
            first_seen: Instant::now(),
            last_seen: Instant::now(),
        });
        
        stats.packet_count += 1;
        stats.byte_count += data.len() as u64;
        stats.last_seen = Instant::now();
        
        if is_new && self.packet_count % 50 == 0 {
            info!("New TCP connection: {} (total: {})", key, self.connection_stats.len());
        }
        
        Ok(())
    }
    
    fn analyze_udp_packet(&mut self, data: &[u8], source_ip: &str, dest_ip: &str) -> Result<(), NetworkError> {
        // SECURITY FIX: Validate UDP header length
        if data.len() < 8 {
            return Err(NetworkError::InvalidPacket("UDP packet too short".to_string()));
        }
        
        let source_port = u16::from_be_bytes([data[0], data[1]]);
        let dest_port = u16::from_be_bytes([data[2], data[3]]);
        
        // SECURITY FIX: Validate UDP length field
        let udp_length = u16::from_be_bytes([data[4], data[5]]) as usize;
        if udp_length < 8 || udp_length > data.len() {
            return Err(NetworkError::InvalidPacket(
                format!("Invalid UDP length: {}", udp_length)
            ));
        }
        
        let key = format!("{}:{}->{}:{}", source_ip, source_port, dest_ip, dest_port);
        
        // Check connection limit before adding new connection
        if !self.connection_stats.contains_key(&key) && self.connection_stats.len() >= MAX_CONNECTIONS {
            self.cleanup_stale_connections();
            
            if self.connection_stats.len() >= MAX_CONNECTIONS {
                warn!("Connection limit reached, dropping new connection: {}", key);
                return Ok(());
            }
        }
        
        let stats = self.connection_stats.entry(key).or_insert(ConnectionStats {
            source_ip: source_ip.to_string(),
            dest_ip: dest_ip.to_string(),
            source_port,
            dest_port,
            protocol: "UDP".to_string(),
            packet_count: 0,
            byte_count: 0,
            first_seen: Instant::now(),
            last_seen: Instant::now(),
        });
        
        stats.packet_count += 1;
        stats.byte_count += data.len() as u64;
        stats.last_seen = Instant::now();
        
        Ok(())
    }
    
    pub fn get_stats(&self) -> (u64, u64, usize) {
        (self.packet_count, self.byte_count, self.connection_stats.len())
    }
    
    /// Get connection statistics
    pub fn get_connection_stats(&self) -> &HashMap<String, ConnectionStats> {
        &self.connection_stats
    }
}

pub async fn start_monitoring(state: Arc<RwLock<SystemState>>) -> Result<(), NetworkError> {
    let interface = std::env::var("DKAIL_NETWORK_INTERFACE")
        .unwrap_or_else(|_| "\\Device\\NPF_Loopback".to_string());
    
    let mut monitor = NetworkMonitor::new(interface);
    
    match monitor.start_capture(state).await {
        Ok(_) => info!("Network monitoring completed"),
        Err(e) => error!("Network monitoring error: {}", e),
    }
    
    Ok(())
}

/// Start monitoring with shutdown signal support
pub async fn start_monitoring_with_shutdown(
    state: Arc<RwLock<SystemState>>,
    shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>,
) -> Result<(), NetworkError> {
    let interface = std::env::var("DKAIL_NETWORK_INTERFACE")
        .unwrap_or_else(|_| {
            // Try to find a suitable default interface
            if let Ok(devices) = pcap::Device::list() {
                for device in &devices {
                    // Skip loopback and empty names
                    if !device.name.contains("Loopback") && !device.name.is_empty() {
                        if let Some(desc) = &device.desc {
                            if desc.contains("Ethernet") || desc.contains("Wi-Fi") || desc.contains("Wireless") {
                                info!("Auto-detected network interface: {} ({})", device.name, desc);
                                return device.name.clone();
                            }
                        }
                    }
                }
                // Fallback to first non-loopback interface
                for device in &devices {
                    if !device.name.contains("Loopback") && !device.name.is_empty() {
                        info!("Using first available interface: {}", device.name);
                        return device.name.clone();
                    }
                }
            }
            // Last resort fallback
            info!("Using loopback interface as fallback");
            "\\Device\\NPF_Loopback".to_string()
        });
    
    let mut monitor = NetworkMonitor::with_shutdown(interface, shutdown_flag);
    monitor.start_capture(state).await
}
