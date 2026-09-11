# Scheduler & Cloud Automation

统一入口：`npm run sync -- all`。复用六个 Phase 4 Adapter，默认 incremental，逐来源顺序执行。不会绕过 EMA/CDE 官网限制。

## 运行命令

```sh
npm run sync:prepare
npm run sync -- all --mode incremental --trigger manual
npm run sync -- cde --mode incremental --trigger manual
npm run sync -- all --mode incremental --due --trigger scheduled
npm run sync -- pmda --mode initial --dry-run
```

`sync:prepare` 执行迁移并幂等初始化六个 Source，不导入 Mock。Initial 只允许显式手动运行；scheduled + initial 会拒绝。Dry-run 不写数据库、不创建任务/SyncLog、不更新时间，预览摘要仅保存本地文件。

limit 默认 8，允许 1–100；工作流使用 8。max-pages 1–4。start-date 只接受完整日期。用户也可用 sync:fda / sync:ema / sync:nmpa / sync:cde / sync:ich / sync:pmda。

## 频率配置

默认值集中在 `src/server/scheduler/config.ts`，首次写入数据库后以 Source.sync_frequency（小时）为准。调整数据库配置即可生效，不用改六套 cron。

| FDA | EMA | NMPA | CDE | ICH | PMDA |
| --- | --- | --- | --- | --- | --- |
| 12h | 12h | 12h | 12h | 24h | 24h |

工作流唯一 cron 为 `17 * * * *`（UTC 每小时第 17 分钟唤醒）。Scheduler 按最近**尝试**时间判断是否到期；失败不会导致每小时重新抓取同源。未到期/禁用/运行中分别记录 SKIPPED_NOT_DUE / SKIPPED_DISABLED / SKIPPED_RUNNING。重新启用 DISABLED 来源会尝试同步。

GitHub schedule 只在默认分支运行，可能延迟；公开仓库长期无活动时可能停用计划任务。它不是精确时钟 SLA。[GitHub 官方说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## GitHub 配置

目标仓库：https://github.com/jyw833509-glitch/BioReg 。配置文件 `.github/workflows/regulatory-sync.yml` 同时支持 schedule 和 workflow_dispatch，下拉选择 all 或单源、incremental/initial、dry-run。

1. 创建长期运行的云端 PostgreSQL，使用 TLS。Scheduler 的 DIRECT_URL 必须为直连或 session pooling；不能使用 transaction pooling，因为重复任务保护需要固定 PostgreSQL 会话。
2. 在仓库 Settings → Secrets and variables → Actions → Secrets 设置 **DIRECT_URL**。不要提交 .env.local，不要在聊天中粘贴凭据。
3. 将 Next.js 网页部署到支持 Node.js 24 的托管环境（或容器），配置指向**同一个数据库**的 DATABASE_URL（Netlify 使用 Supabase Transaction Pooler 6543），设置 NODE_ENV=production。安装/构建使用 npm ci / npm run build，启动 npm start。
4. 先手动运行 Regulatory Sync，检查逐源摘要与数据库数据。只有代码验证工作流通过，不代表真实法规已在云端运行。
5. 在仓库 Variables 设置 **REGULATORY_SYNC_ENABLED=true** 开启计划任务。未设置时计划任务跳过，手动执行仍可用。

当前用户尚未创建云数据库和网页托管。上述是可执行配置，不是已上线声明。需要两者实际部署后验证“电脑关闭仍运行”。本地数据库不能作为关闭电脑后的云端数据源。

## 健康与结果

Source.last_status 保存健康状态；last_sync_at 为最近尝试开始时间，last_success_at / last_failure_at 为最近成功/失败完成时间。

- HEALTHY：最近有界同步成功。
- DEGRADED：部分失败或访问验证/拒绝；即使某次全部请求被验证阻挡，也按运行环境限制标记 DEGRADED。
- UNAVAILABLE：当前核心链路全部失败，如持续网络连接失败或解析无法工作；error_kind 区分 Runtime Source Limitation、Connector Error、Database Error。
- DISABLED：配置关闭，不进行采集。

SyncLog 的 SUCCESS/PARTIAL_SUCCESS/FAILED 是**执行结果**，不是 Connector 健康标签。失败不会删除历史。恢复后直接再次调用原入口，成功将自动更新 Health。

全局 SyncJob 保存 Job ID、触发方式、模式、开始/结束、状态及逐源摘要。摘要包括 Duration、Found/New/Updated/Failed、Health、Error kind、脱敏错误。Dashboard 显示 Last Global Sync、健康汇总与最新结果；Agencies 显示健康、最近尝试/成功/失败、记录数。

CLI 退出码：0=SUCCESS/SKIPPED，2=PARTIAL_SUCCESS，1=FAILED/配置错误。GitHub 对 2 输出 warning 和摘要并保留成功源结果，只有 1 导致失败。不能因允许 degraded 就把所有来源均失败改成成功。

## 锁、失败与保留策略

GitHub concurrency 使用同一 group 且 cancel-in-progress=false。另有数据库全局 Scheduler 锁及逐源会话锁；旧兼容入口也受逐源锁保护。锁在 finally 释放，进程终止后由 PostgreSQL 释放。下一次任务会将遗留 RUNNING 任务和未完成日志标记为中断，然后重试。

每次请求前后确认锁连接仍存在，写入前再次确认。HTTP 超时 20 秒，临时错误最多两次指数退避；202/403/412/429、verification、CAPTCHA、access denied 不高频重试。工作流最多 40 分钟，超时属于运行失败，下一轮会恢复锁/日志状态。

当前不自动删除数据库日志。建议今后归档后保留 SyncLog/SyncJob 90 天，长期保留按日汇总；不删除 Regulation/Version。Actions 摘要 artifact 保留 30 天。未来清理需独立审核及备份，不在 Phase 5 默认运行。

## 验证

`npm test`、`npm run lint`、`npm run typecheck`、`npm run build`、`npm run test:smoke`。`test:sources:web` 需要已启动的正式应用及真实同步记录。

`.github/workflows/ci.yml` 使用一次性的 PostgreSQL service 验证代码，不连接生产数据库、不访问监管官网；测试数据库不属于法规云端持久化方案。

`check:sources` 保留为严格健康诊断：可能因 DEGRADED/数据缺失返回 FAIL，但不再作为 Phase 4 新标准的阻断门槛。

本阶段没有 AI、通知、全文 diff、多用户权限或 Agent。完成 Phase 5 后停止，不进入 Phase 6。
