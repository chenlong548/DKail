// Adversarial packet-parsing tests.
//
// Every input below is a byte sequence an attacker can put on the wire. The
// parser must reject each one with an error: never panic, and never compute an
// offset past the end of the buffer. `analyze_ipv4_packet` receives the IPv4
// packet with the 14-byte Ethernet header already stripped, which is what these
// fixtures build.
//
// Declared from src/network/mod.rs as a child module, so `super` is the
// `network` module and its private items are reachable.

use super::*;

/// A raw IPv4 packet of exactly `buffer_len` bytes, declaring header length
/// `ihl` (in 32-bit words) and carrying `protocol`.
fn ipv4_packet(ihl: u8, buffer_len: usize, protocol: u8) -> Vec<u8> {
    let mut p = vec![0u8; 20.max(buffer_len)];
    p[0] = 0x40 | (ihl & 0x0F); // version 4 | IHL nibble
    p[9] = protocol;
    p[12..16].copy_from_slice(&[10, 0, 0, 1]);
    p[16..20].copy_from_slice(&[10, 0, 0, 2]);
    p.truncate(buffer_len);
    p
}

fn err_msg(r: Result<(), NetworkError>) -> String {
    match r {
        Err(NetworkError::InvalidPacket(m)) => m,
        other => panic!("expected InvalidPacket, got {:?}", other),
    }
}

/// The headline case. IHL is inside the legal 5..=15 range, so a range check on
/// its own passes -- but the 60-byte header it describes is not present in a
/// 22-byte buffer. Without the second check, the payload offset `&data[60..]` is
/// past the end of the buffer.
#[test]
fn ihl_in_range_but_header_not_present_is_rejected() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let msg = err_msg(m.analyze_ipv4_packet(&ipv4_packet(15, 22, 6)));
    assert!(
        msg.contains("Packet shorter than header length"),
        "got: {}",
        msg
    );
}

/// Exhaustive over the field. IHL is four bits, so 0..=15 is its whole domain.
/// With a 60-byte buffer present, 5..=15 must be accepted and 0..=4 rejected.
/// This also documents that the `ihl > 15` arm of the range check is
/// unreachable: the nibble cannot express a larger value.
#[test]
fn every_ihl_nibble_is_classified() {
    for ihl in 0u8..16 {
        let mut m = NetworkMonitor::new("test0".to_string());
        // protocol 1 (ICMP) so no further header parsing is attempted
        let r = m.analyze_ipv4_packet(&ipv4_packet(ihl, 60, 1));
        if ihl < 5 {
            let msg = err_msg(r);
            assert!(
                msg.contains("Invalid IHL field"),
                "ihl={} got: {}",
                ihl,
                msg
            );
        } else {
            assert!(r.is_ok(), "ihl={} should parse, got {:?}", ihl, r);
        }
    }
}

/// An IHL at the top of the legal range, with a buffer that really holds it.
#[test]
fn maximum_legal_ihl_with_full_buffer_is_accepted() {
    let mut m = NetworkMonitor::new("test0".to_string());
    assert!(m.analyze_ipv4_packet(&ipv4_packet(15, 60, 1)).is_ok());
}

/// A legal IHL whose declared header does not fit.
#[test]
fn legal_ihl_beyond_buffer_is_rejected() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let msg = err_msg(m.analyze_ipv4_packet(&ipv4_packet(6, 22, 1)));
    assert!(
        msg.contains("Packet shorter than header length"),
        "got: {}",
        msg
    );
}

/// Below the 20-byte minimum the version and IHL bytes may not exist at all.
#[test]
fn buffer_below_ipv4_minimum_is_rejected() {
    for len in 0..20 {
        let mut m = NetworkMonitor::new("test0".to_string());
        let msg = err_msg(m.analyze_ipv4_packet(&ipv4_packet(5, len, 1)));
        assert!(
            msg.contains("IPv4 packet too short"),
            "len={} got: {}",
            len,
            msg
        );
    }
}

/// Long enough, but the version nibble does not say IPv4.
#[test]
fn wrong_version_nibble_is_rejected() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let mut p = ipv4_packet(5, 40, 1);
    p[0] = 0x60 | 5; // version 6 fed to the IPv4 parser
    let msg = err_msg(m.analyze_ipv4_packet(&p));
    assert!(msg.contains("Invalid IP version"), "got: {}", msg);
}

#[test]
fn truncated_ipv6_is_rejected() {
    for len in 0..40 {
        let mut m = NetworkMonitor::new("test0".to_string());
        let msg = err_msg(m.analyze_ipv6_packet(&vec![0x60u8; len]));
        assert!(
            msg.contains("IPv6 packet too short"),
            "len={} got: {}",
            len,
            msg
        );
    }
}

