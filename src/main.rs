use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use dkail::SystemState;
use dkail::system::SystemMonitor;

// Re-export module functions
use dkail::network::start_monitoring_with_shutdown as start_network_monitoring;
use dkail::process::start_monitoring_with_shutdown as start_process_monitoring;
use dkail::threat::start_detection_with_shutdown as start_detection;
use dkail::api::start_server;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    // Initialize logger with configurable log level
    let log_level = std::env::var("DKAIL_LOG_LEVEL")
        .ok()
        .and_then(|l| l.parse().ok())
        .unwrap_or(log::LevelFilter::Info);
    
    env_logger::Builder::from_default_env()
        .filter_level(log_level)
        .init();

    info!("===========================================");
    info!("DKail Security System starting...");
    info!("Version: 1.0.0");
    info!("===========================================");
    
    // Create shared system state
    let state = Arc::new(RwLock::new(SystemState::default()));
    
    // Create shutdown signal channel
    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);
    let shutdown_rx = Arc::new(shutdown_rx);
    
    // Setup Ctrl+C handler
    let shutdown_tx_clone = shutdown_tx.clone();
    let state_clone = Arc::clone(&state);
    
    tokio::spawn(async move {
        match tokio::signal::ctrl_c().await {
            Ok(()) => {
                info!("Ctrl+C received, initiating graceful shutdown...");
                
                // Update state to indicate shutdown
                {
                    let mut s = state_clone.write().await;
                    s.network_monitor_active = false;
                    s.process_monitor_active = false;
                    s.threat_detection_active = false;
                }
                
                // Send shutdown signal to all tasks
                if shutdown_tx_clone.send(true).is_err() {
                    warn!("Failed to send shutdown signal");
                }
            }
            Err(e) => {
                error!("Failed to listen for Ctrl+C: {}", e);
            }
        }
    });
    
    // Spawn network monitor task
    let network_state = Arc::clone(&state);
    let network_shutdown = Arc::clone(&shutdown_rx);
    let network_handle = tokio::spawn(async move {
        info!("Starting network monitor...");
        if let Err(e) = start_network_monitoring(network_state, network_shutdown).await {
            error!("Network monitor error: {}", e);
        }
        info!("Network monitor stopped");
    });
    
    // Spawn process monitor task
    let process_state = Arc::clone(&state);
    let process_shutdown = Arc::clone(&shutdown_rx);
    let process_handle = tokio::spawn(async move {
        info!("Starting process monitor...");
        if let Err(e) = start_process_monitoring(process_state, process_shutdown).await {
            error!("Process monitor error: {}", e);
        }
        info!("Process monitor stopped");
    });
    
    // Spawn threat detection task
    let threat_state = Arc::clone(&state);
    let threat_shutdown = Arc::clone(&shutdown_rx);
    let threat_handle = tokio::spawn(async move {
        info!("Starting threat detection...");
        if let Err(e) = start_detection(threat_state, threat_shutdown).await {
            error!("Threat detection error: {}", e);
        }
        info!("Threat detection stopped");
    });
    
    // Spawn system resource monitor task
    let resource_state = Arc::clone(&state);
    let mut resource_shutdown = (*shutdown_rx).clone();
    let resource_handle = tokio::spawn(async move {
        info!("Starting system resource monitor...");
        let mut monitor = SystemMonitor::new();
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(2));
        
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    let resources = monitor.get_resources();
                    let mut state = resource_state.write().await;
                    state.cpu_usage = resources.cpu_usage;
                    state.memory_usage = resources.memory_usage;
                    state.disk_usage = resources.disk_usage;
                }
                _ = resource_shutdown.changed() => {
                    if *resource_shutdown.borrow() {
                        break;
                    }
                }
            }
        }
        info!("System resource monitor stopped");
    });
    
    // Run API server in main task (blocking)
    let api_state = Arc::clone(&state);
    info!("Starting API server...");
    if let Err(e) = start_server(api_state).await {
        error!("API server error: {}", e);
    }
    info!("API server stopped");
    
    // Signal other tasks to stop
    let _ = shutdown_tx.send(true);
    
    // Wait for other tasks to complete
    let _ = tokio::try_join!(network_handle, process_handle, threat_handle, resource_handle);
    
    info!("===========================================");
    info!("DKail Security System stopped gracefully");
    info!("===========================================");
    Ok(())
}
