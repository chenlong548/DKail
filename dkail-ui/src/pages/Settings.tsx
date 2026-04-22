import { useState } from 'react';
import { useStore } from '../store';
import { 
  Monitor, 
  Bell, 
  Palette,
  Save,
  RefreshCw
} from 'lucide-react';
import type { Settings as SettingsType } from '../types';

type SettingsTab = 'monitoring' | 'alerts' | 'appearance';

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('monitoring');
  const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const tabs = [
    { id: 'monitoring', label: '监控设置', icon: Monitor },
    { id: 'alerts', label: '告警设置', icon: Bell },
    { id: 'appearance', label: '外观设置', icon: Palette },
  ];

  const handleSettingChange = <K extends keyof SettingsType>(
    category: K,
    key: keyof SettingsType[K],
    value: SettingsType[K][keyof SettingsType[K]]
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSettings(localSettings);
    setHasChanges(false);
    // 这里可以添加保存到本地存储的逻辑
    localStorage.setItem('dkail-settings', JSON.stringify(localSettings));
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kali-text">系统设置</h1>
          <p className="text-kali-text-muted mt-1">配置监控系统参数</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
            <button 
              onClick={handleSave}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存更改
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* 设置导航 */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 设置内容 */}
        <div className="flex-1 card">
          {/* 监控设置 */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="card-header">
                <Monitor className="w-5 h-5 text-kali-green" />
                监控设置
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-kali-dark/50 rounded-lg">
                  <div>
                    <div className="font-medium text-kali-text">网络监控</div>
                    <div className="text-sm text-kali-text-muted">
                      启用实时网络流量监控
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.monitoring.network_enabled}
                      onChange={(e) => handleSettingChange('monitoring', 'network_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-kali-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kali-green"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-kali-dark/50 rounded-lg">
                  <div>
                    <div className="font-medium text-kali-text">进程监控</div>
                    <div className="text-sm text-kali-text-muted">
                      启用系统进程监控
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.monitoring.process_enabled}
                      onChange={(e) => handleSettingChange('monitoring', 'process_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-kali-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kali-green"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-kali-dark/50 rounded-lg">
                  <div>
                    <div className="font-medium text-kali-text">威胁检测</div>
                    <div className="text-sm text-kali-text-muted">
                      启用实时威胁检测
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.monitoring.threat_detection_enabled}
                      onChange={(e) => handleSettingChange('monitoring', 'threat_detection_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-kali-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kali-green"></div>
                  </label>
                </div>

                <div className="p-4 bg-kali-dark/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-kali-text">扫描间隔</div>
                      <div className="text-sm text-kali-text-muted">
                        系统扫描的时间间隔（毫秒）
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={localSettings.monitoring.scan_interval}
                    onChange={(e) => handleSettingChange('monitoring', 'scan_interval', parseInt(e.target.value))}
                    className="input w-full"
                    min="1000"
                    max="60000"
                    step="1000"
                  />
                  <div className="flex justify-between text-xs text-kali-text-muted mt-1">
                    <span>最小: 1000ms</span>
                    <span>最大: 60000ms</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 告警设置 */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="card-header">
                <Bell className="w-5 h-5 text-kali-warning" />
                告警设置
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-kali-dark/50 rounded-lg">
                  <div>
                    <div className="font-medium text-kali-text">邮件通知</div>
                    <div className="text-sm text-kali-text-muted">
                      发送告警邮件通知
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.alerts.email_enabled}
                      onChange={(e) => handleSettingChange('alerts', 'email_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-kali-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kali-green"></div>
                  </label>
                </div>

                {localSettings.alerts.email_enabled && (
                  <div className="p-4 bg-kali-dark/50 rounded-lg">
                    <label className="block text-sm font-medium text-kali-text mb-2">
                      邮件地址
                    </label>
                    <input
                      type="email"
                      value={localSettings.alerts.email_address}
                      onChange={(e) => handleSettingChange('alerts', 'email_address', e.target.value)}
                      className="input w-full"
                      placeholder="your@email.com"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-kali-dark/50 rounded-lg">
                  <div>
                    <div className="font-medium text-kali-text">声音提醒</div>
                    <div className="text-sm text-kali-text-muted">
                      告警时播放提示音
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.alerts.sound_enabled}
                      onChange={(e) => handleSettingChange('alerts', 'sound_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-kali-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kali-green"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-kali-dark/50 rounded-lg">
                  <div>
                    <div className="font-medium text-kali-text">桌面通知</div>
                    <div className="text-sm text-kali-text-muted">
                      显示系统桌面通知
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.alerts.desktop_notification}
                      onChange={(e) => handleSettingChange('alerts', 'desktop_notification', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-kali-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kali-green"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 外观设置 */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="card-header">
                <Palette className="w-5 h-5 text-kali-info" />
                外观设置
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-kali-dark/50 rounded-lg">
                  <label className="block text-sm font-medium text-kali-text mb-3">
                    主题
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleSettingChange('appearance', 'theme', 'dark')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        localSettings.appearance.theme === 'dark'
                          ? 'border-kali-green bg-kali-green/10'
                          : 'border-kali-border hover:border-kali-text-muted'
                      }`}
                    >
                      <div className="w-full h-20 bg-kali-dark rounded mb-2" />
                      <div className="text-sm text-kali-text">深色主题</div>
                    </button>
                    <button
                      onClick={() => handleSettingChange('appearance', 'theme', 'light')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        localSettings.appearance.theme === 'light'
                          ? 'border-kali-green bg-kali-green/10'
                          : 'border-kali-border hover:border-kali-text-muted'
                      }`}
                    >
                      <div className="w-full h-20 bg-white rounded mb-2" />
                      <div className="text-sm text-kali-text">浅色主题</div>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-kali-dark/50 rounded-lg">
                  <label className="block text-sm font-medium text-kali-text mb-3">
                    强调色
                  </label>
                  <div className="flex gap-3">
                    {['#00FF00', '#58A6FF', '#D29922', '#F85149', '#A371F7'].map((color) => (
                      <button
                        key={color}
                        onClick={() => handleSettingChange('appearance', 'accent_color', color)}
                        className={`w-10 h-10 rounded-full transition-all ${
                          localSettings.appearance.accent_color === color
                            ? 'ring-2 ring-offset-2 ring-offset-kali-bg ring-white'
                            : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-kali-dark/50 rounded-lg">
                  <label className="block text-sm font-medium text-kali-text mb-3">
                    字体大小
                  </label>
                  <div className="flex gap-4">
                    {[
                      { value: 'small', label: '小' },
                      { value: 'medium', label: '中' },
                      { value: 'large', label: '大' },
                    ].map((size) => (
                      <button
                        key={size.value}
                        onClick={() => handleSettingChange('appearance', 'font_size', size.value as 'small' | 'medium' | 'large')}
                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                          localSettings.appearance.font_size === size.value
                            ? 'border-kali-green bg-kali-green/10'
                            : 'border-kali-border hover:border-kali-text-muted'
                        }`}
                      >
                        <span className="text-kali-text">{size.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
