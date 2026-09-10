# Phase 3 — FDA Official Data Connector

完成日期：2026-09-10。

## Project Status

**Success**。基于现有 Phase 2 完成 FDA → PostgreSQL → BioReg Radar Web，没有重新初始化项目。

## FDA Official Sources

实际入口：[FDA Recently Issued Guidance Documents](https://www.fda.gov/vaccines-blood-biologics/biologics-guidances/recently-issued-guidance-documents)。跟随近期 CBER、联合 CDER/CBER 文件的 FDA 官方详情链接。

已入库的一个示例：[Frequently Asked Questions — Developing Potential Cellular and Gene Therapy Products](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/frequently-asked-questions-developing-potential-cellular-and-gene-therapy-products)，及其 [官方 PDF](https://www.fda.gov/media/183631/download)。其余四条为 Potency Assessment、Container Closure Systems、Formal Meetings、Biosimilar Container Closure Systems 相关指导文件。

未接入 EMA、NMPA、CDE、ICH、PMDA 或 WHO。

## Connector

- Client：顺序低频访问、timeout、指数退避与重试、User-Agent、受限重定向及 HTML 大小限制。
- Parser：近期列表、详情、官方 PDF 链接、标题、状态、办公室、docket 和官方简介。
- Normalizer：日期精度、枚举、canonical URL 和稳定内容哈希。
- Rules：可维护的生物药相关性与确定性分类，沿用现有筛选名称。
- Writer：数据库身份判断、事务 Upsert、并发去重及版本追加。
- Sync / CLI：有界 initial / incremental、只读 dry-run、单条失败隔离和 SyncLog。

## Parsed Fields

可靠读取 regulator、title_original、官方 URL、canonical URL、source_page_url、PDF URL、官方页面状态、文件类型、发布日期原文、issuing_offices、docket_number 和直接简介段落。

完整日期才写入 publication_date；只有年月时写 null 并保存 publication_date_raw。文号、effective_date、官方修订日期等未提供时保留 null；不把 docket 当作文号，不把网站内容更新时间当作发布日期。没有 AI 填充或翻译。

## Sync Result

| 运行 | Found | Relevant | New | Updated | Skipped | Failed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Initial dry-run，limit 5 | 5 | 5 | 5（预计） | 0 | 0 | 0 |
| Initial 正式同步，limit 5 | 5 | 5 | 5 | 0 | 0 | 0 |
| Incremental 复查，limit 5 | 5 | 5 | 0 | 0 | 5 | 0 |

最终分类名称对齐后的增量复查同样为 5 条已有、0 新增、0 更新、0 失败。所有正式运行状态 SUCCESS。5 条日期精度 warning 表明官方页面仅提供年月，不是采集失败。

## Database

真实 FDA 数据已入库，is_mock=false；每条保存初始版本、官方来源、PDF、内容哈希、first_detected_at 和 last_checked_at。真实 SyncLog 与种子日志独立标识。原有开发示例继续保留，不覆盖或冒充真实数据。

新增迁移使 Regulation 和 RegulationVersion 的 publication_date 可空，并增加 publication_date_raw、issuing_offices、official_topics、docket_number。空库和已有库迁移均已验证。

## Web Integration

| 页面 | 状态 |
| --- | --- |
| Dashboard | PASS，统计与动态列表包含真实 FDA 数据 |
| Today | PASS，按发现时间显示本次 5 条真实记录 |
| Regulations | PASS，统一列表、来源筛选与数据库分页 |
| Regulation Detail | PASS，标题、状态、类型、日期精度、来源、PDF、Last Checked 与版本 |
| Updates | PASS，显示初次发现的真实 FDA 记录 |

五个页面均通过生产 HTTP 实际数据验证。浏览器中已检查真实详情及官方跳转链接，真实记录显示 Real Official Data，模拟记录显示 Mock。

## Deduplication & Update Detection

以 source_id + 非 mock 范围隔离，优先 canonical URL 或文号，缺少强身份的旧记录可用标题与完整日期辅助匹配。docket 不用于唯一标识。URL 统一 HTTPS、去尾斜线、fragment 和 tracking 参数，保留定位参数。

稳定哈希覆盖官方标题、文号、状态、日期、简介、PDF 等，规范化空白与字段顺序。内容未变不新增版本，也不改变 updated_at；可刷新规则标签。变化则事务内更新法规并追加不可覆盖的快照。来源级事务锁防止并发重复写入。没有 paragraph / section diff。

## Tests

| 检查 | 结果 |
| --- | --- |
| Parser Tests | PASS，8 项离线 FDA fixtures 测试 |
| Database Tests | PASS，16 项真实 PostgreSQL 集成测试 |
| Existing Product Tests | PASS，4 项；合计 28/28 |
| Integration Test | PASS，真实 dry-run、initial、incremental；5 个现有页面 |
| Production Smoke | PASS，空库页面、404/400/403、分页搜索、详情与关注持久化 |
| Lint | PASS |
| Typecheck | PASS |
| Build | PASS |

开发期间发现并修复了 PostgreSQL advisory lock 的 void 返回类型兼容问题及 fixture 正则的 TypeScript 编译目标问题。最终无失败检查。默认测试不依赖 FDA 实时可用性。

## Known Issues

- 覆盖 FDA 近期生物制品列表，尚非全部 FDA/CDER 历史目录；每次一页、详情数有界。
- FDA DOM 结构调整可能导致解析拒绝或可选字段缺失，需要维护选择器及 fixtures。
- 仅保存 PDF URL；同 URL 下 PDF 二进制内容单独变化尚不能检测。
- 官方年月不补造日期；日期筛选只对完整日期生效，start-date 保留精度不足的记录并警告。
- Today 仍采用 UTC 日期边界。确定性分类是辅助规则，不是官方法规判断。
- 无 Scheduler、通知、AI API、多用户权限或云端部署。

## Files Created / Modified

- `src/server/connectors/fda/`：client、parser、normalizer、rules、writer、sync。
- `scripts/sync-fda.ts`、`package.json`、`package-lock.json`：运行入口与 Cheerio 依赖。
- `prisma/schema.prisma`、`prisma/migrations/202609100001_fda_connector/migration.sql`：精度与来源元数据。
- `src/server/mappers.ts`、`src/lib/types.ts`、两个法规/统计 Repository：可空日期与排序。
- `src/components/workspace.tsx`、`src/lib/search.ts`：真实/模拟标识、详情来源、现有提示词的来源标签。
- `tests/fixtures/fda/`、`tests/fda.test.ts`、`tests/database.test.ts`、`tests/fda-web.ts`：离线、数据库和页面验证。
- `README.md`、`README_FDA.md`、本报告：操作与交付说明。

## Phase 4 Readiness

第一个真实监管来源的有界同步、去重、版本、日志和现有页面链路已经完成，可作为后续阶段基础。上述覆盖范围和页面结构风险已明确记录，没有阻断本阶段验收的问题。

**是否建议进入 Phase 4：YES**

本次到 Phase 3 完成后停止，没有启动 Phase 4。
