const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export interface HtmlClient {
  get(url: string): Promise<{ html: string; url: string }>;
}
export class OfficialClient implements HtmlClient {
  private lastRequest = 0;
  constructor(
    private canonicalUrl: (url: string, base?: string) => string,
    private delay = 1200,
    private timeout = 20000,
    private retries = 2,
  ) {}
  async get(input: string) {
    let url = this.canonicalUrl(input);
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        for (let redirects = 0; redirects <= 5; redirects++) {
          await sleep(
            Math.max(0, this.delay - (Date.now() - this.lastRequest)),
          );
          this.lastRequest = Date.now();
          const response = await fetch(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(this.timeout),
            headers: {
              "User-Agent":
                "BioRegRadar/0.4 (public official source guidance research; sequential low-rate requests)",
              Accept: "text/html, application/json",
            },
          });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            await response.body?.cancel();
            if (!response.headers.get("location") || redirects === 5)
              throw new Error("Invalid official source redirect");
            url = this.canonicalUrl(response.headers.get("location")!, url);
            continue;
          }
          if (!response.ok || response.status === 202) {
            await response.body?.cancel();
            throw new Error(`official source HTTP ${response.status}`);
          }
          const contentType = response.headers.get("content-type");
          if (
            contentType &&
            !/(text\/html|application\/json)/i.test(contentType)
          ) {
            await response.body?.cancel();
            throw new Error("Expected official source HTML");
          }
          const reader = response.body!.getReader();
          const parts: Uint8Array[] = [];
          let size = 0;
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 5_000_000) {
              await reader.cancel();
              throw new Error("official source HTML exceeds size limit");
            }
            parts.push(value);
          }
          const bytes = Buffer.concat(parts);
          const charset =
            response.headers
              .get("content-type")
              ?.match(/charset=([\w-]+)/i)?.[1] || "utf-8";
          const html = new TextDecoder(charset).decode(bytes);
          if (
            /<title[^>]*>\s*(?:Sorry\s*-\s*\d+|Access denied|Request rejected|Just a moment)/i.test(
              html,
            )
          )
            throw new Error(
              "Access denied by official source (HTTP 200 error page)",
            );
          if (
            /captcha|document\.cookie|\$_ts\.lcd/i.test(html) &&
            !/<(?:h1|article)\b/i.test(html)
          )
            throw new Error("Access verification page; no bypass attempted");
          if (!contentType)
            throw new Error("Expected official source Content-Type");
          return { html, url };
        }
      } catch (error) {
        // Do not retry access denials, CAPTCHA or permanent HTTP failures.
        if (
          attempt === this.retries ||
          /HTTP (?:202|4\d\d)|Access verification|Access denied|not an allowed official|Expected official source|size limit|redirect/.test(
            String(error),
          )
        )
          throw error;
        await sleep(1000 * 2 ** attempt);
      }
    }
    throw new Error("official source request failed");
  }
}
