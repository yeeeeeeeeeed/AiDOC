"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AccessCheck } from "@/types";
import { getCookie } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/aidoc";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
}

const MENU: MenuItem[] = [
  { label: "홈", href: "/home", icon: "□" },
  { label: "내용 추출", href: "/extract/content", icon: "⊞" },
  { label: "표 추출", href: "/extract/table", icon: "⊟" },
  { label: "문서 요약", href: "/summary", icon: "≡" },
  { label: "PDF 비교", href: "/compare", icon: "⊜" },
  { label: "번역", href: "/translate", icon: "⇄" },
  { label: "이력 관리", href: "/admin/history", icon: "⊙", adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [userName, setUserName] = useState("사용자");

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json())
      .then(setAccess)
      .catch(() => {});

    const raw = getCookie("AXI-USER-NAME");
    if (raw) setUserName(decodeURIComponent(raw));
  }, []);

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/sso/logout`, { method: "POST" });
    window.location.href = "/";
  };

  return (
    <aside
      style={{
        width: 260,
        background: "var(--bg-sidebar)",
        color: "var(--text-sidebar)",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>AiDoc</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>AI 문서 도우미</div>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {MENU.map((item) => {
          if (item.adminOnly && !access?.is_admin) return null;
          const fullHref = item.href;
          const isActive = pathname === fullHref || pathname?.startsWith(fullHref + "/");
          return (
            <Link
              key={item.href}
              href={fullHref}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 6,
                textDecoration: "none",
                color: isActive ? "white" : "#9ca3af",
                background: isActive ? "rgba(37, 99, 235, 0.3)" : "transparent",
                fontSize: 14,
                marginBottom: 2,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "#9ca3af" }}>접속: </span>
          {userName}
          {access?.is_admin && (
            <span
              style={{
                marginLeft: 6,
                padding: "1px 6px",
                background: "rgba(37, 99, 235, 0.3)",
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              관리자
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#9ca3af",
            padding: "6px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            width: "100%",
          }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
