import { useStore } from '../../store';
import { Cpu, HardDrive, MemoryStick, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function StatusBar() {
  const { resources, packetCount, byteCount, processCount } = useStore();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <footer className="h-8 bg-kali-bg border-t border-kali-border flex items-center justify-between px-6 text-xs">
      {/* 左侧系统资源 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-kali-green" />
          <span className="text-kali-text-muted">CPU:</span>
          <span className="text-kali-text font-mono">{resources.cpu_usage}%</span>
        </div>
        <div className="flex items-center gap-2">
          <MemoryStick className="w-3.5 h-3.5 text-kali-info" />
          <span className="text-kali-text-muted">内存:</span>
          <span className="text-kali-text font-mono">{resources.memory_usage}%</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-kali-warning" />
          <span className="text-kali-text-muted">磁盘:</span>
          <span className="text-kali-text font-mono">{resources.disk_usage}%</span>
        </div>
      </div>

      {/* 中间网络统计 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <ArrowDownCircle className="w-3.5 h-3.5 text-kali-success" />
          <span className="text-kali-text-muted">入站:</span>
          <span className="text-kali-text font-mono">{formatBytes(resources.network_in)}</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpCircle className="w-3.5 h-3.5 text-kali-info" />
          <span className="text-kali-text-muted">出站:</span>
          <span className="text-kali-text font-mono">{formatBytes(resources.network_out)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-kali-text-muted">数据包:</span>
          <span className="text-kali-text font-mono">{packetCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-kali-text-muted">流量:</span>
          <span className="text-kali-text font-mono">{formatBytes(byteCount)}</span>
        </div>
      </div>

      {/* 右侧进程统计 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-kali-text-muted">进程:</span>
          <span className="text-kali-text font-mono">{processCount}</span>
        </div>
        <div className="text-kali-text-muted">
          DKail Security v1.0.0
        </div>
      </div>
    </footer>
  );
}
