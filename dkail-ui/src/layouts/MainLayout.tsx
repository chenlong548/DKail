import { ReactNode } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import StatusBar from '../components/layout/StatusBar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-kali-dark">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <Header />
        
        {/* 内容区域 */}
        <main className="flex-1 overflow-auto p-6 bg-kali-dark">
          {children}
        </main>
        
        {/* 底部状态栏 */}
        <StatusBar />
      </div>
    </div>
  );
}
