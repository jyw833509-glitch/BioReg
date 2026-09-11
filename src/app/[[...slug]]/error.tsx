"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main>
      <section className="panel">
        <h1>页面暂时无法加载</h1>
        <p>
          暂时无法读取页面数据，请稍后重试。如果问题持续，请联系管理员检查服务日志。
        </p>
        <button className="button primary" onClick={retry}>
          重试加载
        </button>
      </section>
    </main>
  );
}
