mod common;

mod network_tests {
    use super::common;

    #[test]
    fn test_network_monitor_creation() {
        let monitor = common::create_test_network_monitor();
        assert_eq!(monitor.interface_name, "test_interface");
    }
}

mod process_tests {
    use super::common;

    #[test]
    fn test_process_monitor_creation() {
        let monitor = common::create_test_process_monitor();
        assert!(monitor.process_cache.is_empty());
    }
}

mod threat_tests {
    use super::common;

    #[test]
    fn test_threat_detector_creation() {
        let detector = common::create_test_threat_detector();
        assert_eq!(detector.alert_count, 0);
        assert!(detector.alerts.is_empty());
    }
}

mod api_tests {
    use super::common;

    #[test]
    fn test_api_server_creation() {
        let server = common::create_test_api_server();
        assert_eq!(server.port, 8080);
    }
}
