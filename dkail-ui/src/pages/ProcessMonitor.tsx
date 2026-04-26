import { useState } from 'react';
import { useStore } from '../store';
import { 
  Activity, 
  Search, 
  RefreshCw,
  Cpu,
  MemoryStick,
  AlertTriangle,
  X
} from 'lucide-react';
import type { ProcessInfo } from '../types';

export default function ProcessMonitor() {
  const { processes, selectedProcess, setSelectedProcess, processCount, fetchProcesses } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'cpu' | 'memory' | 'pid'>('cpu');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDetails, setShowDetails] = useState(false);

  const filteredProcesses = processes
    .filter((proc: ProcessInfo) => 
      proc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proc.pid.toString().includes(searchTerm)
    )
    .sort((a: ProcessInfo, b: ProcessInfo) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'cpu':
          comparison = a.cpu_usage - b.cpu_usage;
          break;
        case 'memory':
          comparison = a.memory_usage - b.memory_usage;
          break;
        case 'pid':
          comparison = a.pid - b.pid;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const suspiciousCount = 0;
  const totalCpu = processes.reduce((sum, p) => sum + p.cpu_usage, 0);
  const totalMemory = processes.reduce((sum, p) => sum + p.memory_usage, 0);

  const handleProcessClick = (process: ProcessInfo) => {
    setSelectedProcess(process);
    setShowDetails(true);
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kali-text">进程监控</h1>
          <p className="text-kali-text-muted mt-1">监控系统进程和资源使用</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="btn btn-secondary flex items-center gap-2"
            onClick={fetchProcesses}
          >
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
              <div className="text-sm text-kali-text-muted">活动进程</div>
              <div className="text-2xl font-bold text-kali-text mt-1">{processCount}</div>
            </div>
            <Activity className="w-8 h-8 text-kali-info opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">CPU 总使用</div>
              <div className="text-2xl font-bold text-kali-green mt-1">{totalCpu.toFixed(1)}%</div>
            </div>
            <Cpu className="w-8 h-8 text-kali-green opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">内存总使用</div>
              <div className="text-2xl font-bold text-kali-info mt-1">{formatMemory(totalMemory)}</div>
            </div>
            <MemoryStick className="w-8 h-8 text-kali-info opacity-50" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-kali-text-muted">可疑进程</div>
              <div className="text-2xl font-bold text-kali-danger mt-1">{suspiciousCount}</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-kali-danger opacity-50" />
          </div>
        </div>
      </div>

      {/* 进程列表 */}
      <div className="card">
        <div className="card-header">
          <Activity className="w-5 h-5 text-kali-info" />
          进程列表
          <div className="flex-1" />
          {/* 搜索 */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-kali-text-muted" />
            <input
              type="text"
              placeholder="搜索进程名或PID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 w-64"
            />
          </div>
        </div>

        {/* 进程表格 */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th 
                  className="cursor-pointer hover:text-kali-text"
                  onClick={() => {
                    if (sortBy === 'pid') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    setSortBy('pid');
                  }}
                >
                  PID {sortBy === 'pid' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:text-kali-text"
                  onClick={() => {
                    if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    setSortBy('name');
                  }}
                >
                  进程名 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:text-kali-text"
                  onClick={() => {
                    if (sortBy === 'cpu') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    setSortBy('cpu');
                  }}
                >
                  CPU {sortBy === 'cpu' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:text-kali-text"
                  onClick={() => {
                    if (sortBy === 'memory') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    setSortBy('memory');
                  }}
                >
                  内存 {sortBy === 'memory' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>状态</th>
                <th>路径</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-kali-text-muted py-8">
                    暂无进程数据
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc: ProcessInfo) => (
                  <tr 
                    key={proc.pid}
                    className={`cursor-pointer ${selectedProcess?.pid === proc.pid ? 'bg-kali-info/10' : ''}`}
                    onClick={() => handleProcessClick(proc)}
                  >
                    <td className="font-mono">{proc.pid}</td>
                    <td className="flex items-center gap-2">
                      {proc.name}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-kali-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-kali-green rounded-full"
                            style={{ width: `${Math.min(proc.cpu_usage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">{proc.cpu_usage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-kali-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-kali-info rounded-full"
                            style={{ width: `${Math.min(proc.memory_usage / 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">{formatMemory(proc.memory_usage)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">running</span>
                    </td>
                    <td className="max-w-xs truncate text-kali-text-muted text-sm">
                      {proc.path}
                    </td>
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

      {/* 进程详情弹窗 */}
      {showDetails && selectedProcess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-kali-bg border border-kali-border rounded-lg w-[600px] max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-kali-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-kali-text">进程详情</h3>
              <button 
                onClick={() => setShowDetails(false)}
                className="p-1 hover:bg-kali-border rounded"
              >
                <X className="w-5 h-5 text-kali-text-muted" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-kali-text-muted">进程名</label>
                  <div className="text-kali-text font-medium">{selectedProcess.name}</div>
                </div>
                <div>
                  <label className="text-sm text-kali-text-muted">PID</label>
                  <div className="text-kali-text font-mono">{selectedProcess.pid}</div>
                </div>
                <div>
                  <label className="text-sm text-kali-text-muted">CPU 使用率</label>
                  <div className="text-kali-green font-mono">{selectedProcess.cpu_usage.toFixed(1)}%</div>
                </div>
                <div>
                  <label className="text-sm text-kali-text-muted">内存使用</label>
                  <div className="text-kali-info font-mono">{formatMemory(selectedProcess.memory_usage)}</div>
                </div>
              </div>
              <div>
                <label className="text-sm text-kali-text-muted">完整路径</label>
                <div className="text-kali-text font-mono text-sm bg-kali-dark p-2 rounded mt-1 break-all">
                  {selectedProcess.path}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-kali-border">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDetails(false)}
                >
                  关闭
                </button>
                <button className="btn btn-danger">
                  终止进程
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
