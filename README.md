# PC 装机系统 MVP

面向装机新手的完整 MVP：按类别与品牌浏览单个配件、查看官方与用户投稿的完整配置方案、分八步调整配件、即时检查兼容性、创建社区账号、维护个人资料、上传配置、评论与推荐，并保存本地草稿和生成不可枚举的分享链接。

配置投稿、评论和推荐需要普通用户账号；管理后台账号与普通账号完全分离。投稿必须包含完整八类配件，并由服务端重新检查在售状态和兼容性。方案支持按推荐数、评论数、点击率或服务端综合分排序；确定性智能推荐引擎与 API 仍作为后续 AI 需求解析的安全基础保留，不依赖外部 AI 密钥。

## 本地运行

要求 Node.js 24 LTS 与 npm。

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:4173`。未设置 `DATABASE_URL` 时，API 使用内存数据，方便直接体验；开发环境管理后台默认为 `admin / Admin123!`。

主导航中的“我的”是账号个人中心，可编辑显示名称、所在地和简介，并查看本地草稿、已发布方案及互动记录。“配置总览”会显示目录数据来源和最近更新时间。

## 授权目录同步（可选）

首版支持用淘宝开放平台授权接口定时核验已收录 CPU、显卡的参考价格。复制 `.env.example` 中的 `TAOBAO_APP_KEY`、`TAOBAO_APP_SECRET`、`TAOBAO_ADZONE_ID` 并填写自己的应用授权后启用；`CATALOG_SYNC_INTERVAL_MINUTES` 控制同步周期，最低 15 分钟。没有授权时系统保持本地目录模式，不会抓取网页。

自动同步只更新能可靠匹配到现有型号的价格和图片地址；新发现型号会写入审核候选表，必须补齐规格和授权信息后再由管理员发布。这样既能提高时效性，也不会让广告标题或错误分类直接进入兼容性判断。

## PostgreSQL 模式

先设置 `DATABASE_URL`，再执行：

```powershell
npm run migrate -w @pc-assembly/database
npm run seed -w @pc-assembly/database
npm run dev
```

生产环境必须使用 Node.js 24 LTS、PostgreSQL 17，并通过 `ADMIN_BOOTSTRAP_PASSWORD` 注入强随机初始密码。API 只在显式执行 migration 时修改数据库结构。

## Docker 本地体验

```powershell
docker compose up --build
```

打开 `http://127.0.0.1:8080`。Compose 会等待 PostgreSQL 就绪，依次执行 migration 和演示数据 seed，再启动 API 与 Web。演示配置中的数据库密码和管理员密码不能直接用于公开环境。

## 验证

```powershell
npm run validate
npm run test:e2e
```

端到端测试会优先使用 Windows 上现有的 Chrome/Edge；其他环境首次运行前请执行 `npx playwright install chromium`。

## 目录

- `apps/web`：React 19、Vite、TypeScript、React Router、TanStack Query
- `apps/api`：Fastify 5 API、普通用户与管理员双会话认证、个人中心、社区互动、混合排序、授权目录同步、限流、服务端兼容复核
- `packages/domain`：无框架依赖的预算、功耗、九条兼容规则及智能推荐引擎
- `packages/contracts`：Zod 请求、响应与领域校验
- `packages/database`：Drizzle schema、PostgreSQL migration 与 56 个种子配件

上线准备、数据来源和隐私检查见 `docs/RELEASE_CHECKLIST.md`。