#[test]
fn truncated_tcp_is_rejected() {
    for len in 0..20 {
        let mut m = NetworkMonitor::new("test0".to_string());
        let msg = err_msg(m.analyze_tcp_packet(&vec![0u8; len], "10.0.0.1", "10.0.0.2"));
        assert!(
            msg.contains("TCP packet too short"),
            "len={} got: {}",
            len,
            msg
        );
    }
}

/// The TCP data offset is the same class of field as IHL: four bits, scaled by
/// four. Out of range in both directions.
#[test]
fn tcp_data_offset_past_buffer_is_rejected() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let mut tcp = vec![0u8; 20];
    tcp[12] = 0xF0; // offset = 15 * 4 = 60 > 20
    let msg = err_msg(m.analyze_tcp_packet(&tcp, "10.0.0.1", "10.0.0.2"));
    assert!(msg.contains("Invalid TCP data offset"), "got: {}", msg);
}

#[test]
fn tcp_data_offset_below_minimum_is_rejected() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let mut tcp = vec![0u8; 20];
    tcp[12] = 0x40; // offset = 4 * 4 = 16 < 20
    let msg = err_msg(m.analyze_tcp_packet(&tcp, "10.0.0.1", "10.0.0.2"));
    assert!(msg.contains("Invalid TCP data offset"), "got: {}", msg);
}

/// The checks must not reject well-formed traffic: a minimum-size TCP header
/// with data offset 5 parses and is tracked.
#[test]
fn valid_tcp_header_is_accepted_and_tracked() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let mut tcp = vec![0u8; 20];
    tcp[12] = 0x50; // offset = 5 * 4 = 20
    assert!(m.analyze_tcp_packet(&tcp, "10.0.0.1", "10.0.0.2").is_ok());
    assert_eq!(m.connection_stats.len(), 1);
}

#[test]
fn truncated_udp_is_rejected() {
    for len in 0..8 {
        let mut m = NetworkMonitor::new("test0".to_string());
        let msg = err_msg(m.analyze_udp_packet(&vec![0u8; len], "10.0.0.1", "10.0.0.2"));
        assert!(
            msg.contains("UDP packet too short"),
            "len={} got: {}",
            len,
            msg
        );
    }
}

/// The UDP length field is attacker-chosen and must fit the buffer both ways.
#[test]
fn udp_length_past_buffer_is_rejected() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let mut udp = vec![0u8; 8];
    udp[4..6].copy_from_slice(&9999u16.to_be_bytes());
    let msg = err_msg(m.analyze_udp_packet(&udp, "10.0.0.1", "10.0.0.2"));
    assert!(msg.contains("Invalid UDP length"), "got: {}", msg);
}

#[test]
fn udp_length_below_minimum_is_rejected() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let mut udp = vec![0u8; 8];
    udp[4..6].copy_from_slice(&4u16.to_be_bytes());
    let msg = err_msg(m.analyze_udp_packet(&udp, "10.0.0.1", "10.0.0.2"));
    assert!(msg.contains("Invalid UDP length"), "got: {}", msg);
}

#[test]
fn valid_udp_datagram_is_accepted_and_tracked() {
    let mut m = NetworkMonitor::new("test0".to_string());
    let mut udp = vec![0u8; 8];
    udp[4..6].copy_from_slice(&8u16.to_be_bytes());
    assert!(m.analyze_udp_packet(&udp, "10.0.0.1", "10.0.0.2").is_ok());
    assert_eq!(m.connection_stats.len(), 1);
}

/// The state ceiling is part of the same defence. A flood of distinct 5-tuples
/// with nothing stale to reap must not grow the table without bound: the monitor
/// drops new connections rather than allocating for them.
#[test]
fn connection_table_respects_its_ceiling() {
    let mut m = NetworkMonitor::new("test0".to_string());
    for i in 0..(MAX_CONNECTIONS + 64) {
        let mut tcp = vec![0u8; 20];
        tcp[12] = 0x50;
        tcp[0..2].copy_from_slice(&((i % 65535) as u16).to_be_bytes());
        let _ = m.analyze_tcp_packet(&tcp, "10.0.0.1", "10.0.0.2");
    }
    assert!(
        m.connection_stats.len() <= MAX_CONNECTIONS,
        "connection table grew to {} (ceiling {})",
        m.connection_stats.len(),
        MAX_CONNECTIONS
    );
}
