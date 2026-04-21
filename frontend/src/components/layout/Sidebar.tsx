"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AccessCheck } from "@/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";

const Icon = ({ d, size = 15 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const MENU = [
  { label: "홈",      href: "/home",           icon: "M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z M9 21V12h6v9" },
  { label: "내용 추출", href: "/extract/content", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" },
  { label: "표 추출",  href: "/extract/table",   icon: "M3 3h18v18H3V3z M3 9h18 M3 15h18 M9 3v18 M15 3v18" },
  { label: "문서 요약", href: "/summary",         icon: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" },
  { label: "PDF 비교", href: "/compare",          icon: "M18 20V10 M12 20V4 M6 20v-6" },
  { label: "번역",    href: "/translate",         icon: "M5 8l6 6 M4 14l6-6 2-2 M2 5h12 M7 2h1 M22 22l-5-10-5 10 M14.5 18h5" },
  { label: "관리자",  href: "/admin/history",     icon: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z", adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [userName, setUserName] = useState("사용자");

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then(r => r.json())
      .then((data: AccessCheck) => {
        setAccess(data);
        if (data.user_name) {
          let v = data.user_name;
          for (let i = 0; i < 5; i++) {
            try { const d = decodeURIComponent(v); if (d === v) break; v = d; } catch { break; }
          }
          setUserName(v);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch(`/aidoc/api/auth/sso/logout`, { method: "POST" });
    window.location.href = "/";
  };

  return (
    <aside style={{
      width: 240,
      background: "var(--bg-sidebar)",
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      display: "flex", flexDirection: "column",
      zIndex: 100,
    }}>
      {/* 로고 */}
      <div style={{ padding: "22px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#6366f1,#818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "white",
          }}>A</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", lineHeight: 1.2 }}>AiDoc</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>AI 문서 도우미</div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 18px 8px" }} />

      {/* 메뉴 */}
      <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
        {MENU.map(item => {
          if (item.adminOnly && !access?.is_admin) return null;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 11px",
              borderRadius: 8,
              textDecoration: "none",
              color: isActive ? "white" : "#64748b",
              background: isActive ? "rgba(99,102,241,0.2)" : "transparent",
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              marginBottom: 1,
              transition: "background 0.12s, color 0.12s",
              borderLeft: isActive ? "2px solid #818cf8" : "2px solid transparent",
            }}>
              <Icon d={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 18px" }} />

      {/* 사용자 */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0,
          }}>
            {userName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            {access?.is_admin && <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 600 }}>관리자</div>}
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: "100%", padding: "6px 0",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 7, color: "#475569",
          fontSize: 12, cursor: "pointer", transition: "all 0.15s",
        }}>로그아웃</button>
      </div>
    </aside>
  );
}
