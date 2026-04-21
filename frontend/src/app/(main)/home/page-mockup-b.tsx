"use client";

import { useRouter } from "next/navigation";

// 안 B: 기능 카드 먼저 (Feature First)
// - 업로드 없이 기능 카드를 항상 전면에 노출
// - 기능 클릭 → 해당 메뉴로 바로 이동 (각 페이지에서 업로드)
// - 홈은 "기능 소개 + 진입점" 역할

const FEATURES = [
  {
    key: "content",
    label: "내용 추출",
    desc: "스캔 PDF, 이미지 PDF를 포함해 텍스트를 원본 구조대로 추출합니다.",
    href: "/extract/content",
    color: "#2563eb",
    tag: "OCR",
  },
  {
    key: "table",
    label: "표 추출",
    desc: "병합 셀, 복잡한 레이아웃의 표도 정확하게 인식하여 Excel/CSV로 변환합니다.",
    href: "/extract/table",
    color: "#16a34a",
    tag: "Excel",
  },
  {
    key: "summary",
    label: "문서 요약",
    desc: "긴 보고서, 회의록, 규정집을 AI가 읽고 핵심만 요약해드립니다.",
    href: "/summary",
    color: "#9333ea",
    tag: "AI 요약",
  },
  {
    key: "compare",
    label: "PDF 비교",
    desc: "계약서 개정, 문서 버전 변경 시 달라진 내용을 페이지 단위로 분석합니다.",
    href: "/compare",
    color: "#ea580c",
    tag: "변경 분석",
  },
  {
    key: "translate",
    label: "번역",
    desc: "해외 기술 문서, 계약서를 업로드만 하면 15개 언어로 즉시 번역합니다.",
    href: "/translate",
    color: "#0891b2",
    tag: "15개 언어",
  },
];

export default function HomePageB() {
  const router = useRouter();

  return (
    <div>
      {/* ── 헤더 ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>AiDoc</h1>
        <p className="text-muted" style={{ fontSize: 14 }}>
          AI 기반 PDF 문서 도우미 — 기능을 선택하여 바로 시작하세요.
        </p>
      </div>

      {/* ── 기능 카드 (2열 + 마지막 1개 중앙) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {FEATURES.map((f) => (
          <div
            key={f.key}
            onClick={() => router.push(f.href)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: `4px solid ${f.color}`,
              borderRadius: "var(--radius)",
              padding: "22px 24px",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px rgba(0,0,0,0.08)`;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "";
              (e.currentTarget as HTMLElement).style.transform = "";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{f.label}</div>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 10,
                background: f.color + "18", color: f.color, fontWeight: 600,
              }}>{f.tag}</span>
            </div>
            <div className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{f.desc}</div>
            <div style={{ fontSize: 12, color: f.color, fontWeight: 500, marginTop: 4 }}>시작하기 →</div>
          </div>
        ))}
      </div>
    </div>
  );
}
