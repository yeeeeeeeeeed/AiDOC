"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import type { UploadResult } from "@/types";

const FEATURES = [
  { key: "content",   label: "내용 추출",  desc: "스캔 PDF 포함, 텍스트를 원본 구조대로 추출",      href: "/extract/content", color: "#2563eb", tag: "OCR"    },
  { key: "table",     label: "표 추출",    desc: "병합 셀·복잡한 레이아웃 표 → Excel/CSV 변환",    href: "/extract/table",   color: "#16a34a", tag: "Excel"  },
  { key: "summary",   label: "문서 요약",  desc: "보고서·회의록을 AI가 읽고 핵심 요약",             href: "/summary",         color: "#9333ea", tag: "AI 요약"},
  { key: "compare",   label: "PDF 비교",   desc: "두 버전의 변경사항을 페이지 단위로 분석",          href: "/compare",         color: "#ea580c", tag: "비교"   },
  { key: "translate", label: "번역",       desc: "15개 언어로 즉시 번역, 원문·번역문 나란히 확인",  href: "/translate",       color: "#0891b2", tag: "번역"   },
];

/* ── 안 A ─────────────────────────────────────── */
function DesignA() {
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const router = useRouter();
  const go = (href: string) => {
    if (!uploads.length) return;
    router.push(`${href}?jobs=${uploads.map(u => u.job_id).join(",")}`);
  };
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)", borderRadius: "var(--radius)", padding: "32px 36px", marginBottom: 28, color: "white" }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>AI Document Assistant</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>AiDoc</div>
        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>PDF를 업로드하면 AI가 내용을 추출·요약·번역·비교합니다.<br />스캔 문서, 복잡한 표도 정확하게 처리합니다.</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 20, gap: 0 }}>
        {[{ n: "1", label: "PDF 업로드" }, { n: "2", label: "기능 선택" }, { n: "3", label: "결과 확인" }].map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "var(--primary)" : "var(--border)", color: i === 0 ? "white" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{s.n}</div>
              <span style={{ fontSize: 13, color: i === 0 ? "var(--text)" : "var(--text-muted)", fontWeight: i === 0 ? 600 : 400 }}>{s.label}</span>
            </div>
            {i < 2 && <div style={{ width: 32, height: 1, background: "var(--border)", margin: "0 10px" }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <PdfUploader onUploaded={r => setUploads(p => [...p, r])} multiple />
        {uploads.length > 0 && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--success-light)", borderRadius: "var(--radius)", fontSize: 13 }}>
            <span style={{ color: "var(--success)", fontWeight: 600 }}>{uploads.length}개 업로드 완료</span>
            <span className="text-muted"> — 아래에서 기능을 선택하세요</span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {FEATURES.map(f => (
          <div key={f.key} onClick={() => go(f.href)} style={{ border: "1px solid var(--border)", borderTop: `3px solid ${uploads.length ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 20, cursor: uploads.length ? "pointer" : "not-allowed", opacity: uploads.length ? 1 : 0.4, background: "var(--bg-card)", transition: "all 0.15s" }}
            onMouseEnter={e => { if (uploads.length) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(37,99,235,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{f.label}</div>
            <div className="text-sm text-muted">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 안 B ─────────────────────────────────────── */
function DesignB() {
  const router = useRouter();
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>AiDoc</h1>
        <p className="text-muted" style={{ fontSize: 14 }}>AI 기반 PDF 문서 도우미 — 기능을 선택하여 바로 시작하세요.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {FEATURES.map(f => (
          <div key={f.key} onClick={() => router.push(f.href)}
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `4px solid ${f.color}`, borderRadius: "var(--radius)", padding: "22px 24px", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 10 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; (e.currentTarget as HTMLElement).style.transform = ""; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{f.label}</div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: f.color + "18", color: f.color, fontWeight: 600 }}>{f.tag}</span>
            </div>
            <div className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{f.desc}</div>
            <div style={{ fontSize: 12, color: f.color, fontWeight: 500, marginTop: 4 }}>시작하기 →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 안 C ─────────────────────────────────────── */
function DesignC() {
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();
  const go = (href: string) => {
    if (!uploads.length) return;
    router.push(`${href}?jobs=${uploads.map(u => u.job_id).join(",")}`);
  };
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>AiDoc</h1>
        <p className="text-muted" style={{ fontSize: 13 }}>PDF를 업로드하고 원하는 기능을 선택하세요.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ position: "sticky", top: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>PDF 업로드</div>
          <PdfUploader onUploaded={r => setUploads(p => [...p, r])} multiple />
          {uploads.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div className="text-sm text-muted" style={{ marginBottom: 8 }}>업로드된 파일</div>
              {uploads.map((u, i) => (
                <div key={u.job_id} style={{ padding: "8px 0", borderBottom: i < uploads.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500 }}>{u.filename}</div><div className="text-sm text-muted">{u.page_count}페이지</div></div>
                  <span className="badge badge-success" style={{ fontSize: 11 }}>완료</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted" style={{ marginTop: 12, lineHeight: 1.5 }}>파일 업로드 후 오른쪽에서 기능을 선택하세요.</p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURES.map(f => {
            const active = uploads.length > 0;
            const isHov = hovered === f.key && active;
            return (
              <div key={f.key} onClick={() => go(f.href)} onMouseEnter={() => active && setHovered(f.key)} onMouseLeave={() => setHovered(null)}
                style={{ background: isHov ? f.color + "08" : "var(--bg-card)", border: `1px solid ${isHov ? f.color : "var(--border)"}`, borderRadius: "var(--radius)", padding: "18px 20px", cursor: active ? "pointer" : "not-allowed", opacity: active ? 1 : 0.45, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 4, height: 40, borderRadius: 2, background: active ? f.color : "var(--border)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: isHov ? f.color : "var(--text)" }}>{f.label}</div>
                  <div className="text-sm text-muted">{f.desc}</div>
                </div>
                <div style={{ fontSize: 20, color: isHov ? f.color : "var(--border)", transition: "color 0.15s" }}>›</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 미리보기 래퍼 ─────────────────────────────── */
const DESIGNS = [
  { key: "a", label: "안 A — 단계형", desc: "배너 + 업로드 → 기능 선택 흐름" },
  { key: "b", label: "안 B — 기능 먼저", desc: "기능 카드 전면 노출, 클릭 시 바로 이동" },
  { key: "c", label: "안 C — 좌우 분할", desc: "왼쪽 업로드 / 오른쪽 기능 목록" },
];

export default function PreviewPage() {
  const [active, setActive] = useState("a");
  return (
    <div>
      {/* 전환 바 */}
      <div style={{ background: "#1a1d23", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "#9ca3af", fontSize: 12, marginRight: 4 }}>미리보기</span>
        {DESIGNS.map(d => (
          <button key={d.key} onClick={() => setActive(d.key)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active === d.key ? 600 : 400, background: active === d.key ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.06)", color: active === d.key ? "white" : "#9ca3af", transition: "all 0.15s" }}>
            {d.label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "#4b5563", fontSize: 12 }}>
          {DESIGNS.find(d => d.key === active)?.desc}
        </span>
      </div>

      {active === "a" && <DesignA />}
      {active === "b" && <DesignB />}
      {active === "c" && <DesignC />}
    </div>
  );
}
