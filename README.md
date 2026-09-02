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
- `/support/login`：客服工作台登录
- `/support`：客服独立邀请码管理

## 启动

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## 本地免费数据服务

项目提供一个独立的免费数据网关，不把数据供应商代码耦合进 Next.js。它以腾讯财经公开行情提供最新交易日行情和前复权日 K 线，BaoStock 仅在主源不可用时兜底；同花顺公开页面适配用于题材成分。首次启动会在项目目录创建 `.venv-free-data` 并安装所需依赖。启动网关后，在本地 `.env.local` 中将前端切到真实数据模式：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-free-data.ps1
```

服务地址为 <http://127.0.0.1:8090>，接口文档为 <http://127.0.0.1:8090/docs>。

```env
MUCHEN_DATA_MODE=free-data
MUCHEN_DATA_SERVICE_URL=http://127.0.0.1:8090
```

切换后，首页、自选、筛选、个股详情和题材页会从本地网关读取数据；题材热度和趋势是用公开题材成分股的腾讯财经行情样本计算的，事件流、完整财务和公告原文仍需后续接入专门数据源。

- `GET /health`：服务健康状态
- `GET /api/stock/600519.SH/history`：免费历史 K 线
- `GET /api/stock/000001.SZ/concepts`：股票所属同花顺题材
- `GET /api/topic/885966/members`：同花顺题材成分股

免费公开数据仅用于本地研究和模拟，不能据此承诺商业再分发或实时稳定性；如需稳定的盘中行情、完整财务、公告与新闻，请替换为已授权的数据供应商。

## 环境变量

复制 `.env.example` 为 `.env.local`。仓库示例默认 `MUCHEN_DATA_MODE=demo`；本地免费数据模式请改为 `free-data` 并启动 8090 网关。

## 邀请制登录

所有业务页面和 API 默认需要登录。客服邀请码由 `MUCHEN_INVITE_CODE` 在服务端校验，登录后签发 7 天 HttpOnly 签名 Cookie。生产环境必须设置 `MUCHEN_SESSION_SECRET` 和 `MUCHEN_INVITE_CODE`，缺少任一配置时会拒绝登录；后续再将邀请码迁移到数据库或后台管理服务。

配置 `DATABASE_URL` 后执行 `db/schema.sql`，登录用户、邀请码、兑换记录、自选股、模拟订单和研究报告即可进入 PostgreSQL 持久化层。`MUCHEN_ADMIN_EMAILS` 用逗号分隔管理员邮箱；未配置时，开发环境的已登录账号可进入邀请管理，生产环境默认没有管理员。

## 客服工作台

客服使用独立入口 `/support/login`，与用户侧登录 Cookie 分开。必须配置 `MUCHEN_SUPPORT_EMAILS`、`MUCHEN_SUPPORT_ACCESS_KEY` 和 `MUCHEN_SUPPORT_SESSION_SECRET` 后才能登录；两个密钥都必须是至少 32 个字符的独立随机值，不能使用示例、邀请码或用户侧会话密钥。生产环境缺少任一项时，客服登录会拒绝请求。

可使用 Node.js 生成密钥：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

客服登录接口会按来源地址限制连续失败次数。多实例部署时，应将该限流接入共享存储或边缘限流服务。没有 `DATABASE_URL` 时，客服工作台使用进程内演示存储；配置 PostgreSQL 并执行表结构后，邀请码才会持久化。

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
