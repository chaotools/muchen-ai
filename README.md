# 沐尘 MuChen

中文 A 股 AI 投研与模拟盘 SaaS 的产品壳，当前以演示数据驱动。

## 当前版本

- Next.js + TypeScript
- 简体中文深色投研界面
- 市场驾驶舱、个股详情、AI 分析、自选股、模拟持仓、市场筛选、管理台
- 全局股票搜索、问题驱动研究工作台、AI 评分筛选和本地自选状态
- 客服邀请码登录、7 天签名会话和未登录路由保护
- 默认使用演示数据，方便在没有 iFinD Key 时直接运行
- 已预留 iFinD MCP 和 OpenAI 兼容模型的服务端配置
- 模拟订单只返回演示成交，不连接券商、不触及真实资金

## 页面

- `/`：市场驾驶舱
- `/screener`：行业、动能和 AI 评分筛选
- `/analysis`：研究库和问题驱动研究工作台
- `/watchlist`：自选股观察
- `/portfolio`：模拟持仓和模拟订单
- `/admin`：数据供应商和服务状态

## 启动

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## 环境变量

复制 `.env.example` 为 `.env.local`。首版默认 `MUCHEN_DATA_MODE=demo`。

## 邀请制登录

所有业务页面和 API 默认需要登录。客服邀请码由 `MUCHEN_INVITE_CODE` 在服务端校验，登录后签发 7 天 HttpOnly 签名 Cookie。生产环境必须设置 `MUCHEN_SESSION_SECRET` 和 `MUCHEN_INVITE_CODE`，缺少任一配置时会拒绝登录；后续再将邀请码迁移到数据库或后台管理服务。

后续接入 iFinD MCP 时，Key 只能放在服务端环境变量中，不能放到浏览器端：

```env
MUCHEN_DATA_MODE=ifind-mcp
IFIND_MCP_URL=https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-ifind-ds-stock-mcp
IFIND_MCP_AUTH_KEY=your_server_side_key
IFIND_MCP_AUTH_MODE=raw
```

`IFIND_MCP_AUTH_MODE` 默认使用 MCP 控制台示例中的原始 `Authorization` 值；如果供应商要求标准 Bearer 头，可改为 `bearer`。控制中心的“检查连接”会完成 MCP 初始化并读取工具列表，但真实个股字段映射仍需根据账号返回的工具 Schema 配置。

## 目录约定

- `app/`：Next.js 页面和服务端 API
- `components/`：共享布局和交互组件
- `lib/market.ts`：统一行情类型、演示数据、搜索和供应商状态
- `components/stock-search.tsx`：全局搜索
- `components/screener-table.tsx`：客户端筛选器
- `components/research-workspace.tsx`：问题驱动研究入口
- `app/api/`：后续接入真实 MCP、AI 和数据库的边界
