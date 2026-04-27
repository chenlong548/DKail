import { useEffect } from 'react';
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
    setPacketCount,
    setByteCount,
    addTrafficPoint,
    setResources,
    setLoading
  } = useStore();

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
        setPacketCount(network.packet_count);
        setByteCount(network.byte_count);
      } catch (error) {
        console.warn('Backend API not available, setting data to 0');
        // 后端未连接时，设置所有数据为0
        setSystemStatus({
          network_monitor_active: false,
          process_monitor_active: false,
          threat_detection_active: false,
          alert_count: 0,
          uptime: 0
        });
        setResources({
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          network_in: 0,
          network_out: 0
        });
        setProcesses([]);
        setConnections([]);
        setPacketCount(0);
        setByteCount(0);
        // 添加流量数据点为0
        const trafficPoint = {
          time: new Date().toLocaleTimeString('zh-CN'),
          inbound: 0,
          outbound: 0
        };
        addTrafficPoint(trafficPoint);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 定时更新资源数据（从后端获取）
    const interval = setInterval(async () => {
      try {
        const resources = await apiService.getResources();
        setResources(resources);
        if (!useStore.getState().isConnected) {
          setConnected(true);
        }
        
        // 定时获取进程数据
        const processes = await apiService.getProcesses();
        setProcesses(processes.processes);
        
        // 定时获取网络数据
        const network = await apiService.getNetwork();
        setConnections(network.connections);
        setPacketCount(network.packet_count);
        setByteCount(network.byte_count);
        
        // 添加流量数据点
        const trafficPoint = {
          time: new Date().toLocaleTimeString('zh-CN'),
          inbound: resources.network_in,
          outbound: resources.network_out
        };
        addTrafficPoint(trafficPoint);
      } catch (error) {
        console.warn('Failed to fetch resources:', error);
        if (useStore.getState().isConnected) {
          setConnected(false);
        }
        // 后端未连接时，设置所有数据为0
        setResources({
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          network_in: 0,
          network_out: 0
        });
        setProcesses([]);
        setConnections([]);
        setPacketCount(0);
        setByteCount(0);
        // 添加流量数据点为0
        const trafficPoint = {
          time: new Date().toLocaleTimeString('zh-CN'),
          inbound: 0,
          outbound: 0
        };
        addTrafficPoint(trafficPoint);
      }
    }, 1000);

    // 定时检查API连接状态
    const statusInterval = setInterval(async () => {
      try {
        await apiService.checkHealth();
        if (!useStore.getState().isConnected) {
          setConnected(true);
        }
      } catch (error) {
        if (useStore.getState().isConnected) {
          setConnected(false);
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [setSystemStatus, setConnected, setAlerts, setProcesses, setConnections, setPacketCount, setByteCount, addTrafficPoint, setResources, setLoading]);

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
