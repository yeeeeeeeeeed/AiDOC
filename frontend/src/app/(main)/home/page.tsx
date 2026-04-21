"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import type { UploadResult } from "@/types";

const FEATURES = [
  { key: "content",   label: "내용 추출",  desc: "스캔 PDF 포함, 텍스트를 원본 구조대로 추출",       href: "/extract/content", color: "#6366f1" },
  { key: "table",     label: "표 추출",    desc: "병합 셀·복잡한 레이아웃 표를 Excel/CSV로 변환",   href: "/extract/table",   color: "#10b981" },
  { key: "summary",   label: "문서 요약",  desc: "긴 보고서·회의록을 AI가 읽고 핵심 요약",           href: "/summary",         color: "#f59e0b" },
  { key: "compare",   label: "PDF 비교",   desc: "두 버전의 변경사항을 페이지 단위로 분석",           href: "/compare",         color: "#ef4444" },
  { key: "translate", label: "번역",       desc: "15개 언어로 즉시 번역, 원문·번역문 나란히 확인",   href: "/translate",       color: "#0891b2" },
];

export default function HomePage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadResult[]>([]);

  const goToFeature = (href: string) => {
    if (!uploads.length) return;
    router.push(`${href}?jobs=${uploads.map(u => u.job_id).join(",")}`);
  };

  const hasUploads = uploads.length > 0;

  return (
    <div>
      {/* 페이지 타이틀 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>홈</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>PDF를 업로드하고 원하는 기능을 선택하세요.</p>
      </div>

      {/* 좌우 분할 */}
      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 20, alignItems: "start" }}>

        {/* 왼쪽: 업로드 */}
        <div className="card" style={{ position: "sticky", top: 20, marginBottom: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            PDF 업로드
          </div>
          <PdfUploader onUploaded={r => setUploads(p => [...p, r])} multiple />

          {hasUploads && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                업로드된 파일
              </div>
              {uploads.map((u, i) => (
                <div key={u.job_id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0",
                  borderBottom: i < uploads.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{u.filename}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.page_count}페이지</div>
                  </div>
                  <span className="badge badge-success">완료</span>
                </div>
              ))}

              <div style={{
                marginTop: 14, padding: "10px 14px",
                background: "var(--primary-light)",
                borderRadius: 8, fontSize: 12,
                color: "var(--primary)", fontWeight: 500,
                borderLeft: "3px solid var(--primary)",
              }}>
                오른쪽에서 기능을 선택하세요
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 기능 카드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURES.map(f => {
            const isHoverable = hasUploads;
            return (
              <div
                key={f.key}
                onClick={() => goToFeature(f.href)}
                style={{
                  background: "white",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow)",
                  padding: "16px 20px",
                  display: "flex", alignItems: "center", gap: 16,
                  cursor: isHoverable ? "pointer" : "not-allowed",
                  opacity: isHoverable ? 1 : 0.45,
                  transition: "all 0.15s",
                  borderLeft: `3px solid ${isHoverable ? f.color : "var(--border)"}`,
                }}
                onMouseEnter={e => {
                  if (!isHoverable) return;
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "var(--shadow-md)";
                  el.style.transform = "translateX(3px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "var(--shadow)";
                  el.style.transform = "";
                }}
              >
                {/* 색 아이콘 점 */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: f.color + "18",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: f.color }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, color: "var(--text)" }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>

                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isHoverable ? f.color : "var(--border)"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke 0.15s" }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
