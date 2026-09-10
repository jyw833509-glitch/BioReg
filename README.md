# BioReg Radar

全球生物药法规情报平台。当前交付 **Phase 5 — Scheduler & Source Health**。

保留现有 Next.js 页面与视觉结构，使用 **原生 PostgreSQL + Prisma 7 + 统一 Repository**。已接入 FDA、EMA、NMPA（官方英文站）、ICH、PMDA 真实数据；CDE 访问受限；EMA 曾受限，本次小批量请求恢复成功。Phase 4 已按更新标准收口为 ACCEPTED WITH RUNTIME LIMITATIONS。来源与命令详见 [README_SOURCES.md](README_SOURCES.md)，调度部署见 [README_SCHEDULER.md](README_SCHEDULER.md)，验收见 [PHASE5_REPORT.md](PHASE5_REPORT.md)。支持有界同步和字段哈希检查；统一调度与 GitHub Actions 配置已实现，云端资源尚未创建/启用；没有段落 diff、AI API 或推送服务。

## 运行

需要 Node.js 22.12+ 或兼容的 Node.js 24，以及 npm。

```sh
npm ci
npm run db:local
npm run db:migrate
npm run db:seed
npm run dev
```

访问 http://localhost:3000 。`db:local` 运行的是原生 PostgreSQL 18，不是 PGlite、SQLite 或内存替代品。它监听 `127.0.0.1:55432`，自动生成随机开发密码并写入被忽略的 `.env.local`，不会覆盖已有非空 DATABASE_URL。其他操作系统也可直接配置已安装的 PostgreSQL 或云数据库；不要求 Docker。

此 Windows 工作区包含中文路径，原生 PostgreSQL 初始化会遇到路径编码问题。启动脚本将开发数据库与原生二进制放到 `%LOCALAPPDATA%/BioRegRadar/<workspace-hash>/` 的独立英文路径，可用 `BIOREG_LOCAL_ROOT` 自定义。代码仍保留在当前工作区，开发凭据只保存在 `.data/local-postgres.json` 和 `.env.local`。启动不会安装系统服务或创建系统账号。

停止本地数据库（保留数据）：

```sh
npm run db:stop
```

再次运行 `npm run db:local` 可重新连接持久数据。云端运行不依赖本地数据库；必须配置云端 PostgreSQL 的 DATABASE_URL。

## Database

### PostgreSQL 与 ORM

- PostgreSQL：开发环境已用原生 18.4 验证；SQL migration 使用标准 PostgreSQL 类型、数组、外键和索引。
- ORM：仅使用 Prisma 7.10.0，通过 `@prisma/adapter-pg` 连接 PostgreSQL。
- `pg` 仅作为 Prisma 底层驱动和本地数据库创建工具；应用数据读写全部通过 Prisma Repository。
- React 页面不直接调用 ORM。Next.js Server Components 和 Route Handlers 共用同一套 Repository，不存在第二套后端。
- 客户端缓存 Prisma 连接池，每个进程最多 5 个连接。

配置 `.env.local`：

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bioreg
```

示例不是真实凭据。云数据库请遵循服务商 TLS 配置要求；本项目不禁用证书校验。

其他变量见 `.env.example`：

| 变量                | 用途                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`      | 必填；应用、Prisma migration 和 seed 使用                                           |
| `TEST_DATABASE_URL` | 可选；测试使用的独立 PostgreSQL 服务；未配置时使用 DATABASE_URL 下的独立临时 schema |
| `APP_ORIGIN`        | 可选；反向代理后固定 Watchlist 写入的同源检查地址                                   |
| `BIOREG_LOCAL_ROOT` | 可选；本地原生 PostgreSQL 的英文路径                                                |

`.env*` 已忽略，仅允许 `.env.example` 被提交。Prisma config 使用与 Next.js 相同的环境加载方式。数据库连接失败时不会退回静态 Mock，也不会把连接字符串返回浏览器。

### Database schema

