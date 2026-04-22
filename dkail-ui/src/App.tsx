import { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store';
import { apiService } from './services/api';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import NetworkMonitor from './pages/NetworkMonitor';
import ProcessMonitor from './pages/ProcessMonitor';
import ThreatDetection from './pages/ThreatDetection';
import Settings from './pages/Settings';

function App() {
  const { 
    setSystemStatus, 
    setConnected, 
    setAlerts, 
    setProcesses, 
    setConnections,
    addTrafficPoint,
    setResources,
    setLoading
  } = useStore();

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((data: unknown) => {
    const message = data as Record<string, unknown>;
    
    if (message.type === 'status') {
      setSystemStatus(message.data as Parameters<typeof setSystemStatus>[0]);
    } else if (message.type === 'alerts') {
      const alertData = message.data as { alerts: Parameters<typeof setAlerts>[0]; count: number };
      setAlerts(alertData.alerts, alertData.count);
    } else if (message.type === 'processes') {
      setProcesses(message.data as Parameters<typeof setProcesses>[0]);
    } else if (message.type === 'network') {
      setConnections(message.data as Parameters<typeof setConnections>[0]);
    } else if (message.type === 'traffic') {
      addTrafficPoint(message.data as Parameters<typeof addTrafficPoint>[0]);
    } else if (message.type === 'resources') {
      setResources(message.data as Parameters<typeof setResources>[0]);
    }
  }, [setSystemStatus, setAlerts, setProcesses, setConnections, addTrafficPoint, setResources]);

  // 初始化数据获取
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 尝试连接后端API
        const status = await apiService.getSystemStatus();
        setSystemStatus(status);
        setConnected(true);

        const alerts = await apiService.getAlerts();
        setAlerts(alerts.alerts, alerts.count);

        const processes = await apiService.getProcesses();
        setProcesses(processes.processes);

        const network = await apiService.getNetwork();
        setConnections(network.connections);
      } catch (error) {
        console.warn('Backend API not available, using mock data');
        // 使用模拟数据
        const mockData = apiService.generateMockData();
        setSystemStatus(mockData.systemStatus);
        setResources(mockData.resources);
        addTrafficPoint(mockData.trafficData);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 尝试WebSocket连接
    apiService.connectWebSocket(
      handleWebSocketMessage,
      () => setConnected(true),
      () => setConnected(false)
    );

    // 定时更新模拟数据（开发模式）
    const interval = setInterval(() => {
      const mockData = apiService.generateMockData();
      addTrafficPoint(mockData.trafficData);
      setResources(mockData.resources);
    }, 2000);

    return () => {
      apiService.disconnect();
      clearInterval(interval);
    };
  }, [handleWebSocketMessage, setSystemStatus, setConnected, setAlerts, setProcesses, setConnections, addTrafficPoint, setResources, setLoading]);

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/network" element={<NetworkMonitor />} />
          <Route path="/process" element={<ProcessMonitor />} />
          <Route path="/threats" element={<ThreatDetection />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
