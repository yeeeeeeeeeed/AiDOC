"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import type { UploadResult } from "@/types";

const MONO = `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

const FEATURES = [
  { key: "content", label: "내용 추출", desc: "PDF의 모든 텍스트를 구조 그대로 워드로", href: "/extract/content", icon: "▤", tint: "#EEF1FF", ink: "#2740C7" },
  { key: "table",   label: "표 추출",   desc: "표를 자동 감지하여 편집 가능한 엑셀로",  href: "/extract/table",   icon: "▦", tint: "#E6F6EE", ink: "#0E8F5C" },
  { key: "summary", label: "문서 요약", desc: "AI가 핵심 내용을 간결하게 정리",        href: "/summary",         icon: "≡", tint: "#FFF2DE", ink: "#B26A00" },
  { key: "compare", label: "PDF 비교",  desc: "두 문서의 변경점을 자동으로 분석",      href: "/compare",         icon: "⇄", tint: "#F5EEFF", ink: "#6B3DDB" },
  { key: "translate", label: "번역",   desc: "원본 구조 그대로 다국어 번역",          href: "/translate",       icon: "A⇋", tint: "#FDEBE7", ink: "#C8321E" },
];

export default function HomePage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [showAll, setShowAll] = useState(false);

  const handleUploaded = (result: UploadResult) => {
    setUploads((prev) => [...prev, result]);
  };

  const goToFeature = (href: string) => {
    if (uploads.length === 0) return;
    const jobIds = uploads.map((u) => u.job_id).join(",");
    router.push(`${href}?jobs=${jobIds}`);
  };

  const visibleFeatures = showAll ? FEATURES : FEATURES.slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 6, fontWeight: 500, letterSpacing: 0.3 }}>WELCOME BACK</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6, margin: 0, lineHeight: 1.25 }}>
            안녕하세요.{" "}
            <span style={{ color: "#8A9199", fontWeight: 400 }}>오늘은 어떤 문서를 다뤄볼까요?</span>
          </h1>
        </div>
      </div>

      {/* Hero card: upload + feature select */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #EBE8E0",
          borderRadius: 14,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr" }}>
          {/* Upload zone */}
          <div style={{ padding: 32, borderRight: "1px solid #EBE8E0" }}>
            <div
              style={{
                fontSize: 11.5,
                color: "#2740C7",
                fontWeight: 600,
                letterSpacing: 0.5,
                marginBottom: 12,
              }}
            >
              STEP 01 · 업로드
            </div>
            <PdfUploader onUploaded={handleUploaded} multiple />

            {uploads.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{ fontSize: 12, color: "#8A9199", fontWeight: 600, marginBottom: 10, letterSpacing: 0.3 }}
                >
                  업로드된 파일 ({uploads.length}개)
                </div>
                {uploads.map((u, i) => (
                  <div
                    key={u.job_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: i < uploads.length - 1 ? "1px solid #F1EEE6" : "none",
                    }}
                  >
                    <div className="pdf-icon">PDF</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{u.filename}</div>
                      <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 2 }}>{u.page_count}페이지</div>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 9px",
                        background: "#E6F6EE",
                        color: "#0E8F5C",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 500,
                      }}
                    >
                      완료
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Thumbnails for last upload */}
            {uploads.length > 0 && uploads[uploads.length - 1].thumbnails.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 8 }}>페이지 미리보기</div>
                <div className="thumbnails">
                  {uploads[uploads.length - 1].thumbnails.map((thumb, idx) => (
                    <div key={idx} className="thumbnail">
                      <img src={`data:image/png;base64,${thumb}`} alt={`p.${idx + 1}`} />
                      <span className="page-num">{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feature select */}
          <div style={{ padding: 32, background: "#FAFAF7" }}>
            <div
              style={{
                fontSize: 11.5,
                color: "#8A9199",
                fontWeight: 600,
                letterSpacing: 0.5,
                marginBottom: 14,
              }}
            >
              STEP 02 · 기능 선택
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleFeatures.map((f) => (
                <div
                  key={f.key}
                  onClick={() => goToFeature(f.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    background: "#fff",
                    border: "1px solid #EBE8E0",
                    borderRadius: 10,
                    cursor: uploads.length > 0 ? "pointer" : "not-allowed",
                    opacity: uploads.length > 0 ? 1 : 0.5,
                    transition: "border-color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (uploads.length > 0) (e.currentTarget as HTMLElement).style.borderColor = "#3B5BFF";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#EBE8E0";
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: f.tint,
                      color: f.ink,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: MONO,
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 1 }}>{f.desc}</div>
                  </div>
                  <span style={{ color: "#8A9199", fontSize: 14 }}>→</span>
                </div>
              ))}
              {!showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 12,
                    color: "#8A9199",
                    textAlign: "center",
                    padding: 4,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + {FEATURES.length - 3}개 더 보기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
