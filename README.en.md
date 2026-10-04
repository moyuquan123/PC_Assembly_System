# PC 装机系统 PC_Assembly_System

[简体中文](README.md) | **English**

![Node.js](https://img.shields.io/badge/Node.js-24%20LTS-339933)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Vite](https://img.shields.io/badge/Vite-7-646CFF)
![Fastify](https://img.shields.io/badge/Fastify-5-000000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1)
![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-0.44-C5F74F)

![The part picker (装机清单)](docs/screenshots/builder.png)

## Introduction

PC_Assembly_System (the web page is titled 「装机清单 · PC 配置助手」, "Build List · PC Configuration Assistant") is a web app MVP for first-time PC builders. You set a budget and a main use first, then pick parts in eight steps: CPU, motherboard, graphics card, memory, storage, power supply, case and cooler. Every pick is checked right away for compatibility, budget and total power draw.

Instead of starting from scratch, you can also browse the parts catalog by category and brand, look at complete builds from the official library or from other users, import one and tweak it. With a regular account you can publish your own build, recommend or comment on builds, and manage your profile and posts under "Me" (我的). Admin accounts are completely separate from regular accounts; the admin panel maintains parts and their structured specs.

It's a full-stack TypeScript monorepo using npm workspaces: a React frontend, a Fastify API, a framework-free compatibility and recommendation engine, and a PostgreSQL database (Drizzle ORM). Without a database the API falls back to in-memory data, so `npm install && npm run dev` is enough to try it out.

The UI is in Simplified Chinese; UI labels below are given in English with the original Chinese in parentheses.

## Features

**Start a build**
- Set the total budget (at least ¥2,000), the main use (gaming 游戏 / office 办公 / content creation 内容创作) and a build name
- Pick parts in eight steps: CPU → motherboard → graphics card → memory → storage → power supply → case → cooler; search by brand or model and filter by entry / mainstream / high-end
- Incompatible parts are still listed, but can't be added to the current build
- The side panel shows the selected parts, total price, remaining budget and estimated power draw in real time

**Compatibility checks** (nine rules, rule version `2026.09.1`)
- CPU vs. motherboard socket, CPU vs. motherboard chipset
- A "may need a BIOS update" warning for some CPU and motherboard combinations
- Motherboard vs. memory generation (DDR4 / DDR5), case vs. motherboard form factor (ATX / M-ATX / ITX)
- Graphics card length vs. case clearance, cooler height vs. case clearance, cooler vs. CPU socket
- Power supply: estimated draw = CPU max power + the other parts' power + a 55 W base. A PSU rated below the estimate is incompatible; one below 1.35× the estimate (35% headroom) gets a warning

**Saving and sharing**
- Drafts are saved in the current browser (localStorage), so you can "continue the last build" (继续上次的配置) later
- Copy the build list as text with one click
- A build with all eight parts and no conflicts can be turned into a share link (`/builds/<share code>`); the server re-checks compatibility, and the database only stores a hash of the share code

**Parts overview** (配置总览)
- Browse the catalog by the eight categories and by brand, sort by price or name, and open part details
- Shows where the catalog data comes from and when it was last updated

**Build plans and community** (配置方案)
- 8 official builds: one AMD and one Intel build for each of office entry (办公入门), mainstream gaming (主流游戏), high-end gaming (高性能游戏) and content creation (内容创作), generated from the current catalog and checked against the compatibility rules
- User submissions: once logged in you can publish your current build (all eight parts required); the server re-checks that the parts are on sale and compatible
- Filter by source, class or keyword; sort by overall score, recommendations, comments, click-through rate or newest
- "Use this build" (采用配置) imports a plan into the builder; you can recommend / not recommend it and leave comments (up to 500 characters)

**Accounts and "Me"** (我的)
- Register and log in with a regular account: username of 3–24 lowercase letters, digits or underscores; password of 8–72 characters
- The "Me" page: edit your display name, location and bio, and see your local draft, published builds and activity

**Admin panel** (`/admin/login`)
- After logging in, admins can search, add and edit parts, mark them active / inactive, and edit the structured specs JSON used by the compatibility rules; changes are written to an audit log
- With S3-compatible object storage configured, admins can upload part images (JPG / PNG / WebP, up to 5 MB)

**Optional: authorized catalog sync**
- With Taobao Open Platform credentials, the API periodically checks reference prices and image URLs for the CPUs and graphics cards already in the catalog (at most every 15 minutes)
- Newly found models only go into a review table and never feed the compatibility checks directly; without credentials the catalog stays local and nothing is scraped

**Security details**
- Passwords are hashed with Argon2; session tokens live in HttpOnly cookies and the server only stores their SHA-256 hashes
- Write requests check the `Origin` against `APP_ORIGINS`; login, registration, publishing, comments and other endpoints are rate limited
- The Nginx config used for Docker adds security headers and hides share codes in access logs

## Screenshots


| Set a goal | Pick parts | Build preview |
| :---: | :---: | :---: |
| ![Set budget and use](docs/screenshots/setup.png) | ![Pick parts in eight steps](docs/screenshots/builder.png) | ![Build preview and sharing](docs/screenshots/build-summary.png) |

| Parts overview | Build plans | Mobile |
| :---: | :---: | :---: |
| ![Browse parts by category and brand](docs/screenshots/parts-overview.png) | ![Official and user-submitted build plans](docs/screenshots/configuration-plans.png) | ![Build plans on a phone](docs/screenshots/mobile-plans.png) |

## Project Structure

```
PC_Assembly_System/
├── apps/
│   ├── web/                    # Frontend: React 19 + Vite + React Router + TanStack Query
│   │   ├── src/components/     # Pages and dialogs: builder, parts overview, build plans, Me, admin…
│   │   ├── src/lib/            # API client, local drafts, official build library
│   │   └── design-concepts/    # UI design mockups (PNG)
│   └── api/                    # Backend: Fastify 5 API
│       └── src/
│           ├── app.ts          # All routes, sessions, rate limits, origin checks
│           ├── store.ts        # In-memory store (used when DATABASE_URL isn't set)
│           ├── postgres-store.ts  # PostgreSQL store
│           ├── catalog-sync.ts    # Taobao Open Platform catalog sync
│           ├── image-storage.ts   # S3-compatible object storage (image uploads)
│           └── engagement-ranking.ts  # Overall score for build plans
├── packages/
│   ├── domain/                 # Framework-free: types, 56 seed parts, nine compatibility rules, power estimate, recommendations
│   ├── contracts/              # Zod request / response validation
│   └── database/               # Drizzle schema, SQL migrations, migrate / seed scripts
├── tests/
│   ├── e2e/                    # Playwright end-to-end tests
│   └── *.ps1                   # Docs and deployment config checks (PowerShell)
├── deploy/nginx.conf           # Nginx config for the Docker setup
├── docs/                       # Technical solution, release checklist (in Chinese)
├── PRODUCT_DESIGN.md           # Product design document (in Chinese)
├── docker-compose.yml          # PostgreSQL + migrate + seed + API + Web
├── Dockerfile.api / Dockerfile.web
└── .env.example                # Example environment variables
```

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/) 24 LTS and npm
- PostgreSQL 17 (optional, only for PostgreSQL mode)
- Docker (optional, only for the Docker setup)

### Run Locally (in-memory data)

```bash
git clone https://github.com/moyuquan123/PC_Assembly_System.git
cd PC_Assembly_System
npm install
npm run dev
```

Open http://127.0.0.1:4173. `npm run dev` compiles the shared packages and the API first, then starts the API (`127.0.0.1:4174`) and the Vite frontend (`127.0.0.1:4173`, which proxies `/api` to the API) together.

Without `DATABASE_URL` the API uses in-memory data, so users, submissions and share links are gone after a restart. In development the admin login defaults to `admin / Admin123!`.

### PostgreSQL Mode

Prepare a PostgreSQL 17 database, set `DATABASE_URL`, then run the migrations and seed data:

```bash
export DATABASE_URL=postgres://user:password@127.0.0.1:5432/pc_assembly
npm run migrate -w @pc-assembly/database   # Creates the tables; safe to run again
npm run seed -w @pc-assembly/database      # Inserts 8 categories and 56 demo parts
npm run dev
```

In Windows PowerShell, set the variable with `$env:DATABASE_URL="postgres://..."`.

The API only changes the database schema when you run the migrations explicitly. In production (`NODE_ENV=production`) there's no default admin password; you must provide a strong random one through `ADMIN_BOOTSTRAP_PASSWORD`.

### Docker

```bash
docker compose up --build
```

Open http://127.0.0.1:8080. Compose waits for PostgreSQL, runs the migrations and the demo seed, then starts the API and the web frontend (Nginx). The database and admin passwords in `docker-compose.yml` are for demos only and must not be used in a public deployment (to confirm: the Docker setup wasn't actually run while writing this README).

### Configuration

The API reads plain process environment variables and does not load a `.env` file by itself; `.env.example` lists every supported variable:

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` / `PORT` | `127.0.0.1` / `4174` | API listen address and port |
| `NODE_ENV` | — | `production` enables Secure cookies and disables the default admin password |
| `DATABASE_URL` | — | PostgreSQL connection string; in-memory data is used when it's not set |
| `APP_ORIGINS` | `http://127.0.0.1:4173,http://localhost:4173` | Frontend origins allowed to make write requests, comma-separated |
| `ADMIN_BOOTSTRAP_USERNAME` | `admin` | Admin username created on first start |
| `ADMIN_BOOTSTRAP_PASSWORD` | `Admin123!` in development | Admin password created on first start (an existing admin with that username is left unchanged) |
| `S3_ENDPOINT` `S3_REGION` `S3_BUCKET` `S3_PUBLIC_BASE_URL` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` | — | Set all six to enable admin image uploads (S3-compatible storage; the example uses Tencent Cloud COS) |
| `TAOBAO_APP_KEY` `TAOBAO_APP_SECRET` `TAOBAO_ADZONE_ID` | — | Set all three to enable the Taobao Open Platform catalog sync |
| `CATALOG_SYNC_INTERVAL_MINUTES` | `60` | Catalog sync interval, minimum 15 minutes |

### Tests and Linting

```bash
npm run typecheck   # TypeScript type check
npm run lint        # ESLint
npm test            # Vitest unit tests for every package
npm run build       # Compile and build the frontend into apps/web/dist
npm run test:e2e    # Playwright end-to-end tests (desktop and mobile viewports)
npm run validate    # All of the above + docs checks + deployment config checks
```

The end-to-end tests prefer an installed Chrome / Edge on Windows; you can also point `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` at a browser. On other systems run `npx playwright install chromium` once before the first run.

`test:docs` and `test:config` inside `npm run validate` call `powershell` to run `tests/*.ps1`, so they need Windows or a system with PowerShell installed.

## API Overview

Every endpoint returns `{ requestId, data }` or `{ requestId, error: { code, message } }`.

| Endpoint | Description |
| --- | --- |
| `GET /health/live`, `GET /health/ready` | Liveness and readiness checks |
| `GET /api/v1/categories`, `GET /api/v1/parts`, `GET /api/v1/parts/:id` | Part categories and parts |
| `GET /api/v1/catalog/freshness` | Catalog data source and last update |
| `POST /api/v1/compatibility/check` | Compatibility check and power summary |
| `POST /api/v1/recommendations` | Smart recommendations: given a budget, a use and optional preferences (compact, quiet, upgrade-friendly), returns three complete, compatible builds: balanced (均衡方案), performance first (性能优先) and value first (性价比优先) |
| `POST /api/v1/builds`, `GET /api/v1/builds/:shareCode` | Create and read shared builds |
| `GET/POST /api/v1/configurations` and `/:configurationKey/click`, `/vote`, `/comments` | Build plans, submissions and interactions |
| `POST /api/v1/users`, `/api/v1/user-sessions`, `GET/PATCH /api/v1/users/me` | Regular accounts and profiles |
| `/api/v1/admin/*` | Admin login, part management, image uploads, manual catalog sync |

Smart recommendations are API-only for now: there's a `RecommendationScreen` component in the repository, but it isn't wired into any route.

## Current Status

Version **0.1.0 (MVP)**. All the features listed above are implemented, with unit tests and Playwright end-to-end tests. See [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md), [docs/TECHNICAL_SOLUTION.md](docs/TECHNICAL_SOLUTION.md) and [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) (all in Chinese) for the product design, technical design and pre-launch checklist.

Known limitations:

- The catalog is 56 built-in demo parts with fixed reference prices; prices only change when an admin edits them or when the Taobao Open Platform sync is configured
- Smart recommendations have no web UI yet (see above)
- Admin image uploads need your own S3-compatible object storage; without it you can only enter an image URL
- Compatibility results are a decision aid only; check the manufacturers' support lists and specs before buying

## FAQ

**Logging in, registering or publishing says 「请求来源未通过安全检查」 ("request origin failed the security check")?**
Write requests check that the `Origin` is listed in `APP_ORIGINS`. In development `http://127.0.0.1:4173` and `http://localhost:4173` are allowed by default; the Docker setup only allows `http://127.0.0.1:8080`, so open that address or change the API's `APP_ORIGINS` in `docker-compose.yml`.

**Accounts and share links disappear after a restart?**
Without `DATABASE_URL` the data lives in memory and is cleared on restart. Use PostgreSQL mode or Docker to keep it.

**Can't log in to the admin panel?**
In development it's `admin / Admin123!`. With `NODE_ENV=production` no default password is created, so set `ADMIN_BOOTSTRAP_PASSWORD`; if an admin with that username already exists in the database, changing the variable won't change the existing password.

**Which Node.js version do I need?**
The project is developed for Node.js 24 LTS, and production requires Node.js 24 LTS too; check yours with `node -v`. `package.json` doesn't pin a Node version, and whether other versions work is still to confirm.

## Author

Author: 李增阳 (GitHub: [@moyuquan123](https://github.com/moyuquan123)) (to confirm: whether the credit and link should read like this)

## License

The repository doesn't have a LICENSE file yet (to confirm: whether to add an open-source license, and which one).
