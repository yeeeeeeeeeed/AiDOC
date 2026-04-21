"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import type { UploadResult } from "@/types";

// 안 C: 좌우 분할 (Split Layout)
// - 왼쪽(40%): 업로드 + 파일 목록
// - 오른쪽(60%): 기능 목록 (세로 리스트, 설명 위주)

const FEATURES = [
  { key: "content",  label: "내용 추출",  desc: "스캔 PDF 포함, 텍스트를 원본 구조대로 추출",       href: "/extract/content", color: "#2563eb" },
  { key: "table",    label: "표 추출",    desc: "병합 셀·복잡한 레이아웃 표 → Excel/CSV 변환",    href: "/extract/table",   color: "#16a34a" },
  { key: "summary",  label: "문서 요약",  desc: "보고서·회의록을 AI가 읽고 핵심 요약",             href: "/summary",         color: "#9333ea" },
  { key: "compare",  label: "PDF 비교",   desc: "두 버전의 변경사항을 페이지 단위로 분석",          href: "/compare",         color: "#ea580c" },
  { key: "translate",label: "번역",       desc: "15개 언어로 즉시 번역, 원문·번역문 나란히 확인",  href: "/translate",       color: "#0891b2" },
];

export default function HomePageC() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  const goToFeature = (href: string) => {
    if (uploads.length === 0) return;
    router.push(`${href}?jobs=${uploads.map((u) => u.job_id).join(",")}`);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>AiDoc</h1>
        <p className="text-muted" style={{ fontSize: 13 }}>PDF를 업로드하고 원하는 기능을 선택하세요.</p>
      </div>

      {/* ── 좌우 분할 레이아웃 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 20, alignItems: "start" }}>

        {/* 왼쪽: 업로드 */}
        <div>
          <div className="card" style={{ position: "sticky", top: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
              PDF 업로드
            </div>
            <PdfUploader onUploaded={(r) => setUploads((p) => [...p, r])} multiple />

            {uploads.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="text-sm text-muted" style={{ marginBottom: 8 }}>업로드된 파일</div>
                {uploads.map((u, i) => (
                  <div key={u.job_id} style={{
                    padding: "8px 0",
                    borderBottom: i < uploads.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{u.filename}</div>
                      <div className="text-sm text-muted">{u.page_count}페이지</div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: 11 }}>완료</span>
                  </div>
                ))}
              </div>
            )}

            {uploads.length === 0 && (
              <p className="text-sm text-muted" style={{ marginTop: 12, lineHeight: 1.5 }}>
                파일 업로드 후 오른쪽에서 기능을 선택하세요.
              </p>
            )}
          </div>
        </div>

        {/* 오른쪽: 기능 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURES.map((f) => {
            const active = uploads.length > 0;
            const isHov = hovered === f.key && active;
            return (
              <div
                key={f.key}
                onClick={() => goToFeature(f.href)}
                onMouseEnter={() => active && setHovered(f.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHov ? f.color + "08" : "var(--bg-card)",
                  border: `1px solid ${isHov ? f.color : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  padding: "18px 20px",
                  cursor: active ? "pointer" : "not-allowed",
                  opacity: active ? 1 : 0.45,
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{
                  width: 4, height: 40, borderRadius: 2,
                  background: active ? f.color : "var(--border)",
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: isHov ? f.color : "var(--text)" }}>
                    {f.label}
                  </div>
                  <div className="text-sm text-muted">{f.desc}</div>
                </div>
                <div style={{ fontSize: 18, color: isHov ? f.color : "var(--border)", transition: "color 0.15s" }}>›</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
