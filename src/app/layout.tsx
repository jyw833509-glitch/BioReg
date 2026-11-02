import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BioReg Radar · 全球生物药法规情报平台",
  description:
    "全球生物药法规情报：官方来源、版本追踪、每周同步与可追溯汇总",
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
