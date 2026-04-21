"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AccessCheck } from "@/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/aidoc";

const MONO = `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
  divider?: boolean;
}

const MENU: MenuItem[] = [
  { label: "홈", href: "/home", icon: "◻" },
  { label: "내용 추출", href: "/extract/content", icon: "▤" },
  { label: "표 추출", href: "/extract/table", icon: "▦" },
  { label: "문서 요약", href: "/summary", icon: "≡" },
  { label: "PDF 비교", href: "/compare", icon: "⇄" },
  { label: "번역", href: "/translate", icon: "A⇋가" },
  { label: "이용 기록", href: "/admin/history", icon: "⚙", adminOnly: true, divider: true },
  { label: "토큰 사용량", href: "/admin/tokens", icon: "◈", adminOnly: true },
  { label: "방문자 로그", href: "/admin/visitors", icon: "◉", adminOnly: true },
  { label: "사용 한도", href: "/admin/limits", icon: "◎", adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [userName, setUserName] = useState("사용자");

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json())
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
    await fetch(`${BASE}/api/auth/sso/logout`, { method: "POST" });
    window.location.href = "/";
  };

  const initial = userName.charAt(0) || "?";
  const isAdmin = access?.is_admin;

  return (
    <aside
      style={{
        width: 248,
        background: "#17181C",
        color: "#E5E5E0",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        padding: "20px 14px",
        zIndex: 100,
        fontFamily: `"Pretendard", "Inter", -apple-system, sans-serif`,
      }}
    >
      {/* Brand */}
      <div style={{ padding: "6px 10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg, #3B5BFF, #7B8EFF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            color: "#fff",
            letterSpacing: -0.5,
            flexShrink: 0,
          }}
        >
          A
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }}>AiDoc</div>
          <div style={{ fontSize: 11, color: "#797C82", marginTop: 1 }}>AI 문서 도우미</div>
        </div>
      </div>

      {/* Workspace label */}
      <div
        style={{
          fontSize: 10,
          color: "#797C82",
          padding: "0 12px 8px",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Workspace
      </div>

      {/* Menu */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {MENU.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <div key={item.href}>
              {item.divider && (
                <div
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                    margin: "10px 10px",
                  }}
                />
              )}
              <Link
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: isActive ? "#fff" : "#E5E5E0",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  fontWeight: isActive ? 500 : 400,
                  fontSize: 13.5,
                  position: "relative",
                  transition: "background 0.12s",
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 10,
                      bottom: 10,
                      width: 2.5,
                      background: "#3B5BFF",
                      borderRadius: 2,
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 13,
                    width: 22,
                    textAlign: "center",
                    color: isActive ? "#3B5BFF" : "#797C82",
                    fontFamily: MONO,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
                {item.href === "/admin/history" && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 9.5,
                      padding: "2px 5px",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 3,
                      color: "#797C82",
                      letterSpacing: 0.3,
                      fontFamily: MONO,
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* User card */}
      <div
        style={{
          padding: 12,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isAdmin ? 0 : 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#3C3F46",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName}
            </div>
            <div style={{ fontSize: 10.5, color: "#797C82" }}>
              {isAdmin ? "관리자 · POSCO ENC" : "POSCO ENC"}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 8,
            background: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#797C82",
            padding: "5px 10px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11.5,
            width: "100%",
            fontFamily: "inherit",
            transition: "color 0.12s",
          }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
