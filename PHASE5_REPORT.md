# Phase 5 — Scheduler & Cloud Automation

验收日期：2026-09-11。

## Project Status

**Partial Success**：调度、Source Health、日志、锁、网页展示及 GitHub Actions 配置已实现；本地实网与测试通过。云 PostgreSQL 和网页托管尚未创建，所以“用户电脑关闭仍采集并更新网页”尚未完成实地验收。

## Phase 4 Final Status

**ACCEPTED WITH RUNTIME LIMITATIONS**。EMA/CDE 访问验证按 DEGRADED 处理，不称为 Connector Failed。拒绝页不入库、来源隔离、失败保留历史、同 Adapter 恢复后重试均有测试。未绕过访问控制。详见 PHASE4_REPORT.md。

## Scheduler

统一 runScheduler → syncSource → 原有 Adapter/Writer。默认 incremental、并发为 1；显式手动才能 initial。Source.sync_frequency 为可配置间隔，默认 FDA/EMA/NMPA/CDE 12h，ICH/PMDA 24h。已禁用、未到期、已有任务运行会跳过。

## GitHub Actions

- 目标仓库： https://github.com/jyw833509-glitch/BioReg
- regulatory-sync.yml：唯一 cron 每小时 UTC 第17分钟唤醒，Scheduler 判断到期来源；workflow_dispatch 支持 all/六源、模式和 dry-run。
- DATABASE_URL 使用 GitHub Secrets；REGULATORY_SYNC_ENABLED=true 是启用计划任务的配置开关。
- 统一并发组不取消旧任务；超时40分钟。CLI 0/2/1 区分成功/部分成功/失败，部分成功产生 warning 和逐源摘要，不回滚其他来源。
- ci.yml：在一次性 PostgreSQL service 上测试，不作为云端持久化数据库。
- 当前代码与工作流已准备；真实数据库 Secret、云网页及计划任务启用仍待配置。

## Source Status

2026-09-10 16:39 UTC 的实际小批量统一调度，Job cmtvr5zi10000mccwbcktgl5m，耗时18.5秒：

| Source | Health | Found | New | Updated | Failed | 实际记录总数 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| FDA | HEALTHY | 1 | 0 | 0 | 0 | 5 |
| EMA | HEALTHY（本次请求恢复） | 1 | 0 | 0 | 0 | 4 |
| NMPA | HEALTHY（官方英文范围） | 1 | 0 | 0 | 0 | 4 |
| CDE | DEGRADED | 0 | 0 | 0 | 1 | 0 |
| ICH | HEALTHY | 1 | 0 | 0 | 0 | 32 |
| PMDA | HEALTHY | 1 | 0 | 0 | 0 | 4 |

Global Status：**PARTIAL_SUCCESS**。EMA 原先 DEGRADED，此次正常请求成功后自动恢复 HEALTHY；这只代表最近有界检查，不宣称全站持续可访问。CDE 的 HTTP 202 标记为 Runtime Source Limitation。

## Automated Sync

本地统一入口可运行，GitHub workflow 已实现。**目前不能确认电脑关闭后仍运行**：用户明确表示云数据库和网页托管尚未创建。没有将本地 PostgreSQL 或 CI 临时数据库冒充云端正式数据源。部署与启用步骤见 README_SCHEDULER.md。

## Sync Isolation / Logs / Lock

单源失败不回滚其他来源；失败不删除 Regulation/Version。SyncLog 与 SyncJob 分别保存源执行和全局任务。Source 保存最近尝试、成功、失败、健康状态。数据库会话锁同时保护全局任务和单来源，退出释放；中断任务下一次标记失败并恢复。

验证页不重试；暂时性网络问题有超时和有限指数退避。生产凭据不输出日志，不提交 .env.local。尚未启用数据库日志自动删除；预留90天归档保留策略，Actions artifact 保留30天。

## Dashboard

已增加 Last Global Sync、Source Health Summary、Healthy Sources、Degraded Sources、Latest Sync Result。来源页增加 Health、Last Sync、Last Successful Sync、Last Failure、官方记录数。DEGRADED 仍可查看历史法规。浏览器实际检查小屏布局与摘要，HTTP 检查六源筛选/详情与 Mock 隐藏通过。

## Tests

- 55 项测试通过，包括调度状态映射、频率、六源隔离、失败不删除、同 Adapter 恢复、数据库锁、禁用/未到期跳过、dry-run 零写入、拒绝页识别和有限重试。
- Lint / Typecheck / Build：通过。
- 生产 HTTP 页面检查与原 smoke：通过。
- 云端真实 schedule/dispatch 与云网页数据库联动：尚未验收，不以本地通过替代。

## Known Issues

1. 云 PostgreSQL、网页托管和 GitHub Secrets 尚未创建/配置。
2. EMA/CDE 的访问策略在不同运行环境中可能变化，按 Health 如实记录；不绕过。
3. NMPA 目前仅官方英文范围，CDE 真实法规仍为0。
4. 会话锁要求直连或 session pooling，不支持 transaction pooling。
5. GitHub schedule 可能延迟或因仓库长期无活动停用；不是精确时刻 SLA。
6. 原有单用户关注规则没有新增复杂权限；云网页应选择与预期访问范围相符的托管设置。

## Files Created / Modified

- src/server/scheduler/{config,health,lock,run}.ts
- src/server/connectors/shared/sync.ts、src/server/db.ts
- prisma/schema.prisma、202609100004_scheduler migration
- scripts/sync.ts、scripts/prepare-sync.ts、package.json
- .github/workflows/regulatory-sync.yml、.github/workflows/ci.yml
- src/server/page-data.ts、dashboard repository、view-types、workspace.tsx、globals.css、health API
- tests/scheduler.test.ts、database.test.ts、official-client.test.ts、sources-web.ts
- README_SCHEDULER.md、PHASE4_REPORT.md、PHASE5_REPORT.md 及现有说明更新

## Phase 6 Readiness

**是否建议进入 Phase 6：NO。**

必须先创建长期云数据库并设置 GitHub Secret，部署网页指向同库，手动执行一次真实云同步，开启计划任务并核对至少一次计划运行结果。按实际情况允许 DEGRADED；不再要求绕过访问限制或全部来源持续 HEALTHY。

本次停止在 Phase 5，没有进入 Phase 6。
