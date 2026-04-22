# DKail 安全监控系统

一个基于 Rust 和 Tauri 构建的轻量级本地网络安全监控系统。

## 功能特性

- **实时网络流量监控**：捕获和分析网络数据包，识别可疑连接
- **进程行为监控**：监控系统进程活动，检测可疑进程
- **威胁检测**：基于签名的威胁检测系统
- **桌面应用**：采用 Kali Linux 风格暗色主题的现代桌面界面

## 技术栈

### 后端
- **Rust** - 高性能、内存安全的系统编程语言
- **Actix-web** - 强大的 HTTP 框架，用于构建 REST API
- **Tokio** - 异步运行时，支持并发操作
- **Npcap/WinPcap** - 网络数据包捕获库
- **Windows API** - 进程监控和系统信息获取

### 前端
- **Tauri 2.0** - 跨平台桌面应用框架
- **React 18** - 现代 UI 库
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Zustand** - 轻量级状态管理
- **Recharts** - 数据可视化图表库

## 环境要求

### 必需软件
1. **Rust**（后端需要 1.95.0+ GNU 版本，Tauri UI 需要 nightly 版本）
2. **Node.js**（18+）和 npm
3. **Npcap** - 网络数据包捕获驱动
4. **Visual Studio Build Tools**（用于 MSVC 工具链）
5. **MinGW-w64**（用于 GNU 工具链）

### Npcap 安装
从 https://npcap.com/ 下载并安装，安装时需要：
- 启用 "WinPcap API-compatible Mode"
- 启用 "Support raw 802.11 traffic"

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/dkail.git
cd dkail
```

### 2. 构建后端服务

```powershell
# 设置 GNU 工具链（Npcap 库需要）
rustup default stable-x86_64-pc-windows-gnu

# 构建
cargo build

# 运行
cargo run
```

后端服务将在 `http://127.0.0.1:8080` 启动

### 3. 构建桌面应用

```powershell
# 进入 UI 目录
cd dkail-ui

# 设置 MSVC nightly 工具链（Tauri 需要）
rustup override set nightly-x86_64-pc-windows-msvc

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 或构建生产版本
npm run tauri build
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/status` | GET | 系统状态 |
| `/processes` | GET | 进程列表 |
| `/network` | GET | 网络连接 |
| `/alerts` | GET | 安全告警 |

## 项目结构

```
dkail/
├── src/                    # Rust 后端源码
│   ├── main.rs            # 应用入口
│   ├── lib.rs             # 库导出
│   ├── network/           # 网络监控模块
│   ├── process/           # 进程监控模块
│   ├── threat/            # 威胁检测模块
│   └── api/               # REST API 模块
├── dkail-ui/              # Tauri 桌面应用
│   ├── src/               # React 前端
│   │   ├── components/    # 可复用组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API 服务
│   │   └── store/         # 状态管理
│   └── src-tauri/         # Tauri 后端
├── tests/                 # 集成测试
├── docs/                  # 文档
└── build.rs               # 构建配置
```

## 配置

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `DKAIL_API_PORT` | API 服务端口 | 8080 |
| `DKAIL_AUTH_TOKEN` | API 认证的 Bearer 令牌 | 无 |
| `DKAIL_NETWORK_INTERFACE` | 网络捕获接口 | 自动检测 |
| `DKAIL_LOG_LEVEL` | 日志级别 | Info |

## 安全说明

- 应用使用 `PROCESS_QUERY_LIMITED_INFORMATION` 实现最小权限进程监控
- API 认证通过 `DKAIL_AUTH_TOKEN` 环境变量配置（可选）
- 网络捕获需要安装 Npcap 驱动
- 所有 unsafe 代码块使用 RAII 模式进行正确的资源管理

### 安全特性

- **API 认证**：Bearer 令牌认证，使用常量时间比较防止时序攻击
- **速率限制**：每个 IP 地址每 60 秒最多 100 次请求
- **CORS 保护**：可配置的跨域资源共享
- **路径脱敏**：API 响应中屏蔽敏感信息（如用户名）
- **错误处理**：正确的错误响应，不暴露内部细节

### 安全最佳实践

1. **设置强认证令牌**：
   ```powershell
   $env:DKAIL_AUTH_TOKEN = "your-secure-random-token-here"
   ```

2. **使用最小权限运行**：应用只需要 `PROCESS_QUERY_LIMITED_INFORMATION` 权限

3. **监控日志**：检查日志中的认证失败和速率限制违规

## 许可证

MIT License

## 贡献

欢迎贡献！提交 PR 前请阅读贡献指南。

## 版本历史

- **1.0.0** (2026-04-22) - 初始发布
  - 实时网络监控
  - 进程行为监控
  - 威胁检测
  - 桌面 UI 应用
  - 安全修复：API 认证、速率限制、CORS、路径脱敏
