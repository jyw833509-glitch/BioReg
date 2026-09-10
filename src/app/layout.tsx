import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BioReg Radar · 全球生物药法规情报平台",
  description:
    "Global biologics regulatory intelligence — Phase 1 demonstration",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