| 模型                | 用途与关系                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| `Source`            | FDA、EMA、NMPA、CDE、ICH、PMDA，code 唯一；NMPA 与 CDE 独立                        |
| `Regulation`        | 正式结构化字段、官方事实、系统摘要和六类数组标签；每条属于一个 Source        |
| `RegulationVersion` | Regulation 1:N 历史版本，带前驱引用；只允许新增，数据库触发器拒绝覆盖和删除  |
| `SyncLog`           | Source 1:N 执行日志；保存与查询真实 FDA 同步及模拟日志                      |
| `Watchlist`         | 单用户持久关注规则；支持多个来源、标签、产品、阶段、文件类型、关键词和重要度 |

`document_type`、`status`、`importance_level`、`SyncLog.status` 使用 PostgreSQL/Prisma 枚举，网页通过映射显示友好名称。多值字段使用 PostgreSQL 数组，法规分类、子分类、关键词、产品、阶段和部门建有 GIN 索引。

主要索引覆盖 regulator、publication_date、status、document_type、importance_level、content_hash、canonical_url、first_detected_at、last_checked_at。Regulation 的复合外键确保 source_id 与 regulator 一致。

唯一性基础使用同来源、同 is_mock 范围的部分唯一索引：非空 document_number、非空 canonical_url；两者都缺失时才使用标准化标题 + publication_date。不会仅凭标题全局去重。正式来源身份合并、内容比较和变化检测属于后续阶段。

官方 `updated_date` 与系统 `updated_at` 分开存储。`last_checked_at` 为空表示未检查，seed 不伪造真实检查时间。AI 提示词功能没有官方字段写入入口。数据库约束禁止 Mock 记录填写官方 URL、PDF、官方摘要。

### Migration

```sh
npm run db:generate
npm run db:migrate
```

正式迁移位于 `prisma/migrations/`，可从空库执行。部署使用 `prisma migrate deploy`；重复执行没有未应用迁移时不会重复创建表。额外的部分唯一索引、check constraints 和版本不可覆盖触发器均包含在 migration SQL 中。

修改模型时，在专用开发数据库使用 `npx prisma migrate dev --name descriptive_change` 生成新 migration。不要修改已经应用的 migration。

### Seed

```sh
npm run db:seed
```

初始化 6 个来源元数据、15 条 **Development / Mock Data** 法规、19 条示例版本、5 条明确标记的模拟 SyncLog 和 1 条关注规则。Seed 幂等，不覆盖已存在的法规、历史版本或已修改的关注。

监管来源名称和官网根地址是来源配置；法规正文、日期、状态、摘要、版本与日志全部是开发示例。模拟日志不代表进行过抓取；未运行真实同步前 Source.last_sync_at 为空；FDA 正式同步后写入同步时间。

### Database reset

仅对确认可丢弃的开发数据库运行以下交互式命令。它会清空 DATABASE_URL 指向的 schema，不能用于生产数据：

```sh
npx prisma migrate reset
npm run db:seed
```

本次实施没有 reset 用户数据库。测试仅删除测试自身创建的随机 `bioreg_test_<uuid>` schema。

## 数据访问层

`src/server/repositories/` 提供：

- `regulationRepository`：getById / list / search / filter / count / getRecent / getToday / getUpdated / getHighPriority / create / update / upsert。
- `regulationVersionRepository`：查询历史和显式追加版本，不实现自动 diff。
- `sourceRepository`：来源列表、code 查询、已启用来源计数。
- `syncLogRepository`：日志保存与查询，无同步任务。
- `watchlistRepository`：创建、查询、修改和删除单用户关注。
- `dashboardRepository`：数据库聚合统计及数量受限的最近/重点记录。

写入接口仅向可信服务端代码开放。法规 create/update/upsert 不提供 HTTP 写入接口，FDA Connector 通过独立事务 Writer 接入。

## 页面与 API

