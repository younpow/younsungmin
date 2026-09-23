import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "윤성민 — Yoon Sungmin",
  description: "생각하고, 만들고, 기록하는 윤성민의 공간.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
