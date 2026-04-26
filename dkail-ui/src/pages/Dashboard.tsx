import { useStore } from '../store';
import { 
  Shield, 
  Network, 
  Activity, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import TrafficChart from '../components/charts/TrafficChart';
import AlertsList from '../components/alerts/AlertsList';
import ResourceGauge from '../components/charts/ResourceGauge';

export default function Dashboard() {
  const { systemStatus, alertCount, processCount, packetCount, byteCount, resources } = useStore();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const statusCards = [
    {
      title: '网络监控',
      icon: Network,
      active: systemStatus?.network_monitor_active ?? false,
      value: packetCount.toLocaleString(),
      label: '数据包',
      color: 'kali-green',
    },
    {
      title: '进程监控',
      icon: Activity,
      active: systemStatus?.process_monitor_active ?? false,
      value: processCount.toString(),
      label: '活动进程',
      color: 'kali-info',
    },
    {
      title: '威胁检测',
      icon: Shield,
      active: systemStatus?.threat_detection_active ?? false,
      value: alertCount.toString(),
      label: '检测威胁',
      color: 'kali-warning',
    },
    {
      title: '安全告警',
      icon: AlertTriangle,
      active: alertCount > 0,
      value: alertCount.toString(),
      label: '待处理',
      color: alertCount > 0 ? 'kali-danger' : 'kali-success',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kali-text">系统仪表盘</h1>
          <p className="text-kali-text-muted mt-1">实时监控系统安全状态</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-kali-text-muted">最后更新:</span>
          <span className="text-kali-text font-mono">
            {new Date().toLocaleTimeString('zh-CN')}
          </span>
        </div>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {statusCards.map((card) => (
          <div key={card.title} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg bg-${card.color}/20`}>
                <card.icon className={`w-5 h-5 text-${card.color}`} />
              </div>
              <div className="flex items-center gap-1">
                <span className={`status-dot ${card.active ? 'status-active' : 'status-inactive'}`} />
                <span className="text-xs text-kali-text-muted">
                  {card.active ? '运行中' : '已停止'}
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-kali-text">{card.value}</div>
            <div className="text-sm text-kali-text-muted">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 流量图表 */}
        <div className="col-span-2 card">
          <div className="card-header">
            <TrendingUp className="w-5 h-5 text-kali-green" />
            实时网络流量
          </div>
          <TrafficChart />
        </div>

        {/* 系统资源 */}
        <div className="card">
          <div className="card-header">
            <Activity className="w-5 h-5 text-kali-info" />
            系统资源
          </div>
          <div className="space-y-4">
            <ResourceGauge 
              label="CPU 使用率" 
              value={resources.cpu_usage} 
              color="#00FF00" 
            />
            <ResourceGauge 
              label="内存使用率" 
              value={resources.memory_usage} 
              color="#58A6FF" 
            />
            <ResourceGauge 
              label="磁盘使用率" 
              value={resources.disk_usage} 
              color="#D29922" 
            />
          </div>
        </div>
      </div>

      {/* 告警列表 */}
      <div className="card">
        <div className="card-header">
          <AlertTriangle className="w-5 h-5 text-kali-warning" />
          最近告警
        </div>
        <AlertsList maxItems={5} />
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-kali-green">{formatBytes(byteCount)}</div>
          <div className="text-sm text-kali-text-muted mt-1">总流量</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-kali-info">{formatBytes(resources.network_in)}</div>
          <div className="text-sm text-kali-text-muted mt-1">入站流量</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-kali-warning">{formatBytes(resources.network_out)}</div>
          <div className="text-sm text-kali-text-muted mt-1">出站流量</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-kali-danger">{alertCount}</div>
          <div className="text-sm text-kali-text-muted mt-1">安全事件</div>
        </div>
      </div>
    </div>
  );
}
