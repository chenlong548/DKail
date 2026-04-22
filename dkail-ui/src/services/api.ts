import type { 
  SystemStatus, 
  AlertsResponse, 
  ProcessesResponse, 
  NetworkResponse 
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8080';

class ApiService {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private onMessage: ((data: unknown) => void) | null = null;
  private onConnect: (() => void) | null = null;
  private onDisconnect: (() => void) | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // HTTP API 方法
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // 系统状态
  async getSystemStatus(): Promise<SystemStatus> {
    return this.get<SystemStatus>('/status');
  }

  // 告警
  async getAlerts(): Promise<AlertsResponse> {
    return this.get<AlertsResponse>('/alerts');
  }

  // 进程
  async getProcesses(): Promise<ProcessesResponse> {
    return this.get<ProcessesResponse>('/processes');
  }

  // 网络
  async getNetwork(): Promise<NetworkResponse> {
    return this.get<NetworkResponse>('/network');
  }

  // WebSocket 连接
  connectWebSocket(
    onMessage: (data: unknown) => void,
    onConnect?: () => void,
    onDisconnect?: () => void
  ): void {
    this.onMessage = onMessage;
    this.onConnect = onConnect ?? null;
    this.onDisconnect = onDisconnect ?? null;
    this.createWebSocket();
  }

  private createWebSocket(): void {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    
    try {
      this.ws = new WebSocket(`${wsUrl}/ws`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.onDisconnect?.();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.createWebSocket();
      }, this.reconnectDelay);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // 模拟数据生成（用于开发测试）
  generateMockData() {
    return {
      systemStatus: {
        network_monitor_active: true,
        process_monitor_active: true,
        threat_detection_active: true,
        alert_count: Math.floor(Math.random() * 10),
        uptime: Math.floor(Date.now() / 1000),
      },
      trafficData: {
        time: new Date().toLocaleTimeString(),
        inbound: Math.floor(Math.random() * 1000),
        outbound: Math.floor(Math.random() * 800),
      },
      resources: {
        cpu_usage: Math.floor(Math.random() * 100),
        memory_usage: Math.floor(Math.random() * 100),
        disk_usage: Math.floor(Math.random() * 100),
        network_in: Math.floor(Math.random() * 10000),
        network_out: Math.floor(Math.random() * 8000),
      },
    };
  }
}

export const apiService = new ApiService();
