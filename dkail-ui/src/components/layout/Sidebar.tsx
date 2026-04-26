import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Network, 
  Activity, 
  Shield, 
  Settings,
  Terminal
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'network', label: '网络监控', icon: Network, path: '/network' },
  { id: 'process', label: '进程监控', icon: Activity, path: '/process' },
  { id: 'threats', label: '威胁检测', icon: Shield, path: '/threats' },
  { id: 'settings', label: '系统设置', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-kali-bg border-r border-kali-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-kali-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-kali-green/20 flex items-center justify-center">
            <Terminal className="w-6 h-6 text-kali-green" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-kali-text glow-text">DKail</h1>
            <p className="text-xs text-kali-text-muted">Security Monitor</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-kali-border">
        <div className="text-xs text-kali-text-muted space-y-1">
          <p>Version: 1.0.0</p>
          <p>Build: 2026.04</p>
        </div>
      </div>
    </aside>
  );
}
