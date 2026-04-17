import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AiDoc - AI 문서 도우미",
  description: "AI 문서 도우미 — 내용/표 추출, 요약, 비교, 번역",
  icons: {
    icon: "/aidoc/favicon.svg",
  },
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
