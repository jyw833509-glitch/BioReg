# Phase 4 Final Status

2026-09-11：**ACCEPTED WITH RUNTIME LIMITATIONS**。

按用户更新后的验收标准收口，进入 Phase 5。先前要求所有来源持续全成功的门槛已被本次明确标准取代。

| 条件 | 验证 |
| --- | --- |
| EMA / CDE 使用 Source Health | 已实现 HEALTHY / DEGRADED / UNAVAILABLE / DISABLED；访问验证映射 DEGRADED，不标为 Connector Failed |
| 拒绝页不入库 | HTTP 202、HTTP 200 Sorry/Access denied 测试通过；CDE 真实请求未写入验证页 |
| Source 互不影响 | 六源实网调度 PARTIAL_SUCCESS，其他五源成功；集成测试通过 |
| 失败不删除历史 | 数据库集成测试验证法规数量与版本不减少；实际 49 条保留 |
| 网络恢复可重试 | 同一 Adapter 的失败→恢复集成测试通过；EMA 本次真实小批量请求恢复成功，无解析器修改 |
| 访问限制分类 | SyncLog.error_kind=RUNTIME_SOURCE_LIMITATION，保留原始错误摘要 |
| 无访问绕过 | 未执行 CAPTCHA、验证码或挑战脚本，没有修改 EMA/CDE 以规避访问策略 |

迁移时 EMA/CDE 旧访问失败均标记为 DEGRADED。随后 2026-09-10 16:39 UTC 的统一调度中，EMA 的已测试小批量请求恢复成功，因此按定义自动转为 HEALTHY；CDE 仍为 DEGRADED。这不意味着 EMA 全站永久可访问。

真实库：FDA 5、EMA 4、NMPA 4、CDE 0、ICH 32、PMDA 4，共 49 条。

## Runtime Source Limitations

- EMA：访问策略存在波动。当前只声明最近有界请求成功，历史拒绝日志保留。
- CDE：指导原则入口仍为 HTTP 202 verification page。恢复后可直接重试；届时若页面结构不同，需基于真实页面验证解析字段。
- NMPA：已接入官方英文 Drugs 栏目，中文主站仍受限。英文更新时间不冒充法规原始发布日期。
- ICH/PMDA：有界栏目覆盖，未提取附件正文；同 URL 二进制变化未检测。

运行环境限制不是自动删除历史、回滚其他 Source 或不断高频重试的理由。后续交付见 PHASE5_REPORT.md。
