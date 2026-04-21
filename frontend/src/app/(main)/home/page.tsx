"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import type { UploadResult } from "@/types";

const MONO = `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

const FEATURES = [
  { key: "content",  label: "내용 추출", desc: "텍스트 구조 그대로 워드로",    href: "/extract/content", icon: "▤", tint: "#EEF1FF", ink: "#2740C7" },
  { key: "table",    label: "표 추출",   desc: "자동 감지 → 편집 가능한 엑셀", href: "/extract/table",   icon: "▦", tint: "#E6F6EE", ink: "#0E8F5C" },
  { key: "summary",  label: "문서 요약", desc: "AI가 핵심 내용을 간결하게",    href: "/summary",         icon: "≡", tint: "#FFF2DE", ink: "#B26A00" },
  { key: "compare",  label: "PDF 비교",  desc: "두 문서 변경점 자동 분석",     href: "/compare",         icon: "⇄", tint: "#F5EEFF", ink: "#6B3DDB" },
  { key: "translate",label: "번역",      desc: "원본 구조 그대로 다국어 번역", href: "/translate",       icon: "A⇋가", tint: "#FDEBE7", ink: "#C8321E" },
];

const MOCK_RECENT = [
  { menu: "요약",    file: "2026 시공품질 관리계획서.pdf", time: "오늘 14:32", tint: "#FFF2DE", ink: "#B26A00" },
  { menu: "표추출",  file: "자재단가표_2026Q2.pdf",        time: "오늘 13:55", tint: "#E6F6EE", ink: "#0E8F5C" },
  { menu: "내용추출",file: "현장안전수칙_개정안.pdf",       time: "오늘 13:20", tint: "#F3F2EC", ink: "#4A5259" },
  { menu: "번역",    file: "ENG-spec-pipeline.pdf",         time: "오늘 12:48", tint: "#FDEBE7", ink: "#C8321E" },
  { menu: "PDF비교", file: "협력사 계약서 v3.2.pdf",        time: "어제 17:15", tint: "#F5EEFF", ink: "#6B3DDB" },
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

  const visibleFeatures = showAll ? FEATURES : FEATURES.slice(0, 4);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11,
            color: "#8A9199",
            marginBottom: 6,
            fontWeight: 600,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          Welcome Back
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6, margin: 0, lineHeight: 1.25 }}>
          안녕하세요.{" "}
          <span style={{ color: "#8A9199", fontWeight: 400 }}>오늘은 어떤 문서를 다뤄볼까요?</span>
        </h1>
      </div>

      {/* Hero card */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #EBE8E0",
          borderRadius: 14,
          padding: 32,
          marginBottom: 32,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          {/* Left: upload */}
          <div>
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
                <div style={{ fontSize: 12, color: "#8A9199", fontWeight: 600, marginBottom: 10, letterSpacing: 0.3 }}>
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

          {/* Right: feature grid 2×2 */}
          <div>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {visibleFeatures.map((f) => (
                <div
                  key={f.key}
                  onClick={() => goToFeature(f.href)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "14px 14px",
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
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: f.tint,
                      color: f.ink,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: MONO,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: "#8A9199", marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {!showAll && FEATURES.length > 4 && (
              <button
                onClick={() => setShowAll(true)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "#8A9199",
                  padding: "8px 0 0",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                + {FEATURES.length - 4}개 더 보기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "이번달 요청",   value: "124",   unit: "건",   color: "#3B5BFF" },
          { label: "처리 페이지",   value: "3,840", unit: "p",    color: "#0E8F5C" },
          { label: "저장된 작업",   value: "87",    unit: "개",   color: "#B26A00" },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: "#FFFFFF",
              border: "1px solid #EBE8E0",
              borderRadius: 14,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5, color: k.color }}>
              {k.value}
              <span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>{k.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 작업 */}
      <div style={{ background: "#FFFFFF", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #F1EEE6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>최근 작업</div>
          <div
            style={{
              fontSize: 11.5,
              color: "#8A9199",
              background: "#FFF2DE",
              padding: "3px 9px",
              borderRadius: 999,
              fontWeight: 500,
            }}
          >
            📋 목업 데이터
          </div>
        </div>
        {MOCK_RECENT.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 20px",
              borderBottom: i < MOCK_RECENT.length - 1 ? "1px solid #F1EEE6" : "none",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 9px",
                background: r.tint,
                color: r.ink,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
                minWidth: 52,
                justifyContent: "center",
              }}
            >
              {r.menu}
            </span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.file}
            </div>
            <div style={{ fontSize: 11.5, color: "#8A9199", fontFamily: MONO, flexShrink: 0 }}>{r.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
