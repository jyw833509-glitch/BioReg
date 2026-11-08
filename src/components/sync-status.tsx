import type { LogView } from "@/lib/view-types";
import { syncStatusLabel } from "@/lib/sync-status";
export function SyncStatus({ logs, kind }: { logs: LogView[]; kind: string }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>同步日志</h2>
        <span className="badge green">
          {kind === "postgres" ? "PostgreSQL" : "Database"} · 已连接
        </span>
      </div>
      <p>
        下列状态为各来源抓取结果。任务执行完成不代表所有入口均可访问；部分成功会保留已入库文件及失败原因。
      </p>
      {logs.length ? (
        <div className="sync-table-wrap">
          <table className="sync-table">
            <thead>
              <tr>
                <th>来源</th>
                <th>时间（UTC）</th>
                <th>状态</th>
                <th>发现</th>
                <th>新增</th>
                <th>更新</th>
                <th>失败</th>
                <th>失败原因与范围</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.source}</td>
                  <td>{log.started_at.slice(0, 19).replace("T", " ")}</td>
                  <td>
                    {syncStatusLabel(log.status)} · {log.status}
                    {log.is_mock && <small>Development / Mock Data</small>}
                  </td>
                  <td>{log.records_found}</td>
                  <td>{log.records_new}</td>
                  <td>{log.records_updated}</td>
                  <td>{log.records_failed}</td>
                  <td>
                    {log.error_message ? (
                      <details>
                        <summary>查看受影响入口</summary>
                        <p
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {log.error_message}
                        </p>
                      </details>
                    ) : (
                      "无"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>尚无同步日志。</p>
      )}
    </section>
  );
}
