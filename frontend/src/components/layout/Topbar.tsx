"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";

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
  const [initial, setInitial] = useState("?");

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.user_name) {
          let v = data.user_name;
          for (let i = 0; i < 5; i++) {
            try { const d = decodeURIComponent(v); if (d === v) break; v = d; } catch { break; }
          }
          setInitial(v.charAt(0) || "?");
        }
      })
      .catch(() => {});
  }, []);

  const crumb = BREADCRUMBS[pathname ?? ""] ?? ["Workspace", ""];
  const [section, page] = crumb;

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
      {/* Breadcrumb */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span style={{ color: "#8A9199" }}>{section}</span>
        <span style={{ color: "#D0CEC6", fontSize: 11 }}>／</span>
        <span style={{ color: "#0F1419", fontWeight: 500 }}>{page}</span>
      </div>

      {/* User avatar (TODO: dropdown) */}
      <div
        title="사용자 메뉴"
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "#EEF1FF",
          color: "#2740C7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {initial}
      </div>
    </div>
  );
}
