# FDA Connector — Phase 3

FDA → HTML 获取 → 解析与标准化 → 相关性规则 → 去重与事务写入 → PostgreSQL → 现有 BioReg Radar 页面。

## 实际官方来源

入口为 [FDA Recently Issued Guidance Documents](https://www.fda.gov/vaccines-blood-biologics/biologics-guidances/recently-issued-guidance-documents)，包含 CBER 及联合 CDER/CBER 指导文件。跟随其 `/regulatory-information/search-fda-guidance-documents/…` 详情链接，只接受 fda.gov / www.fda.gov HTTPS。详情页提供标题、状态、PDF 链接、发布年月、办公室、docket 和简介。不访问商业数据库或其他机构。

覆盖范围是该近期生物制品列表，不是 FDA 全量目录，也不保证覆盖全部 CDER 指导文件。

## 运行

```sh
npm run db:local
npm run db:generate
npm run db:migrate
# 新工作区需要先初始化 Source；已有工作区无需重复 seed
npm run db:seed
npm run sync:fda -- --mode initial --dry-run --limit 5
npm run sync:fda -- --mode initial --limit 5
npm run sync:fda -- --mode incremental --limit 10
npm run sync:fda -- --mode initial --limit 20 --start-date 2026-01-01
```

默认 incremental、limit=10。limit 限制每次详情请求候选数，范围 1–100；列表每次只访问一页。初次同步不会遍历历史归档。增量运行从近期列表获取文件，并将约三分之一名额留给库内最久未检查的 FDA 记录；总详情数仍不超过 limit。limit=1 时只检查近期列表首条。

start-date 仅过滤能够确定完整发布日期的记录。只有年月或年份的记录保留 null 和原始日期文字，输出 warning，不会补造月日；这些日期不完整记录不会被日期下限排除。

Dry Run 执行网络请求、解析、标准化、筛选及数据库身份查询，但不写入任何法规、版本、检查时间、Source 或 SyncLog。输出 Found、Relevant、New、Existing、Updated、Invalid、Skipped、Failed。

## 配置与实现

- `DATABASE_URL` 使用现有环境配置，不在命令输出中打印。
- `src/server/connectors/fda/client.ts`：顺序请求、1200 ms 请求间隔、20 s timeout、最多两次重试、指数退避、最多五次重定向、5 MB HTML 上限。访问拒绝不重试，不绕过 CAPTCHA 或登录。只保存 PDF URL，不下载 PDF。
- `parser.ts`：列表与详情 DOM 解析。正文只保留详情主区的直接简介段落，排除导航、联系方式及提交意见说明。
- `normalizer.ts`：完整日期验证、官方类型/状态映射、稳定字段哈希；不使用页面的 Content current as of 充当文件发布日期。
- `rules.ts`：可维护的生物药关键词、CBER/CDER 相关性与确定性分类。标签是系统规则结果，不冒充官方分类。
- `writer.ts`：事务内按 source、非 mock、canonical URL、文号去重；只有缺少强标识的旧记录才回退到标题与完整发布日期。docket 独立保存，不能冒充文号，因为多个文件可能共用 docket。
- `sync.ts`：有界初始/增量运行、失败隔离、日志、只读 dry-run。

现有官方内容未变化时更新 last_checked_at，并刷新确定性分类标签，保留 updated_at 和历史版本；官方内容发生变化则保留 first_detected_at、更新官方字段与哈希并追加不可覆盖的版本。同步写入采用来源级 PostgreSQL 事务锁，防止并发 CLI 重复入库。不会执行段落 diff。

## SyncLog

正式运行先创建带 started_at 的非 mock 日志，结束时写入 finished_at、计数和 SUCCESS / PARTIAL_SUCCESS / FAILED。单条错误不中断后续记录，错误摘要保存在 error_message；成功或部分成功时更新 Source.last_sync_at。被强制终止的进程可能留下 finished_at 为空的 FAILED 日志，表示运行未正常完成。

## 测试

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:smoke
# 启动应用并完成真实同步后，显式验证现有页面中的真实 FDA 数据
npm run test:fda:web
```

默认测试使用最小合成 HTML fixtures 与独立 PostgreSQL schema，不请求 FDA。覆盖列表/详情、缺失字段、日期、映射、URL、相关性、哈希、并发去重、版本追加、dry-run、同步日志与单条失败隔离。真实网络验证通过上面的 CLI 显式运行。

## 常见错误和限制

- 连接数据库失败：先启动本地 PostgreSQL，核对 DATABASE_URL 并执行迁移。
- FDA 403/429、超时或核心入口返回非预期结构：不会绕过限制，查看日志并稍后重试；核心入口无法解析时标记 FAILED，不能把空列表报为成功。
- 日期不完整 warning：并非采集失败；数据库 date 为 null，publication_date_raw 保留官方年月。
- DOM 结构变动：可能导致解析拒绝或可选字段缺失。需要检查官方 HTML 并更新 fixtures 和选择器。
- 官方未提供字段保留 null / UNKNOWN；不把网站更新时间当作文件修订时间。
- PDF 正文及 PDF 内容变化不在本阶段范围；同一 PDF URL 下仅 PDF 二进制变化不会被当前 HTML 字段哈希检测到。
- Mock 仍保留并逐条标识；真实 FDA 记录为 is_mock=false。没有接入其他机构、Scheduler、通知、AI API 或 Phase 4。
