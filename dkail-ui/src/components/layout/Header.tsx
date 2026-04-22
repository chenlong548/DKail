import { useStore } from '../../store';
import { Bell, RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function Header() {
  const { isConnected, alertCount, systemStatus } = useStore();

  return (
    <header className="h-14 bg-kali-bg border-b border-kali-border flex items-center justify-between px-6">
      {/* 左侧标题 */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-kali-text">
          DKail Security Monitor
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-kali-text-muted">状态:</span>
          {isConnected ? (
            <span className="flex items-center gap-1 text-kali-success">
              <Wifi className="w-4 h-4" />
              已连接
            </span>
          ) : (
            <span className="flex items-center gap-1 text-kali-danger">
              <WifiOff className="w-4 h-4" />
              未连接
            </span>
          )}
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-4">
        {/* 监控状态指示器 */}
        <div className="flex items-center gap-3 text-sm">
          {systemStatus?.network_monitor_active && (
            <span className="flex items-center gap-1">
              <span className="status-dot status-active" />
              <span className="text-kali-text-muted">网络</span>
            </span>
          )}
          {systemStatus?.process_monitor_active && (
            <span className="flex items-center gap-1">
              <span className="status-dot status-active" />
              <span className="text-kali-text-muted">进程</span>
            </span>
          )}
          {systemStatus?.threat_detection_active && (
            <span className="flex items-center gap-1">
              <span className="status-dot status-active" />
              <span className="text-kali-text-muted">威胁</span>
            </span>
          )}
        </div>

        {/* 告警按钮 */}
        <button className="relative p-2 rounded-lg hover:bg-kali-border transition-colors">
          <Bell className="w-5 h-5 text-kali-text-muted" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-kali-danger text-white text-xs rounded-full flex items-center justify-center">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </button>

        {/* 刷新按钮 */}
        <button className="p-2 rounded-lg hover:bg-kali-border transition-colors">
          <RefreshCw className="w-5 h-5 text-kali-text-muted" />
        </button>

        {/* 时间显示 */}
        <div className="text-sm text-kali-text-muted font-mono">
          {new Date().toLocaleString('zh-CN')}
        </div>
      </div>
    </header>
  );
}
