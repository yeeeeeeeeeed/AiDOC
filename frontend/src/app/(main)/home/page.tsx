"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import api from "@/lib/api";
import type { UploadResult } from "@/types";

const MONO = `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

const MENU_META: Record<string, { label: string; bg: string; fg: string; href: string }> = {
  요약:    { label: "요약",    bg: "#EEF1FF", fg: "#2740C7", href: "/summary" },
  표추출:  { label: "표추출",  bg: "#E6F6EE", fg: "#0E8F5C", href: "/extract/table" },
  내용추출:{ label: "내용추출",bg: "#FFF2DE", fg: "#B26A00", href: "/extract/content" },
  번역:    { label: "번역",    bg: "#F3EEFF", fg: "#6B3FC4", href: "/translate" },
  비교:    { label: "비교",    bg: "#F1EEE6", fg: "#4A5259", href: "/compare" },
};

const FEATURES = [
  { key: "content",   label: "내용 추출", desc: "텍스트 구조 그대로 워드로",    href: "/extract/content", icon: "▤", tint: "#EEF1FF", ink: "#2740C7" },
  { key: "table",     label: "표 추출",   desc: "자동 감지 → 편집 가능한 엑셀", href: "/extract/table",   icon: "▦", tint: "#E6F6EE", ink: "#0E8F5C" },
  { key: "summary",   label: "문서 요약", desc: "AI가 핵심 내용을 간결하게",    href: "/summary",         icon: "≡", tint: "#FFF2DE", ink: "#B26A00" },
  { key: "compare",   label: "PDF 비교",  desc: "두 문서 변경점 자동 분석",     href: "/compare",         icon: "⇄", tint: "#F5EEFF", ink: "#6B3DDB" },
  { key: "translate", label: "번역",      desc: "원본 구조 그대로 다국어 번역", href: "/translate",       icon: "A⇋가", tint: "#FDEBE7", ink: "#C8321E" },
];

interface RecentJob {
  job_id: string;
  menu: string;
  filename: string;
  timestamp: string;
  page_count: number;
}

interface MyStats {
  total_jobs: number;
  total_pages: number;
  top_menu: string | null;
  top_menu_count: number;
}

function relativeTime(ts: string): string {
  if (!ts) return "";
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yestStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const tsDate = ts.slice(0, 10);
  const timeStr = ts.slice(11, 16);
  if (tsDate === todayStr) return `오늘 ${timeStr}`;
  if (tsDate === yestStr) return `어제 ${timeStr}`;
  const diffDays = Math.round((now.getTime() - new Date(ts).getTime()) / 86400000);
  if (diffDays < 30) return `${diffDays}일 전`;
  return tsDate;
}

function Skeleton({ width, height }: { width: number | string; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(90deg, #F1EEE6 25%, #E8E5DE 50%, #F1EEE6 75%)",
        backgroundSize: "200% 100%",
        borderRadius: 4,
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

export default function HomePage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [viewState, setViewState] = useState<"upload" | "selected">("upload");
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  const [recentJobs, setRecentJobs] = useState<RecentJob[] | null>(null);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      api.get<RecentJob[]>("/api/me/recent-jobs?limit=10").catch(() => []),
      api.get<MyStats>("/api/me/stats").catch(() => null),
    ]).then(([jobs, s]) => {
      setRecentJobs(jobs ?? []);
      setStats(s);
      setLoadingData(false);
    });
  }, []);

  const transitionTo = (target: "upload" | "selected") => {
    if (transitioning) return;
    setTransitioning(true);
    setHeroOpacity(0);
    setTimeout(() => {
      setViewState(target);
      setHeroOpacity(1);
      setTimeout(() => setTransitioning(false), 10);
    }, 200);
  };

  const handleUploaded = (result: UploadResult) => {
    setUploads((prev) => [...prev, result]);
    if (viewState === "upload") {
      transitionTo("selected");
    }
  };

  const clearUploads = () => {
    setUploads([]);
    transitionTo("upload");
  };

  const goToFeature = (href: string) => {
    const jobIds = uploads.map((u) => u.job_id).join(",");
    router.push(`${href}?jobs=${jobIds}`);
  };

  const goToJob = (job: RecentJob) => {
    const meta = MENU_META[job.menu];
    if (!meta) return;
    router.push(`${meta.href}?jobs=${job.job_id}`);
  };

  const latestJob = recentJobs && recentJobs.length > 0 ? recentJobs[0] : null;
  const latestJobMeta = latestJob ? (MENU_META[latestJob.menu] ?? null) : null;

  const topMenuMeta = stats?.top_menu ? MENU_META[stats.top_menu] : null;
  const topPct =
    stats && stats.total_jobs > 0 && stats.top_menu_count > 0
      ? Math.round((stats.top_menu_count / stats.total_jobs) * 100)
      : 0;

  // Shared feature grid — called as a function (not a component) to avoid remount
  const featureGrid = ({ enabled, gap = 8 }: { enabled: boolean; gap?: number }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap }}>
      {FEATURES.map((f) => (
        <div
          key={f.key}
          onClick={() => enabled && goToFeature(f.href)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "14px",
            background: "#fff",
            border: "1px solid #EBE8E0",
            borderRadius: 10,
            cursor: enabled ? "pointer" : "not-allowed",
            opacity: enabled ? 1 : 0.5,
            transition: "border-color 0.12s",
          }}
          onMouseEnter={(e) => { if (enabled) (e.currentTarget as HTMLElement).style.borderColor = "#3B5BFF"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#EBE8E0"; }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 8, background: f.tint, color: f.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 12, flexShrink: 0 }}>
            {f.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
            <div style={{ fontSize: 11, color: "#8A9199", marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
          </div>
        </div>
      ))}

      {/* 6th slot: 다시 실행 — visibility:hidden keeps grid shape when empty */}
      <div style={{ visibility: latestJob ? "visible" : "hidden" }}>
        <div
          onClick={() => latestJob && goToJob(latestJob)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "14px",
            background: "#fff",
            border: "1px solid #EBE8E0",
            borderRadius: 10,
            cursor: latestJob ? "pointer" : "default",
            height: "100%",
            transition: "border-color 0.12s",
          }}
          onMouseEnter={(e) => { if (latestJob) (e.currentTarget as HTMLElement).style.borderColor = "#3B5BFF"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#EBE8E0"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#F5F2EB", color: "#4A5259", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>↻</div>
            <span style={{ fontSize: 11, color: "#8A9199", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" as const }}>최근</span>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>다시 실행 · {latestJobMeta?.label ?? latestJob?.menu}</div>
            <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 2 }}>
              {latestJob ? `${relativeTime(latestJob.timestamp)} 처리` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const totalPages = uploads.reduce((acc, u) => acc + u.page_count, 0);
  const allThumbnails = uploads.flatMap((u) =>
    u.thumbnails.map((thumb, idx) => ({ thumb, idx, jobId: u.job_id }))
  );

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      <div>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "#8A9199", marginBottom: 6, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>
            Welcome Back
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6, margin: 0, lineHeight: 1.25 }}>
            안녕하세요.{" "}
            <span style={{ color: "#8A9199", fontWeight: 400 }}>오늘은 어떤 문서를 다뤄볼까요?</span>
          </h1>
        </div>

        {/* Hero section — fades between State A and State B */}
        <div
          style={{
            marginBottom: 32,
            opacity: heroOpacity,
            pointerEvents: transitioning ? "none" : "auto",
            transition: "opacity 200ms ease-out",
          }}
        >
          {viewState === "upload" ? (
            /* ── State A: split hero card, 4fr:8fr ── */
            <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, padding: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: 40 }}>
                {/* Left: upload zone */}
                <div>
                  <div style={{ fontSize: 11.5, color: "#2740C7", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
                    STEP 01 · 업로드
                  </div>
                  <PdfUploader onUploaded={handleUploaded} multiple />
                </div>

                {/* Right: 3×2 feature grid */}
                <div>
                  <div style={{ fontSize: 11.5, color: "#8A9199", fontWeight: 600, letterSpacing: 0.5, marginBottom: 14 }}>
                    STEP 02 · 기능 선택
                  </div>
                  {featureGrid({ enabled: false, gap: 8 })}
                </div>
              </div>
            </div>
          ) : (
            /* ── State B: file card + feature card, full width ── */
            <>
              {/* File card */}
              <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: allThumbnails.length > 0 ? 14 : 0,
                  }}
                >
                  <div className="pdf-icon">PDF</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {uploads.length === 1 ? (
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {uploads[0].filename}
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {uploads[0].filename}
                        <span style={{ color: "#8A9199", fontWeight: 400 }}> 외 {uploads.length - 1}개</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 3 }}>
                      {uploads.length > 1 ? `${uploads.length}개 파일 · ` : ""}{totalPages}페이지
                    </div>
                  </div>
                  <button
                    onClick={clearUploads}
                    title="파일 제거"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 8px",
                      fontSize: 22,
                      color: "#8A9199",
                      fontFamily: "inherit",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Thumbnail horizontal scroll */}
                {allThumbnails.length > 0 && (
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {allThumbnails.map(({ thumb, idx, jobId }) => (
                      <div
                        key={`${jobId}-${idx}`}
                        style={{
                          flexShrink: 0,
                          width: 72,
                          height: 90,
                          borderRadius: 6,
                          border: "1px solid #EBE8E0",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <img
                          src={`data:image/png;base64,${thumb}`}
                          alt={`p.${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            bottom: 3,
                            right: 3,
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            fontSize: 9,
                            padding: "1px 4px",
                            borderRadius: 3,
                            fontFamily: MONO,
                          }}
                        >
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature card */}
              <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, padding: 32 }}>
                <div style={{ fontSize: 11.5, color: "#8A9199", fontWeight: 600, letterSpacing: 0.5, marginBottom: 14 }}>
                  STEP 02 · 기능 선택
                </div>
                {featureGrid({ enabled: true, gap: 12 })}
              </div>
            </>
          )}
        </div>

        {/* KPI 카드 */}
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>이번달 작업</div>
            {loadingData ? (
              <Skeleton width={60} height={32} />
            ) : (
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5, color: "#3B5BFF" }}>
                {stats ? stats.total_jobs.toLocaleString("ko-KR") : "—"}
                <span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>건</span>
              </div>
            )}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>처리 페이지</div>
            {loadingData ? (
              <Skeleton width={80} height={32} />
            ) : (
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5, color: "#0E8F5C" }}>
                {stats ? stats.total_pages.toLocaleString("ko-KR") : "—"}
                <span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>p</span>
              </div>
            )}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 12 }}>이달의 주요 기능</div>
            {loadingData ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Skeleton width={64} height={28} />
                <Skeleton width={36} height={28} />
              </div>
            ) : !topMenuMeta ? (
              <div style={{ fontSize: 13, color: "#8A9199" }}>—</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", background: topMenuMeta.bg, color: topMenuMeta.fg, borderRadius: 999, fontSize: 13, fontWeight: 500 }}>
                    {topMenuMeta.label}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 500, color: "#4A5259" }}>
                    {stats!.top_menu_count.toLocaleString("ko-KR")}
                    <span style={{ fontSize: 12, color: "#8A9199", fontWeight: 400, marginLeft: 3 }}>회</span>
                  </span>
                </div>
                {stats!.total_jobs > 0 && (
                  <div style={{ fontSize: 12, color: "#4A5259" }}>
                    전체 {stats!.total_jobs.toLocaleString("ko-KR")}건 중 {topPct}%
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 최근 작업 */}
        <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1EEE6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>최근 작업</div>
            {recentJobs && recentJobs.length > 0 && (
              <span style={{ fontSize: 12, color: "#8A9199" }}>{recentJobs.length}건</span>
            )}
          </div>

          {loadingData && (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < 3 ? "1px solid #F1EEE6" : "none" }}>
                  <Skeleton width={64} height={24} />
                  <Skeleton width="50%" height={16} />
                  <Skeleton width={60} height={14} />
                </div>
              ))}
            </>
          )}

          {!loadingData && (!recentJobs || recentJobs.length === 0) && (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0F1419", marginBottom: 6 }}>이번 달 첫 작업을 시작해보세요</div>
              <div style={{ fontSize: 13, color: "#8A9199" }}>위에서 PDF를 업로드하고 기능을 선택하면 여기에 기록됩니다</div>
            </div>
          )}

          {!loadingData && recentJobs && recentJobs.length > 0 &&
            recentJobs.map((r, i) => {
              const meta = MENU_META[r.menu] ?? { label: r.menu, bg: "#F1EEE6", fg: "#4A5259", href: "/home" };
              return (
                <div
                  key={r.job_id}
                  onClick={() => goToJob(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 20px",
                    borderBottom: i < recentJobs.length - 1 ? "1px solid #F1EEE6" : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F1EEE6"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: meta.bg, color: meta.fg, borderRadius: 999, fontSize: 11, fontWeight: 600, flexShrink: 0, minWidth: 52, justifyContent: "center" }}>
                    {meta.label}
                  </span>
                  <div style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.filename}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8A9199", fontFamily: MONO, flexShrink: 0 }}>
                    {relativeTime(r.timestamp)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
