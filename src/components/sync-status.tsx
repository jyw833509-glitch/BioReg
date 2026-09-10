import type { LogView } from "@/lib/view-types";
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
        Development / Mock Data：种子日志仅演示数据结构，不代表已访问监管网站。
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
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.source}</td>
                  <td>{log.started_at.slice(0, 19).replace("T", " ")}</td>
                  <td>
                    {log.status}
                    {log.is_mock && <small>Development / Mock Data</small>}
                  </td>
                  <td>{log.records_found}</td>
                  <td>{log.records_new}</td>
                  <td>{log.records_updated}</td>
                  <td>{log.records_failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>尚无同步日志。真实来源将在后续阶段接入。</p>
      )}
    </section>
  );
}
