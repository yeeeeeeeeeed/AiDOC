"use client";

import { useState } from "react";
import PdfUploader from "@/components/ui/PdfUploader";
import MarkdownView from "@/components/ui/MarkdownView";
import api, { createSSEConnection, drmDownload } from "@/lib/api";
import type { UploadResult, StreamEvent, ComparePageResult, FileItem } from "@/types";

function FileSlot({
  label,
  isAccent,
  upload,
  onUpload,
  onClear,
}: {
  label: string;
  isAccent?: boolean;
  upload: UploadResult | null;
  onUpload: (r: UploadResult) => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${isAccent ? "#3B5BFF" : "#EBE8E0"}`,
        boxShadow: isAccent ? "0 0 0 3px #EEF1FF" : "none",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: isAccent ? "#3B5BFF" : "#8A9199",
          fontWeight: 600,
          marginBottom: 10,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      {!upload ? (
        <PdfUploader onUploaded={onUpload} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="pdf-icon">PDF</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{upload.filename}</div>
            <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 2 }}>{upload.page_count}페이지</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClear}>변경</button>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [uploadA, setUploadA] = useState<UploadResult | null>(null);
  const [uploadB, setUploadB] = useState<UploadResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [activePreset, setActivePreset] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ComparePageResult[]>([]);
  const [error, setError] = useState("");

  const startCompare = async () => {
    if (!uploadA || !uploadB) return;
    setProcessing(true);
    setError("");
    setResults([]);

    try {
      const res = await api.post<{ compare_id: string }>("/api/pdf/compare/start", {
        job_id_a: uploadA.job_id,
        job_id_b: uploadB.job_id,
        custom_prompt: customPrompt || null,
      });

      createSSEConnection(
        `/api/pdf/compare/stream/${res.compare_id}`,
        (data: StreamEvent) => {
          setProgress(data.progress);
          if (data.results) {
            setResults(data.results);
            setProcessing(false);
          }
        },
        () => setProcessing(false),
        (err) => { setError(err); setProcessing(false); }
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "비교 시작 실패");
      setProcessing(false);
    }
  };

  const fullDiff = results
    .filter((r) => r.diff)
    .map((r) => `## 페이지 ${r.page}\n\n${r.diff}`)
    .join("\n\n---\n\n");

  const exportDocx = async () => {
    if (!uploadA || !fullDiff) return;
    try {
      const res = await api.post<{ fileItem: FileItem }>("/api/pdf/export/docx", {
        job_id: uploadA.job_id,
        content: fullDiff,
        title: "PDF 비교 결과",
      });
      await drmDownload(res.fileItem);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    }
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>PDF 비교</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#EEF1FF", color: "#2740C7", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>AI</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>두 PDF의 변경점을 AI가 자동으로 분석합니다</p>

      {/* Upload slots */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <FileSlot label="원본" upload={uploadA} onUpload={setUploadA} onClear={() => setUploadA(null)} />
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#fff",
            border: "1px solid #EBE8E0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8A9199",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ⇄
        </div>
        <FileSlot label="수정본" isAccent upload={uploadB} onUpload={setUploadB} onClear={() => setUploadB(null)} />
      </div>

      {uploadA && uploadB && (
        <>
          <div
            style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20, marginBottom: 16 }}
          >
            {/* 빠른 지시 칩 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 6 }}>빠른 지시</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["변경 항목만 추출", "추가·삭제 구분 표시", "조항 번호 기준 정렬"].map((t) => {
                  const active = activePreset === t;
                  return (
                    <button key={t} onClick={() => { setCustomPrompt(t); setActivePreset(t); }}
                      style={{ padding: "6px 10px", borderRadius: 999, border: active ? "2px solid #3B5BFF" : "1px solid #EBE8E0", background: active ? "#EEF1FF" : "#FAFAF7", fontSize: 11.5, color: active ? "#2740C7" : "#4A5259", cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.12s, color 0.12s, background 0.12s" }}
                      onMouseEnter={(e) => { if (!active) { const el = e.currentTarget; el.style.borderColor = "#3B5BFF"; el.style.color = "#3B5BFF"; } }}
                      onMouseLeave={(e) => { if (!active) { const el = e.currentTarget; el.style.borderColor = "#EBE8E0"; el.style.color = "#4A5259"; } }}
                    >{t}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>추가 지시 (선택)</div>
            <textarea
              className="textarea"
              placeholder="예: 단가 변경만 비교, 조항 변경 위주로 분석..."
              value={customPrompt}
              onChange={(e) => { setCustomPrompt(e.target.value); setActivePreset(""); }}
              style={{ fontSize: 13 }}
            />
          </div>

          <button
            className="btn btn-accent btn-block"
            style={{ marginBottom: 16 }}
            onClick={startCompare}
            disabled={processing}
          >
            {processing ? "비교 중..." : "비교 시작"}
          </button>
        </>
      )}

      {processing && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>비교 중...</span>
            <span style={{ fontSize: 12.5, color: "#8A9199" }}>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "#FDEBE7", border: "1px solid #C8321E", borderRadius: 14, padding: 16, color: "#C8321E", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #F1EEE6",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>비교 결과</div>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#EEF1FF", color: "#2740C7", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
              {results.length}페이지
            </span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={exportDocx}>↓ 워드</button>
          </div>
          <div style={{ padding: 24 }}>
            {results.map((r) => (
              <div
                key={r.page}
                style={{
                  marginBottom: 20,
                  paddingBottom: 20,
                  borderBottom: "1px solid #F1EEE6",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>페이지 {r.page}</span>
                  {r.status === "done" && (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#E6F6EE", color: "#0E8F5C", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>완료</span>
                  )}
                  {r.status === "error" && (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#FDEBE7", color: "#C8321E", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>오류: {r.detail}</span>
                  )}
                </div>
                {r.diff && <MarkdownView content={r.diff} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
