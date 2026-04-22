import { useState } from 'react';
import { useStore } from '../store';
import { 
  Shield, 
  AlertTriangle, 
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Alert, Severity, AlertType } from '../types';

const severityConfig: Record<Severity, { color: string; label: string; bgColor: string }> = {
  Low: { color: '#58A6FF', label: '低', bgColor: 'bg-kali-info/20' },
  Medium: { color: '#D29922', label: '中', bgColor: 'bg-kali-warning/20' },
  High: { color: '#F85149', label: '高', bgColor: 'bg-kali-danger/20' },
  Critical: { color: '#FF0000', label: '严重', bgColor: 'bg-kali-danger/30' },
};

const alertTypeConfig: Record<AlertType, { label: string }> = {
  NetworkAnomaly: { label: '网络异常' },
  ProcessAnomaly: { label: '进程异常' },
  MalwareDetected: { label: '恶意软件' },
  SuspiciousActivity: { label: '可疑活动' },
  SystemAnomaly: { label: '系统异常' },
};

export default function ThreatDetection() {
  const { alerts, alertCount, clearAlerts } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const filteredAlerts = alerts.filter((alert: Alert) => {
    const matchesSearch = 
      alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  // 统计数据
  const severityStats = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<Severity, number>);

  const typeStats = alerts.reduce((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    return acc;
  }, {} as Record<AlertType, number>);

  const pieData = Object.entries(severityStats).map(([severity, count]) => ({
    name: severityConfig[severity as Severity].label,
    value: count,
    color: severityConfig[severity as Severity].color,
  }));

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kali-text">威胁检测</h1>
          <p className="text-kali-text-muted mt-1">查看和管理安全威胁告警</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={clearAlerts}
            className="btn btn-danger flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            清除所有告警
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">总告警数</div>
              <div className="text-2xl font-bold text-kali-text mt-1">{alertCount}</div>
            </div>
            <Shield className="w-8 h-8 text-kali-warning opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">严重威胁</div>
              <div className="text-2xl font-bold text-kali-danger mt-1">
                {severityStats['Critical'] || 0}
              </div>
            </div>
            <AlertTriangle className="w-8 h-8 text-kali-danger opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">高危威胁</div>
              <div className="text-2xl font-bold text-kali-warning mt-1">
                {severityStats['High'] || 0}
              </div>
            </div>
            <AlertTriangle className="w-8 h-8 text-kali-warning opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">待处理</div>
              <div className="text-2xl font-bold text-kali-info mt-1">{alerts.length}</div>
            </div>
            <Clock className="w-8 h-8 text-kali-info opacity-50" />
          </div>
        </div>
      </div>

      {/* 图表和告警列表 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 威胁分布图 */}
        <div className="card">
          <div className="card-header">
            <Shield className="w-5 h-5 text-kali-warning" />
            威胁分布
          </div>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#161B22', 
                      border: '1px solid #30363D',
                      borderRadius: '8px',
                      color: '#E6EDF3'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-kali-text-muted">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* 告警类型统计 */}
        <div className="col-span-2 card">
          <div className="card-header">
            <AlertTriangle className="w-5 h-5 text-kali-danger" />
            告警类型统计
          </div>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(typeStats).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-kali-dark/50 rounded-lg">
                <div className="text-2xl font-bold text-kali-text">{count}</div>
                <div className="text-xs text-kali-text-muted mt-1">
                  {alertTypeConfig[type as AlertType]?.label || type}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 告警列表 */}
      <div className="card">
        <div className="card-header">
          <AlertTriangle className="w-5 h-5 text-kali-warning" />
          告警列表
          <div className="flex-1" />
          {/* 搜索和过滤 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-kali-text-muted" />
              <input
                type="text"
                placeholder="搜索告警..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 w-64"
              />
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input"
            >
              <option value="all">所有级别</option>
              <option value="Critical">严重</option>
              <option value="High">高</option>
              <option value="Medium">中</option>
              <option value="Low">低</option>
            </select>
          </div>
        </div>

        {/* 告警表格 */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>时间</th>
                <th>类型</th>
                <th>严重程度</th>
                <th>来源</th>
                <th>描述</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-kali-text-muted py-8">
                    <div className="flex flex-col items-center">
                      <Shield className="w-12 h-12 mb-3 opacity-50" />
                      <p>暂无告警</p>
                      <p className="text-sm">系统运行正常</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert: Alert) => {
                  const config = severityConfig[alert.severity];
                  return (
                    <tr 
                      key={alert.id}
                      className={`cursor-pointer ${config.bgColor}`}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <td className="font-mono">#{alert.id}</td>
                      <td className="text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-kali-text-muted" />
                          {formatTime(alert.timestamp)}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {alertTypeConfig[alert.alert_type]?.label || alert.alert_type}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="badge"
                          style={{ 
                            backgroundColor: `${config.color}20`,
                            color: config.color 
                          }}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="text-sm">{alert.source}</td>
                      <td className="max-w-xs truncate">{alert.description}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button 
                            className="btn btn-secondary text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlert(alert);
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button className="btn btn-success text-xs">
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button className="btn btn-danger text-xs">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 告警详情弹窗 */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-kali-bg border border-kali-border rounded-lg w-[600px] max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-kali-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-kali-text">告警详情</h3>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1 hover:bg-kali-border rounded"
              >
                <XCircle className="w-5 h-5 text-kali-text-muted" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-kali-text-muted">告警ID</label>
                  <div className="text-kali-text font-mono">#{selectedAlert.id}</div>
                </div>
                <div>
                  <label className="text-sm text-kali-text-muted">时间</label>
                  <div className="text-kali-text">{formatTime(selectedAlert.timestamp)}</div>
                </div>
                <div>
                  <label className="text-sm text-kali-text-muted">类型</label>
                  <div>
                    <span className="badge badge-info">
                      {alertTypeConfig[selectedAlert.alert_type]?.label}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-kali-text-muted">严重程度</label>
                  <div>
                    <span 
                      className="badge"
                      style={{ 
                        backgroundColor: `${severityConfig[selectedAlert.severity].color}20`,
                        color: severityConfig[selectedAlert.severity].color 
                      }}
                    >
                      {severityConfig[selectedAlert.severity].label}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-kali-text-muted">来源</label>
                  <div className="text-kali-text">{selectedAlert.source}</div>
                </div>
              </div>
              <div>
                <label className="text-sm text-kali-text-muted">描述</label>
                <div className="text-kali-text mt-1">{selectedAlert.description}</div>
              </div>
              <div>
                <label className="text-sm text-kali-text-muted">详细信息</label>
                <div className="bg-kali-dark p-3 rounded mt-1 font-mono text-sm overflow-auto">
                  <pre className="text-kali-text-muted">
                    {JSON.stringify(selectedAlert.details, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-kali-border">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSelectedAlert(null)}
                >
                  关闭
                </button>
                <button className="btn btn-success">
                  标记已处理
                </button>
                <button className="btn btn-danger">
                  忽略
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
