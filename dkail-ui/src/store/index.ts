import { create } from 'zustand';
import type { 
  SystemStatus, 
  Alert, 
  ProcessInfo, 
  NetworkConnection, 
  TrafficDataPoint,
  SystemResources,
  Settings 
} from '../types';
import { apiService } from '../services/api';

interface AppState {
  // 系统状态
  systemStatus: SystemStatus | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  
  // 告警数据
  alerts: Alert[];
  alertCount: number;
  
  // 进程数据
  processes: ProcessInfo[];
  processCount: number;
  selectedProcess: ProcessInfo | null;
  
  // 网络数据
  connections: NetworkConnection[];
  packetCount: number;
  byteCount: number;
  trafficData: TrafficDataPoint[];
  
  // 系统资源
  resources: SystemResources;
  
  // 设置
  settings: Settings;
  
  // UI状态
  activeTab: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSystemStatus: (status: SystemStatus) => void;
  setConnected: (connected: boolean) => void;
  setAlerts: (alerts: Alert[], count: number) => void;
  addAlert: (alert: Alert) => void;
  setProcesses: (processes: ProcessInfo[]) => void;
  setSelectedProcess: (process: ProcessInfo | null) => void;
  setConnections: (connections: NetworkConnection[]) => void;
  setPacketCount: (count: number) => void;
  setByteCount: (count: number) => void;
  setTrafficData: (data: TrafficDataPoint[]) => void;
  addTrafficPoint: (point: TrafficDataPoint) => void;
  setResources: (resources: SystemResources) => void;
  setSettings: (settings: Settings) => void;
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAlerts: () => void;
  fetchProcesses: () => Promise<void>;
}

const defaultSettings: Settings = {
  monitoring: {
    network_enabled: true,
    process_enabled: true,
    threat_detection_enabled: true,
    scan_interval: 5000,
  },
  alerts: {
    email_enabled: false,
    email_address: '',
    sound_enabled: true,
    desktop_notification: true,
  },
  appearance: {
    theme: 'dark',
    accent_color: '#00FF00',
    font_size: 'medium',
  },
};

const defaultResources: SystemResources = {
  cpu_usage: 0,
  memory_usage: 0,
  disk_usage: 0,
  network_in: 0,
  network_out: 0,
};

export const useStore = create<AppState>((set) => ({
  // 初始状态
  systemStatus: null,
  isConnected: false,
  lastUpdate: null,
  alerts: [],
  alertCount: 0,
  processes: [],
  processCount: 0,
  selectedProcess: null,
  connections: [],
  packetCount: 0,
  byteCount: 0,
  trafficData: [],
  resources: defaultResources,
  settings: defaultSettings,
  activeTab: 'dashboard',
  isLoading: false,
  error: null,
  
  // Actions
  setSystemStatus: (status) => set({ systemStatus: status, lastUpdate: new Date() }),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  setAlerts: (alerts, count) => set({ alerts, alertCount: count }),
  
  addAlert: (alert) => set((state) => ({ 
    alerts: [alert, ...state.alerts].slice(0, 100),
    alertCount: state.alertCount + 1 
  })),
  
  setProcesses: (processes) => set({ 
    processes, 
    processCount: processes.length 
  }),
  
  setSelectedProcess: (process) => set({ selectedProcess: process }),
  
  setConnections: (connections) => set({ connections }),
  
  setPacketCount: (count) => set({ packetCount: count }),
  
  setByteCount: (count) => set({ byteCount: count }),
  
  setTrafficData: (data) => set({ trafficData: data }),
  
  addTrafficPoint: (point) => set((state) => ({ 
    trafficData: [...state.trafficData.slice(-59), point] 
  })),
  
  setResources: (resources) => set({ resources }),
  
  setSettings: (settings) => set({ settings }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  clearAlerts: () => set({ alerts: [], alertCount: 0 }),
  
  fetchProcesses: async () => {
    try {
      set({ isLoading: true, error: null });
      const processesData = await apiService.getProcesses();
      set({ 
        processes: processesData.processes, 
        processCount: processesData.processes.length,
        lastUpdate: new Date(),
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch processes:', error);
      set({ 
        error: 'Failed to fetch processes', 
        isLoading: false 
      });
    }
  },
}));
