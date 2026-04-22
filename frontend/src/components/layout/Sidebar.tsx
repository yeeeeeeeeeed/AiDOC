"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AccessCheck } from "@/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/aidoc";

const MONO = `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

interface SubMenuItem {
  label: string;
  href: string;
}

interface MenuItem {
  label: string;
  href?: string;
  icon: string;
  adminOnly?: boolean;
  divider?: boolean;
  children?: SubMenuItem[];
}

const MENU: MenuItem[] = [
  { label: "홈",      href: "/home",            icon: "◻" },
  { label: "내용 추출", href: "/extract/content", icon: "▤" },
  { label: "표 추출",  href: "/extract/table",   icon: "▦" },
  { label: "문서 요약", href: "/summary",          icon: "≡" },
  { label: "PDF 비교", href: "/compare",          icon: "⇄" },
  { label: "번역",     href: "/translate",        icon: "A⇋가" },
  {
    label: "관리자", icon: "⚙", adminOnly: true, divider: true,
    children: [
      { label: "이용 기록",  href: "/admin/history"  },
      { label: "토큰 사용량", href: "/admin/tokens"   },
      { label: "사용 한도",  href: "/admin/limits"   },
    ],
  },
];

const sideMuted = "#797C82";

export default function Sidebar() {
  const pathname = usePathname();
  const [access, setAccess]     = useState<AccessCheck | null>(null);
  const [userName, setUserName] = useState("사용자");
  const [adminExpanded, setAdminExpanded] = useState(true);

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
    // 부서 쿠키 갱신 (기존 세션 포함)
    fetch(`${BASE}/api/auth/me`).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/sso/logout`, { method: "POST" });
    window.location.href = "/";
  };

  const toggleAdmin = () => setAdminExpanded((v) => !v);

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
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #3B5BFF, #7B8EFF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 13, color: "#fff", letterSpacing: -0.5, flexShrink: 0,
          }}
        >
          A
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }}>AiDoc</div>
          <div style={{ fontSize: 11, color: sideMuted, marginTop: 1 }}>AI 문서 도우미</div>
        </div>
      </div>

      {/* Workspace label */}
      <div style={{ fontSize: 10, color: sideMuted, padding: "0 12px 8px", letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 }}>
        Workspace
      </div>

      {/* Menu */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {MENU.map((item) => {
          if (item.adminOnly && !isAdmin) return null;

          // ── Accordion group (children) ───────────────────────────
          if (item.children) {
            const anyChildActive = item.children.some((c) => pathname === c.href);
            return (
              <div key={item.label}>
                {item.divider && (
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 10px" }} />
                )}

                {/* Parent toggle button */}
                <button
                  onClick={toggleAdmin}
                  aria-expanded={adminExpanded}
                  aria-controls="admin-submenu"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAdmin(); }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    width: "100%",
                    background: anyChildActive ? "rgba(255,255,255,0.05)" : "transparent",
                    border: "none",
                    color: "#E5E5E0",
                    fontSize: 13.5,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = anyChildActive ? "rgba(255,255,255,0.05)" : "transparent"; }}
                >
                  <span style={{ fontSize: 13, width: 22, textAlign: "center", color: sideMuted, fontFamily: MONO, flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span
                    style={{
                      fontSize: 9.5, padding: "2px 5px",
                      background: "rgba(255,255,255,0.1)", borderRadius: 3,
                      color: sideMuted, letterSpacing: 0.3, fontFamily: MONO,
                    }}
                  >
                    ADMIN
                  </span>
                  <span style={{ fontSize: 11, color: sideMuted, marginLeft: 4 }}>
                    {adminExpanded ? "▾" : "▸"}
                  </span>
                </button>

                {/* Sub items */}
                {adminExpanded && (
                  <div id="admin-submenu" style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "7px 12px 7px 44px",
                            borderRadius: 7,
                            textDecoration: "none",
                            color: isActive ? "#fff" : "#C0BDB6",
                            background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                            fontWeight: isActive ? 500 : 400,
                            fontSize: 12.5,
                            position: "relative",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          {isActive && (
                            <span
                              style={{
                                position: "absolute",
                                left: 0, top: 8, bottom: 8,
                                width: 2.5,
                                background: "#3B5BFF",
                                borderRadius: 2,
                              }}
                            />
                          )}
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Leaf item ────────────────────────────────────────────
          const isActive = pathname === item.href || pathname?.startsWith((item.href ?? "") + "/");
          return (
            <div key={item.href}>
              {item.divider && (
                <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 10px" }} />
              )}
              <Link
                href={item.href!}
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
                      left: 0, top: 10, bottom: 10,
                      width: 2.5,
                      background: "#3B5BFF",
                      borderRadius: 2,
                    }}
                  />
                )}
                <span style={{ fontSize: 13, width: 22, textAlign: "center", color: isActive ? "#3B5BFF" : sideMuted, fontFamily: MONO, flexShrink: 0 }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* User card */}
      <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "#3C3F46",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName}
            </div>
            <div style={{ fontSize: 10.5, color: sideMuted }}>
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
            color: sideMuted,
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
