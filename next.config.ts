import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["pg", "pdfkit"],
  outputFileTracingIncludes: {
    "/api/reports": ["./assets/fonts/NotoSansSC.ttf"],
  },
  // Public site origin only; no credentials. Netlify rewrites runtime URLs to deploy permalinks.
  env: {
    // Public Git identity only; never put database variables in bundled env.
    BIOREG_BUILD_COMMIT: process.env.COMMIT_REF || "local",
    BIOREG_SITE_ORIGIN:
      process.env.NETLIFY === "true" ? process.env.URL || "" : "",
  },
};
export default config;
