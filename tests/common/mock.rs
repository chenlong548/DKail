use dkail::network::NetworkMonitor;
use dkail::process::ProcessMonitor;
use dkail::threat::ThreatDetector;
use dkail::api::ApiServer;

pub fn create_test_network_monitor() -> NetworkMonitor {
    NetworkMonitor::new("test_interface".to_string())
}

pub fn create_test_process_monitor() -> ProcessMonitor {
    ProcessMonitor::new()
}

pub fn create_test_threat_detector() -> ThreatDetector {
    ThreatDetector::new()
}

pub fn create_test_api_server() -> ApiServer {
    ApiServer::new(8080)
}
