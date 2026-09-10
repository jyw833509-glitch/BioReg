# Regulatory Sources — Phase 4

最新复验：2026-09-10。**Phase 4 ACCEPTED WITH RUNTIME LIMITATIONS；Phase 5 调度说明见 README_SCHEDULER.md**。真实库共 49 条：FDA 5、EMA 4、NMPA 4、CDE 0、ICH 32、PMDA 4。

## 来源与当前范围

| 来源 | 官方入口 | 当前状态 |
| --- | --- | --- |
| FDA | [近期生物制品指导文件](https://www.fda.gov/vaccines-blood-biologics/biologics-guidances/recently-issued-guidance-documents) | 原有 5 条真实数据，回归正常 |
| EMA | [生物制品成品](https://www.ema.europa.eu/en/human-regulatory-overview/research-and-development/scientific-guidelines/biological-guidelines/biologicals-finished-product)、[生物类似药](https://www.ema.europa.eu/en/human-regulatory-overview/research-development/scientific-guidelines/multidisciplinary-guidelines/multidisciplinary-guidelines-biosimilar) | 目录结构确认；曾出现 HTTP 200 / Sorry 拒绝页；最新调度小批量请求恢复成功，仍保留运行限制说明 |
| NMPA | [官方英文 Drugs 栏目](https://english.nmpa.gov.cn/drugs.html) | dry-run、初始、增量成功，4 条；中文主站仍为 HTTP 412，不能声称覆盖中文公告全量 |
| CDE | [指导原则](https://www.cde.org.cn/zdyz/index) | 栏目、详情、官网业务脚本公布的站内搜索接口均返回 HTTP 202 验证页；0 条真实数据 |
| ICH | [Q](https://www.ich.org/page/quality-guidelines)、[S](https://www.ich.org/page/safety-guidelines)、[E](https://www.ich.org/page/efficacy-guidelines)、[M](https://www.ich.org/page/multidisciplinary-guidelines) | 官方公开 JSON；14 指南、15 概念文件、3 Q&A；重复同步无新增、无虚假版本 |
| PMDA | [Biosimilars](https://www.pmda.go.jp/english/review-services/reviews/0005.html)、[Regenerative Medical Products](https://www.pmda.go.jp/english/review-services/reviews/0003.html) | 列表元数据与日英附件，4 条；初始/增量通过 |

## 命令

~~~sh
npm run db:local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run sync:nmpa -- --mode initial --dry-run --limit 4
npm run sync:nmpa -- --mode initial --limit 4
npm run sync:nmpa -- --mode incremental --limit 4
npm run sync:ich -- --mode incremental --limit 32
npm run sync:ema -- --mode incremental --limit 8
npm run sync:pmda -- --mode incremental --limit 4
npm run sync -- all --mode incremental --limit 4
npm run check:sources
~~~

六源独立命令为 sync:fda / sync:ema / sync:nmpa / sync:cde / sync:ich / sync:pmda。旧库也要运行 migrate 与幂等 seed，以初始化 PMDA Source；原法规与版本不被覆盖，不制造 PMDA Mock 记录。

默认 incremental、limit=8（1–100），max-pages=1–4；EMA/PMDA 各两个入口，ICH 四类，其他来源一个。start-date 仅接受完整 YYYY-MM-DD；精度不足的日期不补造。请求顺序执行、间隔 1200ms、20 秒超时；仅对暂时性失败最多两次指数退避。只允许对应官方主机，限制重定向和 5 MB 响应体。验证页、拒绝页及永久失败不重试、不执行验证脚本。

Dry-run 不写 Regulation、Version、Source、SyncLog 或检查时间。正式同步每源独立日志。同源的单个栏目失败不阻断其余栏目，但最终为 PARTIAL_SUCCESS；不能以成功栏目掩盖失败栏目。全部失败为 FAILED。all 模式继续运行其他源，存在失败时 CLI 非零退出。

## 字段与去重

公共能力在 src/server/connectors/shared；各源独立 config/client/parser/mapper/normalizer。所有来源共享 Regulation、Version、Writer 和 Source/SyncLog。

- NMPA 英文文章保存官方正文、摘要、文号（有明确编号的公告）、更新日期、语言和发布渠道。Updated 仅作为英文网页更新时间，不冒充原始法规发布日期；title_zh 留空。中文解析器保留，但目前仅合成 fixture 验证。未自动翻译或伪造标题。
- EMA 保存官方标题、文号、状态、日期、附件及可用简介；Current effective→EFFECTIVE，Adopted→FINAL。无法读取的拒绝页不入库。
- CDE 表格解析器保留名称、明确版本状态、日期、适用范围、专业分类和附件。尚未通过真实页面验证。
- ICH 主指南采用稳定系列代码去重，完整 Rn 代码与 adoption 日期原文保留。Concept/Reflection/Q&A 附加文件独立 canonical URL，不使用主指南文号，不继承主指南 Step、采用日期或法律状态。培训、演讲、工作计划不入库。
- PMDA Related Guidelines 栏目才入库；同条日英附件合并，保存语言、原文及翻译说明。英文仅供参考，日文原文优先。状态不明为 UNKNOWN，缺少完整日期保持 null。

按 source_id + is_mock 隔离。相同 canonical URL / 文号优先匹配；无强标识才用标题与完整日期辅助。有变化事务内追加不可变历史，未变化仅刷新检查时间和规则标签，不制造新版本。

生产模式默认隐藏 Mock，包括统计、列表、详情和版本 API；明确开发预览可设 BIOREG_INCLUDE_MOCK_DATA=true。

## 测试与预检

~~~sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:smoke
npm run test:sources:web
npm run check:sources
~~~

47 项默认测试不访问监管官网，数据库使用独立 PostgreSQL schema。真实同步必须显式执行 CLI。

check:sources 是只读本地前置检查：六源启用且有真实记录、最近连续两次非空正式同步均 SUCCESS、最近完成时间不超过 24 小时、真实记录有来源 URL/哈希/版本。Mock 日志、部分成功和过期记录不能使其通过。结果 FAIL 返回退出码 1，是验收未过，不是程序崩溃。该检查不替代目标云环境网络验收，仅作严格健康诊断；新验收标准允许 Runtime Source Limitations，Phase 5 Scheduler 见 README_SCHEDULER.md。

## 未解决限制

1. CDE 的列表、详情、公开搜索均受访问验证限制；必须提供合法可访问的官方接口或运行环境后完成真实链路，不能以搜索摘要或首页通知标题凑入库数。
2. EMA 最新出现 HTTP 200 拒绝页面，需要恢复稳定访问，再对配置入口完成连续两次成功同步。
3. NMPA 英文站为已验证的有限范围，尚不能替代中文原站全量覆盖。
4. 不下载附件正文；附件同 URL 二进制变化不会被当前哈希发现。PMDA/ICH 无文号的附加文件换 URL 可能需要后续修订关联。

完整验收与阻塞证据见 PHASE4_REPORT.md。Phase 5 的代码与部署验收见 PHASE5_REPORT.md。
