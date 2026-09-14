# BioReg Radar V1.0.0

全球生物药法规情报工作区：官方法规采集、结构化查询、变化追踪、历史版本、关注规则、站内通知、每日摘要、外部 AI 提示词与报告导出。

## Architecture

GitHub → GitHub Actions Regulatory Sync → Supabase PostgreSQL → Netlify + Next.js → BioReg Web。网页运行与同步任务相互独立，电脑关闭不影响云端任务。Prisma 7 + adapter-pg；Web global singleton，连接池 max=1，查询避免无界并行。没有 Redis、消息队列、AI API 或额外服务器。

支持 FDA / EMA / NMPA / CDE / ICH / PMDA；NMPA 英文官方站与 CDE 分开。CDE 可能受验证机制影响而 DEGRADED，不能因此阻塞其他来源。

## Modules

- Dashboard / Today / Regulations：真实数据库查询，分页与多条件筛选。
- Change Detection / Version History：元数据、哈希、可用文本及分节差异，保留不可变快照。
- Watchlist：可解释的确定性匹配；Notifications：持久化、去重、已读状态；Daily Digest：按配置时区逻辑日期生成，重复运行不重复创建。
- AI Tools：DeepSeek、Doubao、Qwen、Kimi；复制 Prompt 后用户自行打开官方平台。12 个模板，三种语言、三档上下文、截断提示；不使用私人 API Key、不登录第三方、不回写官方事实。
- Reports：法规、变化、版本比较、Digest、Watchlist、情报汇总、来源健康，以及 Versions/Notifications CSV。支持中文可搜索 PDF 和 UTF-8 BOM CSV；数据只读，报告有界，不保存二进制到数据库。

## Local development

Node.js 24 / npm 11。运行 npm ci、npm run db:local、npm run db:migrate、npm run db:seed、npm run dev。开发 seed 仅用于隔离开发库，禁止对生产执行 mock seed。

Windows 原生开发 PostgreSQL 存于 LocalAppData 的独立英文路径，监听 127.0.0.1:55432，凭据只写入忽略文件 .env.local / .data。npm run db:stop 停止但不删除数据。其他系统可配置自己的 PostgreSQL。

## Environment / deployment

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Netlify Web runtime：Supabase 官方 Transaction Pooler 6543；只在托管环境变量管理 |
| DIRECT_URL | Prisma CLI / migration / GitHub Actions sync：Direct 或 Session Pooler 5432；只在 Secrets 管理 |
| TEST_DATABASE_URL | 可选隔离测试 PostgreSQL；测试只创建/删除自己的随机 schema |
| APP_ORIGIN | 可选显式可信站点 origin；Netlify 自动使用公开 URL，不能放 Secret |
| BIOREG_INCLUDE_MOCK_DATA | 生产设 false；开发才能显式启用 |

netlify.toml 使用官方 Next.js/OpenNext 自动适配，npm run build，发布 .next。字体随 reports function 打包，PDF 不依赖外部字体网络。Prisma schema 由现有 GitHub sync:prepare/migration 维护，不在 Netlify runtime 执行 migration。TLS 验证不关闭。

## Scheduler / timezones

现有 GitHub cron 为每小时 UTC 第 17 分钟，可能受 GitHub 延迟影响。REGULATORY_SYNC_ENABLED 仓库变量控制自然运行；workflow_dispatch 可按需手动增量同步。GitHub concurrency 和数据库 advisory lock 防止重叠，未到抓取周期正常返回 SKIPPED_NOT_DUE。SyncJob、SyncLog、Source Health 和 summary artifact 可诊断结果。

Digest 默认 Asia/Shanghai 08:00 后生成上一完整逻辑日；报表 start/end 是 UTC 日期（end 当天包含在内），Digest 报表筛选已保存的 digest_date，正文保留其 timezone/window。

## Evidence / security

Official Fact ≠ BioReg Translation ≠ BioReg System Summary ≠ External AI Interpretation。空字段不推断；CAPTCHA、验证/拒绝/登录/错误页面不能作为法规。CSV 防公式注入；外部链接仅官方 HTTPS。API 错误不返回 stack/连接串，带 code、message、request_id、timestamp。凭据禁止入 Git、浏览器和日志。

现有产品是共享工作区，并非私有多租户权限系统；不要录入敏感内部材料。用户第三方账号属于用户，平台不保存密码、Cookie 或 AI Secret。

## Validation / observability

npm run lint、npm run typecheck、npm test、npm run build、npm run test:smoke。HTTP smoke 在独立 schema 中验证真实服务和数据只读性。/api/health 区分应用/数据库与单来源状态，CDE DEGRADED 不等于系统 DOWN。生产日志结合 request_id、run ID、SyncJob ID 定位；只记录安全字段。

## Known limitations / recovery

完整 PDF 深度解析未覆盖所有文档；正文比较仅针对已有抓取/解析文本，不能声称所有 PDF 内容均已比较。真实变化样本可能暂缺，测试库提供覆盖，禁止制造生产变化。报告最大 100 行、每条法规最多 20 个历史/事件；超大报告需缩小范围。PPTX 暂不实现。外部 AI 准确性和第三方可用性不由 BioReg 保证。

Free 数据库不假设可下载的自动备份或 PITR；应由管理员将逻辑备份加密保存于受控私有位置。迁移和重新同步不能恢复丢失的历史证据或用户状态。详见 [Recovery Runbook](RECOVERY_RUNBOOK.md)。

验收报告：[Phase 9](PHASE9_REPORT.md)。发布说明：[Release Notes](RELEASE_NOTES.md)。来源细节：[Source Guide](README_SOURCES.md)。前序阶段验收记录作为历史证据保留，以当前 README/Recovery Runbook 的生产配置为准。
