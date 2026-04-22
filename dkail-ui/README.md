# DKail Security Monitor UI

基于 Tauri 2.0 + React 18 + TypeScript 的桌面安全监控应用。

## 技术栈

- **桌面框架**: Tauri 2.0
- **前端框架**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **图表**: Recharts
- **状态管理**: Zustand
- **路由**: React Router DOM

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行 Tauri 应用
npm run tauri dev
```

## 项目结构

```
dkail-ui/
├── src/
│   ├── components/        # 可复用组件
│   │   ├── alerts/        # 告警相关组件
│   │   ├── charts/        # 图表组件
│   │   └── layout/        # 布局组件
│   ├── layouts/           # 页面布局
│   ├── pages/             # 页面组件
│   ├── services/          # API 服务
│   ├── store/             # 状态管理
│   ├── types/             # TypeScript 类型定义
│   ├── App.tsx            # 应用入口
│   ├── main.tsx           # React 入口
│   └── index.css          # 全局样式
├── src-tauri/             # Tauri 后端
│   ├── src/
│   │   ├── main.rs        # 主入口
│   │   └── lib.rs         # 库文件
│   ├── Cargo.toml         # Rust 配置
│   └── tauri.conf.json    # Tauri 配置
├── public/                # 静态资源
├── index.html             # HTML 模板
├── package.json           # 项目配置
├── tailwind.config.js     # Tailwind 配置
├── tsconfig.json          # TypeScript 配置
└── vite.config.ts         # Vite 配置
```

## 功能模块

1. **仪表盘**: 系统概览、实时流量图表、最近告警、系统资源使用
2. **网络监控**: 实时流量图表、连接列表、数据包捕获
3. **进程监控**: 进程列表、进程详情、可疑进程标记
4. **威胁检测**: 威胁列表、威胁统计、告警详情
5. **系统设置**: 监控设置、告警设置、外观设置

## 配色方案

Kali Linux 风格深色主题:
- 主背景: #0D1117
- 次背景: #161B22
- 主文字: #E6EDF3
- 强调色: #00FF00 (Kali绿)
- 成功: #3FB950
- 警告: #D29922
- 危险: #F85149
