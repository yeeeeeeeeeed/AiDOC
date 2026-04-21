"use client";

import { usePathname } from "next/navigation";

const BREADCRUMBS: Record<string, [string, string]> = {
  "/home":            ["Workspace", "홈"],
  "/extract/content": ["Workspace", "내용 추출"],
  "/extract/table":   ["Workspace", "표 추출"],
  "/summary":         ["Workspace", "문서 요약"],
  "/compare":         ["Workspace", "PDF 비교"],
  "/translate":       ["Workspace", "번역"],
  "/admin/history":   ["Admin", "이용 기록"],
  "/admin/tokens":    ["Admin", "토큰 사용량"],
  "/admin/visitors":  ["Admin", "방문자 로그"],
  "/admin/limits":    ["Admin", "사용 한도"],
};

export default function Topbar() {
  const pathname = usePathname();
  const [section, page] = BREADCRUMBS[pathname ?? ""] ?? ["Workspace", ""];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 248,
        right: 0,
        height: 56,
        background: "#FFFFFF",
        borderBottom: "1px solid #EBE8E0",
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span style={{ color: "#8A9199" }}>{section}</span>
        <span style={{ color: "#D0CEC6", fontSize: 11 }}>／</span>
        <span style={{ color: "#0F1419", fontWeight: 500 }}>{page}</span>
      </div>
    </div>
  );
}
