"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <section className="panel">
        <h1>数据库暂不可用</h1>
        <p>
          页面未回退为静态模拟数据。请检查数据库连接，或先运行数据库初始化命令。
        </p>
        <pre>
          npm run db:migrate
          <br />
          npm run db:seed
        </pre>
        <p>请先启动 PostgreSQL，再执行 migration 和 seed。</p>
        <button className="button primary" onClick={reset}>
          重试连接
        </button>
      </section>
    </main>
  );
}
