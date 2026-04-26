import { useState } from 'react';
import { useStore } from '../store';
import { 
  Network, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Pause,
  Play
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { NetworkConnection } from '../types';

export default function NetworkMonitor() {
  const { connections, trafficData, packetCount, byteCount } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [isMonitoring, setIsMonitoring] = useState(true);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredConnections = connections.filter((conn: NetworkConnection) => {
    const matchesSearch = 
      conn.local_addr.includes(searchTerm) ||
      conn.remote_addr.includes(searchTerm);
    const matchesProtocol = protocolFilter === 'all' || conn.protocol === protocolFilter;
    return matchesSearch && matchesProtocol;
  });

  const protocolStats = connections.reduce((acc, conn) => {
    acc[conn.protocol] = (acc[conn.protocol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kali-text">网络监控</h1>
          <p className="text-kali-text-muted mt-1">实时监控网络连接和流量</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`btn ${isMonitoring ? 'btn-danger' : 'btn-primary'} flex items-center gap-2`}
          >
            {isMonitoring ? (
              <>
                <Pause className="w-4 h-4" />
                暂停监控
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                开始监控
              </>
            )}
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">活跃连接</div>
              <div className="text-2xl font-bold text-kali-text mt-1">
                {connections.length}
              </div>
            </div>
            <Network className="w-8 h-8 text-kali-green opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">数据包</div>
              <div className="text-2xl font-bold text-kali-text mt-1">
                {packetCount.toLocaleString()}
              </div>
            </div>
            <ArrowUpRight className="w-8 h-8 text-kali-info opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">总流量</div>
              <div className="text-2xl font-bold text-kali-text mt-1">
                {formatBytes(byteCount)}
              </div>
            </div>
            <ArrowDownRight className="w-8 h-8 text-kali-warning opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">TCP连接</div>
              <div className="text-2xl font-bold text-kali-text mt-1">
                {connections.filter(c => c.protocol === 'TCP').length}
              </div>
            </div>
            <Network className="w-8 h-8 text-kali-info opacity-50" />
          </div>
        </div>
      </div>

      {/* 流量图表 */}
      <div className="card">
        <div className="card-header">
          <Network className="w-5 h-5 text-kali-green" />
          实时流量
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#58A6FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#58A6FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="time" stroke="#8B949E" tick={{ fill: '#8B949E', fontSize: 12 }} />
              <YAxis stroke="#8B949E" tick={{ fill: '#8B949E', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#161B22', 
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                  color: '#E6EDF3'
                }}
              />
              <Area type="monotone" dataKey="inbound" stroke="#00FF00" fillOpacity={1} fill="url(#colorInbound)" />
              <Area type="monotone" dataKey="outbound" stroke="#58A6FF" fillOpacity={1} fill="url(#colorOutbound)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 连接列表 */}
      <div className="card">
        <div className="card-header">
          <Network className="w-5 h-5 text-kali-info" />
          网络连接
          <div className="flex-1" />
          {/* 搜索和过滤 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-kali-text-muted" />
              <input
                type="text"
                placeholder="搜索IP或进程..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 w-64"
              />
            </div>
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              className="input"
            >
              <option value="all">所有协议</option>
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP</option>
            </select>
          </div>
        </div>

        {/* 协议统计 */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          {Object.entries(protocolStats).map(([protocol, count]) => (
            <div key={protocol} className="flex items-center gap-2">
              <span className="badge badge-info">{protocol}</span>
              <span className="text-kali-text-muted">{count} 个连接</span>
            </div>
          ))}
        </div>

        {/* 连接表格 */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>协议</th>
                <th>源地址</th>
                <th>目标地址</th>
                <th>状态</th>
                <th>数据包</th>
                <th>流量</th>
                <th>进程</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-kali-text-muted py-8">
                    暂无网络连接数据
                  </td>
                </tr>
              ) : (
                filteredConnections.map((conn: NetworkConnection, index: number) => (
                  <tr key={index}>
                    <td>
                      <span className={`badge ${conn.protocol === 'TCP' ? 'badge-info' : conn.protocol === 'UDP' ? 'badge-success' : 'badge-warning'}`}>
                        {conn.protocol}
                      </span>
                    </td>
                    <td className="font-mono text-sm">
                      {conn.local_addr}
                    </td>
                    <td className="font-mono text-sm">
                      {conn.remote_addr}
                    </td>
                    <td>
                      <span className={`badge ${conn.state === 'ESTABLISHED' ? 'badge-success' : 'badge-warning'}`}>
                        {conn.state}
                      </span>
                    </td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>
                      <button className="btn btn-secondary text-xs">详情</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
