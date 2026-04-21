"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import type { UploadResult } from "@/types";

// 안 A: 단계형 (Step Flow)
// - 상단 배너: 앱 이름 + 한 줄 설명
// - 1단계 업로드 → 2단계 기능 선택 흐름 명시
// - 기능 카드는 업로드 후 활성화

const FEATURES = [
  { key: "content", label: "내용 추출", desc: "PDF 내용을 텍스트로 변환", href: "/extract/content" },
  { key: "table",   label: "표 추출",   desc: "표를 감지하여 Excel로 변환",  href: "/extract/table"   },
  { key: "summary", label: "문서 요약", desc: "핵심 내용을 AI가 요약",       href: "/summary"         },
  { key: "compare", label: "PDF 비교",  desc: "두 PDF의 변경점 자동 분석",   href: "/compare"         },
  { key: "translate", label: "번역",    desc: "원하는 언어로 즉시 번역",     href: "/translate"       },
];

export default function HomePageA() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadResult[]>([]);

  const goToFeature = (href: string) => {
    if (uploads.length === 0) return;
    router.push(`${href}?jobs=${uploads.map((u) => u.job_id).join(",")}`);
  };

  return (
    <div>
      {/* ── 상단 배너 ── */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
        borderRadius: "var(--radius)",
        padding: "32px 36px",
        marginBottom: 28,
        color: "white",
      }}>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>AI Document Assistant</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>AiDoc</div>
        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
          PDF를 업로드하면 AI가 내용을 추출·요약·번역·비교합니다.<br />
          스캔 문서, 복잡한 표도 정확하게 처리합니다.
        </div>
      </div>

      {/* ── 단계 표시 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
        {[
          { n: "1", label: "PDF 업로드" },
          { n: "2", label: "기능 선택" },
          { n: "3", label: "결과 확인" },
        ].map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i === 0 ? "var(--primary)" : "var(--border)",
                color: i === 0 ? "white" : "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>{s.n}</div>
              <span style={{ fontSize: 13, color: i === 0 ? "var(--text)" : "var(--text-muted)", fontWeight: i === 0 ? 600 : 400 }}>{s.label}</span>
            </div>
            {i < 2 && <div style={{ width: 32, height: 1, background: "var(--border)", margin: "0 10px" }} />}
          </div>
        ))}
      </div>

      {/* ── 업로드 ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <PdfUploader onUploaded={(r) => setUploads((p) => [...p, r])} multiple />
        {uploads.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--success-light)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--success)", fontWeight: 600, fontSize: 13 }}>{uploads.length}개 파일 업로드 완료</span>
            <span className="text-sm text-muted">— 아래에서 기능을 선택하세요</span>
          </div>
        )}
      </div>

      {/* ── 기능 카드 ── */}
      <div className="grid-3">
        {FEATURES.map((f) => (
          <div
            key={f.key}
            onClick={() => goToFeature(f.href)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "20px 20px",
              cursor: uploads.length > 0 ? "pointer" : "not-allowed",
              opacity: uploads.length > 0 ? 1 : 0.4,
              background: "var(--bg-card)",
              transition: "all 0.15s",
              borderTop: `3px solid ${uploads.length > 0 ? "var(--primary)" : "var(--border)"}`,
            }}
            onMouseEnter={(e) => { if (uploads.length > 0) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(37,99,235,0.12)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{f.label}</div>
            <div className="text-sm text-muted">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
