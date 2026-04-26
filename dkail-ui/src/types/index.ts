// 系统状态
export interface SystemStatus {
  network_monitor_active: boolean;
  process_monitor_active: boolean;
  threat_detection_active: boolean;
  alert_count: number;
  uptime: number;
}

// 告警类型
export type AlertType = 
  | 'NetworkAnomaly'
  | 'ProcessAnomaly'
  | 'MalwareDetected'
  | 'SuspiciousActivity'
  | 'SystemAnomaly';

// 严重程度
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

// 告警
export interface Alert {
  id: number;
  timestamp: string;
  alert_type: AlertType;
  severity: Severity;
  source: string;
  description: string;
  details: Record<string, unknown>;
}

// 告警响应
export interface AlertsResponse {
  alerts: Alert[];
  count: number;
}

// 进程信息
export interface ProcessInfo {
  pid: number;
  name: string;
  path: string;
  cpu_usage: number;
  memory_usage: number;
}

// 进程响应
export interface ProcessesResponse {
  processes: ProcessInfo[];
  count: number;
}

// 网络连接
export interface NetworkConnection {
  local_addr: string;
  remote_addr: string;
  protocol: string;
  state: string;
}

// 网络响应
export interface NetworkResponse {
  connections: NetworkConnection[];
  packet_count: number;
  byte_count: number;
}

// 流量数据点
export interface TrafficDataPoint {
  time: string;
  inbound: number;
  outbound: number;
}

// 系统资源
export interface SystemResources {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
}

// 资源响应
export interface ResourcesResponse {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
}

// 设置
export interface Settings {
  monitoring: {
    network_enabled: boolean;
    process_enabled: boolean;
    threat_detection_enabled: boolean;
    scan_interval: number;
  };
  alerts: {
    email_enabled: boolean;
    email_address: string;
    sound_enabled: boolean;
    desktop_notification: boolean;
  };
  appearance: {
    theme: 'dark' | 'light';
    accent_color: string;
    font_size: 'small' | 'medium' | 'large';
  };
}

// 导航项
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}
