# Phase 5 Production Acceptance

验收更新：2026-09-11。

## Phase 5 Status

**PARTIAL**。正式数据库、网页、手动同步及自然 cron 均已运行；用户报告过正式网页加载失败，当前复查正常，但根因尚未确认。不能用 cron 成功代替网页故障诊断。

## Production Database

平台：Supabase PostgreSQL，bioreg-production，Seoul。
状态：正式健康接口返回 PostgreSQL / Prisma 正常。
Migration：GitHub Actions 的 sync:prepare 成功，六 Source 配置存在；未运行 Mock seed。

## Web Hosting

平台：Netlify，官方自动 Next.js/OpenNext 适配。
Production URL：https://creative-starship-b64072.netlify.app
Deployment Status：已公开发布。首页、Today、Regulations、真实 Detail、Updates、Agencies、Reports、AI Tools 已返回正常页面；用户另报告过一次错误页，持续稳定性尚未验收。

## GitHub Actions

Manual Sync：https://github.com/jyw833509-glitch/BioReg/actions/runs/34563604541
六源均执行，总结果 PARTIAL_SUCCESS；CDE HTTP 202 不影响其他来源。

Scheduled Sync：https://github.com/jyw833509-glitch/BioReg/actions/runs/34593298261
自然触发时间：2026-09-11 11:17:31 UTC（北京时间19:17:31）。Workflow 成功；数据库迁移及配置检查成功；trigger=scheduled，六源均为 SKIPPED_NOT_DUE，全局 SKIPPED。这证明自然调度和数据库连通；本次未发生到期抓取，不应声称新增法规。12/24小时频率及原工作流不变。
REGULATORY_SYNC_ENABLED=true 已核实。

## Source Health

FDA：HEALTHY；EMA：HEALTHY；NMPA：HEALTHY；CDE：DEGRADED；ICH：HEALTHY；PMDA：HEALTHY。
正式 SyncLog 可读取六源状态，成功及失败时间均已保留。

## Production Data

最近核实真实 Regulation 数量：38（FDA 8、EMA 8、NMPA 6、CDE 0、ICH 8、PMDA 8）。正式接口返回真实记录，未回退模拟数据。

## Security

DATABASE_URL：用户分别在 GitHub Secret 和 Netlify Environment Variables 配置，未提供到聊天或写入仓库。部署配置不包含凭据，未发现已检查提交泄露真实凭据。未读取生产 Secret 值。

## Tests

此前 CI：Tests、Lint、Typecheck、Build、Smoke 全部通过。错误页修订的构建结果另以对应 CI 为准。

## Remaining Limitations

- 网页间歇加载失败的原始服务端日志尚未取得，不能宣称根因已解决。
- 错误页已在工作区修正：删除迁移/Mock seed 指令；改用 Next.js 16.3 retry() 重新获取服务端页面数据；不再把所有页面异常误称为数据库故障。须验证修订部署。
- 首次自然运行尚未到抓取间隔，六源按设计跳过。下一次到期抓取应另核实。
- CDE 官网访问限制及 NMPA 官方英文覆盖范围保持原有限制。

## Phase 6 Readiness

当前先完成网页故障排查和修订部署验证，不进入 Phase 6。需要查看 Netlify 对应失败请求的函数日志；不要提供密码、连接字符串或 Token。