| 页面                   | 数据连接                                                     |
| ---------------------- | ------------------------------------------------------------ |
| `/`                    | Dashboard PostgreSQL 聚合统计与最近记录                      |
| `/today`               | UTC 当天首次发现的新法规或当天有更新版本的法规               |
| `/regulations`         | PostgreSQL 搜索、筛选、排序、分页；默认 20 条/页             |
| `/regulations/[id]`    | 按 ID 查询及完整版本历史；不存在返回 404                     |
| `/updates`             | 新增、更新及有关联历史版本的法规，分页读取                   |
| `/watchlist`           | 数据库关注编辑；原有浏览器收藏仍保留，法规按 ID 从数据库读取 |
| `/topics`、`/agencies` | 数据库主题统计及来源信息                                     |
| `/reports`             | 数据库统计与开发日报导出；周报仍是骨架                       |
| `/ai-tools`            | 根据当前数据库页面的记录生成提示词，不调用 AI API            |
| `/settings`            | PostgreSQL 状态与模拟日志展示                                |

法规列表只读取请求页，不一次性加载全部法规。输入关键词后按 Enter 或“搜索”提交；修改筛选或排序时返回第一页，筛选状态保留在 URL。

搜索覆盖中英文标题、文号、官方摘要、正文和关键词（数组关键词支持精确匹配）。筛选包含来源、分类、子分类、产品、阶段、部门、状态、文件类型、重要度、发布日期范围及 New/Updated。排序支持 Newest / Recently Updated / Importance / Regulator，默认 publication_date DESC，使用 id 稳定排序。

统一 API：

```text
GET    /api/health
GET    /api/dashboard
GET    /api/sources
GET    /api/regulations?q=protein&regulator=FDA&page=1&pageSize=20
GET    /api/regulations/:id
GET    /api/regulations/:id/versions
GET    /api/updates
GET    /api/sync-logs
GET    /api/watchlists
POST   /api/watchlists
PATCH  /api/watchlists/:id
DELETE /api/watchlists/:id
```

`/api/regulations` 同时接受 `status`、`document_type`、`importance_level`、`categories`、`product_types`、`development_stages`、`affected_departments`、`date`、`dateTo`、`change=New|Updated`、`is_new=true|false`、`is_updated=true|false`。日期格式 YYYY-MM-DD；分页参数 page/pageSize，最大 100 条/页。非法参数返回 400，未知记录返回 404，数据库不可用返回脱敏 503。

Watchlist 写入检查同源并校验输入，按单用户工作区设计，没有多用户鉴权；后续开放到公网前应由部署平台设置访问控制。

## 测试与构建

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:smoke
```

`npm test` 包含真实 PostgreSQL 集成测试；没有 DATABASE_URL 时会失败，不会伪装通过或跳过。测试在独立随机 schema 内执行 migration、空库查询、seed、CRUD、数据库搜索/筛选/分页、版本关系和不可覆盖约束、Source 外键、SyncLog 写入、Watchlist 跨连接持久化及输入检查。运行结束后移除测试 schema。

生产运行：

```sh
npm run db:migrate
npm run build
npm start
```

Vercel 或其他 Node.js Hosting 配置 DATABASE_URL，构建前生成 Prisma Client，并在发布流程执行 migration。无自动采集工作流；本次没有部署云端服务或创建 GitHub 仓库。

## 当前边界

- 来源覆盖与限制见 README_SOURCES.md；Scheduler 实现见 README_SCHEDULER.md；没有 paragraph diff 或通知推送。
- 日报导出最多 100 条，超过时导出元数据明确标记 First 100 records only。
- AI Tools 是提示词工具；当前仅供选择本页记录，不自动登录外部 AI 或回写结果。
- Watchlist 为单用户持久化；收藏继续使用浏览器 localStorage。
- 周报与通知服务仍为页面骨架。
- 本次停止在 Phase 5，不进入 Phase 6。

参考：[Prisma 官方文档](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction)、[原生 PostgreSQL 开发包](https://github.com/leinelissen/embedded-postgres)。

## FDA Connector

官方来源、同步命令、Dry Run、初始/增量同步、配置、测试和常见错误见 [FDA Connector 文档](README_FDA.md)。

    npm run sync:fda -- --mode initial --dry-run --limit 5
    npm run sync:fda -- --mode initial --limit 5
    npm run sync:fda -- --mode incremental --limit 10

Phase 3 migration 将官方发布日期调整为可空，保留 publication_date_raw，并增加 issuing_offices、official_topics、docket_number。官方只公布年月时不会补造日期。
