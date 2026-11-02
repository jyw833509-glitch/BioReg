export default function Loading() {
  return (
    <main className="route-loading" aria-busy="true" aria-live="polite">
      <section className="panel">
        <h1>正在打开模块…</h1>
        <p>正在读取法规数据，请稍候。</p>
      </section>
    </main>
  );
}
