"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import PageSelector from "@/components/ui/PageSelector";
import type { UploadResult } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/aidoc";

const FEATURES = [
  {
    key: "content",
    label: "내용 추출",
    desc: "PDF 내용을 원본 구조 그대로 워드/텍스트로 변환",
    href: "/extract/content",
    icon: "⊞",
  },
  {
    key: "table",
    label: "표 추출",
    desc: "PDF의 표를 감지하여 편집 가능한 엑셀로 변환",
    href: "/extract/table",
    icon: "⊟",
  },
  {
    key: "summary",
    label: "문서 요약",
    desc: "AI가 문서를 분석하여 핵심 내용을 요약",
    href: "/summary",
    icon: "≡",
  },
  {
    key: "compare",
    label: "PDF 비교",
    desc: "두 PDF의 변경점을 자동으로 분석",
    href: "/compare",
    icon: "⊜",
  },
  {
    key: "translate",
    label: "번역",
    desc: "외국어 PDF를 한국어로 번역하여 추출",
    href: "/translate",
    icon: "⇄",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadResult[]>([]);

  const handleUploaded = (result: UploadResult) => {
    setUploads((prev) => [...prev, result]);
  };

  const goToFeature = (href: string) => {
    if (uploads.length === 0) return;
    const jobIds = uploads.map((u) => u.job_id).join(",");
    router.push(`${BASE}${href}?jobs=${jobIds}`);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>AiDoc</h1>
      <p className="text-muted mb-4">PDF 문서를 업로드하고 원하는 기능을 선택하세요.</p>

      {/* Upload */}
      <div className="card">
        <div className="card-header">PDF 업로드</div>
        <PdfUploader onUploaded={handleUploaded} multiple />
      </div>

      {/* Uploaded files */}
      {uploads.length > 0 && (
        <div className="card">
          <div className="card-header">업로드된 파일 ({uploads.length}개)</div>
          {uploads.map((u, i) => (
            <div
              key={u.job_id}
              className="flex-between"
              style={{
                padding: "10px 0",
                borderBottom: i < uploads.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{u.filename}</div>
                <div className="text-sm text-muted">{u.page_count}페이지</div>
              </div>
              <span className="badge badge-success">업로드 완료</span>
            </div>
          ))}

          {/* Thumbnails for last upload */}
          {uploads[uploads.length - 1].thumbnails.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="text-sm text-muted mb-2">페이지 미리보기</div>
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
      )}

      {/* Feature selection */}
      <div className="card">
        <div className="card-header">기능 선택</div>
        <div className="grid-3">
          {FEATURES.map((f) => (
            <div
              key={f.key}
              onClick={() => goToFeature(f.href)}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 20,
                cursor: uploads.length > 0 ? "pointer" : "not-allowed",
                opacity: uploads.length > 0 ? 1 : 0.5,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (uploads.length > 0) {
                  (e.target as HTMLElement).style.borderColor = "var(--primary)";
                  (e.target as HTMLElement).style.background = "var(--primary-light)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.borderColor = "var(--border)";
                (e.target as HTMLElement).style.background = "";
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
              <div className="text-sm text-muted">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
