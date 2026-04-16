import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AiDoc",
  description: "AI 문서 도우미 — 내용/표 추출, 요약, 비교, 번역",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
