import { useStore } from '../../store';
import { AlertTriangle, Shield, Activity, Network, Clock } from 'lucide-react';
import type { Alert, Severity, AlertType } from '../../types';

interface AlertsListProps {
  maxItems?: number;
}

const severityConfig: Record<Severity, { color: string; label: string }> = {
  Low: { color: 'kali-info', label: '低' },
  Medium: { color: 'kali-warning', label: '中' },
  High: { color: 'kali-danger', label: '高' },
  Critical: { color: 'kali-danger', label: '严重' },
};

const alertTypeConfig: Record<AlertType, { icon: typeof AlertTriangle; label: string }> = {
  NetworkAnomaly: { icon: Network, label: '网络异常' },
  ProcessAnomaly: { icon: Activity, label: '进程异常' },
  MalwareDetected: { icon: Shield, label: '恶意软件' },
  SuspiciousActivity: { icon: AlertTriangle, label: '可疑活动' },
  SystemAnomaly: { icon: Activity, label: '系统异常' },
};

export default function AlertsList({ maxItems = 10 }: AlertsListProps) {
  const { alerts } = useStore();
  const displayAlerts = alerts.slice(0, maxItems);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (displayAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-kali-text-muted">
        <Shield className="w-12 h-12 mb-3 opacity-50" />
        <p>暂无告警</p>
        <p className="text-sm">系统运行正常</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayAlerts.map((alert: Alert) => {
        const config = severityConfig[alert.severity];
        const typeConfig = alertTypeConfig[alert.alert_type];
        const Icon = typeConfig.icon;

        return (
          <div 
            key={alert.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-kali-dark/50 hover:bg-kali-dark transition-colors"
          >
            <div className={`p-2 rounded-lg bg-${config.color}/20`}>
              <Icon className={`w-4 h-4 text-${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-kali-text truncate">
                  {alert.description}
                </span>
                <span className={`badge badge-${config.color === 'kali-danger' ? 'danger' : config.color === 'kali-warning' ? 'warning' : 'info'}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-kali-text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(alert.timestamp)}
                </span>
                <span>来源: {alert.source}</span>
                <span>{typeConfig.label}</span>
              </div>
            </div>
            <button className="btn btn-secondary text-xs">
              详情
            </button>
          </div>
        );
      })}
    </div>
  );
}
