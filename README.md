# PC 装机系统 MVP

面向装机新手的完整 MVP：设定预算与用途、分八步选择配件、即时检查兼容性、查看价格与功耗、保存本地草稿、生成不可枚举的分享链接，并由管理后台维护配件。

## 本地运行

要求 Node.js 24 LTS 与 npm。

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:4173`。未设置 `DATABASE_URL` 时，API 使用内存数据，方便直接体验；开发环境管理后台默认为 `admin / Admin123!`。

## PostgreSQL 模式

先设置 `DATABASE_URL`，再执行：

```powershell
npm run migrate -w @pc-assembly/database
npm run seed -w @pc-assembly/database
npm run dev
```

生产环境必须使用 Node.js 24 LTS、PostgreSQL 17，并通过 `ADMIN_BOOTSTRAP_PASSWORD` 注入强随机初始密码。API 只在显式执行 migration 时修改数据库结构。

## 验证

```powershell
npm run validate
npm run test:e2e
```

端到端测试会优先使用 Windows 上现有的 Chrome/Edge；其他环境首次运行前请执行 `npx playwright install chromium`。

## 目录

- `apps/web`：React 19、Vite、TypeScript、React Router、TanStack Query
- `apps/api`：Fastify 5 API、会话认证、限流、服务端兼容复核
- `packages/domain`：无框架依赖的预算、功耗和九条兼容规则
- `packages/contracts`：Zod 请求、响应与领域校验
- `packages/database`：Drizzle schema、PostgreSQL migration 与 56 个种子配件
