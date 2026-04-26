import type { 
  SystemStatus, 
  AlertsResponse, 
  ProcessesResponse, 
  NetworkResponse,
  ResourcesResponse
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8080';

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private onMessage: ((data: unknown) => void) | null = null;
  private onConnect: (() => void) | null = null;
  private onDisconnect: (() => void) | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.authToken = localStorage.getItem('dkail_auth_token');
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('dkail_auth_token', token);
    } else {
      localStorage.removeItem('dkail_auth_token');
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return this.get<SystemStatus>('/status');
  }

  async getAlerts(): Promise<AlertsResponse> {
    return this.get<AlertsResponse>('/alerts');
  }

  async getProcesses(): Promise<ProcessesResponse> {
    return this.get<ProcessesResponse>('/processes');
  }

  async getNetwork(): Promise<NetworkResponse> {
    return this.get<NetworkResponse>('/network');
  }

  async getResources(): Promise<ResourcesResponse> {
    return this.get<ResourcesResponse>('/resources');
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }

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
      const ws = new WebSocket(`${wsUrl}/ws`);
      
      if (this.authToken) {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'auth', token: this.authToken }));
        };
      }

      ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'auth_required' && this.authToken) {
            ws.send(JSON.stringify({ type: 'auth', token: this.authToken }));
            return;
          }
          
          if (data.type === 'auth_failed') {
            console.error('WebSocket authentication failed');
            ws.close();
            return;
          }
          
          this.onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.onDisconnect?.();
        this.attemptReconnect();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws = ws;
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
