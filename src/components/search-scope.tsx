import { officialSearchSources, officialSearchUrl } from "../lib/search";
export type SearchCoverage = {
  code: string;
  status: string;
  lastSync: string | null;
  lastSuccess: string | null;
  documents: number;
  discovered: number;
};
export function SearchScope({
  query,
  source,
  coverage,
}: {
  query: string;
  source?: string;
  coverage: SearchCoverage[];
}) {
  return (
    <section className="panel">
      <h2>官方法规、指南与药典资料检索</h2>
      <p>
        已入库结果覆盖已采集的历史与当前文件，不要求近期发生变更。检索标题、编号、摘要及实际取得的正文；支持有限的中英文同义词。未采集的
        PDF 正文和订阅正文不在全文检索范围内，不代表全量覆盖。
      </p>
      <details>
        <summary>检索范围、最近同步及来源状态</summary>
        {officialSearchSources.map((s) => {
          const c = coverage.find((c) => c.code === s.code);
          return (
            <p key={s.code}>
              <strong>{s.name}</strong> · {s.scope}
              <br />
              已入库 {c?.documents ?? 0} · 已发现目录链接 {c?.discovered ?? 0} ·{" "}
              {c?.status ?? "未同步"}
              <br />
              最近尝试：{c?.lastSync ?? "未同步"} · 最近成功：
              {c?.lastSuccess ?? "未成功同步"}
            </p>
          );
        })}
      </details>
      <details>
        <summary>官网扩展检索（官方入口，不是已检出的文件）</summary>
        <p>
          当前不聚合实时官网结果。以下仅为官方检索／目录入口，不计入已入库结果数量。FDA、EMA
          可带入关键词；其余入口需在官网继续输入。USP–NF、Ph. Eur.
          受限正文请在官网使用已获授权的账户登录。
        </p>
        <div className="tags">
          {officialSearchSources
            .filter((s) => !source || s.code === source)
            .map((s) => (
              <a
                className="button"
                key={s.code}
                href={officialSearchUrl(s.code, query)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.name} 官网入口 ↗
              </a>
            ))}
        </div>
      </details>
    </section>
  );
}
