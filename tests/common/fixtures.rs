#[allow(dead_code)]
pub const TEST_INTERFACE_NAME: &str = "test_interface";
#[allow(dead_code)]
pub const TEST_API_PORT: u16 = 8080;
#[allow(dead_code)]
pub const TEST_AUTH_TOKEN: &str = "test_token";

#[allow(dead_code)]
pub fn get_test_packet_data() -> Vec<u8> {
    vec![0; 64]
}

#[allow(dead_code)]
pub fn get_test_ipv4_packet() -> Vec<u8> {
    let mut packet = vec![0u8; 20];
    packet[0] = 0x45;
    packet
}

#[allow(dead_code)]
pub fn get_test_process_info() -> (u32, String, String) {
    (1234, "test_process.exe".to_string(), "C:\\test\\test_process.exe".to_string())
}
