import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "沐尘 | A 股 AI 投研实验室",
  description: "沐尘是面向学习与模拟交易的 A 股 AI 投研工作台。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
