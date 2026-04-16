"use client";

import { useState } from "react";
import PdfUploader from "@/components/ui/PdfUploader";
import MarkdownView from "@/components/ui/MarkdownView";
import api, { createSSEConnection, drmDownload } from "@/lib/api";
import type { UploadResult, StreamEvent, ComparePageResult, FileItem } from "@/types";

export default function ComparePage() {
  const [uploadA, setUploadA] = useState<UploadResult | null>(null);
  const [uploadB, setUploadB] = useState<UploadResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
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
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>PDF 비교</h1>
      <p className="text-muted mb-4">두 PDF의 변경점을 AI가 자동으로 분석합니다.</p>

      <div className="grid-2">
        {/* 원본 */}
        <div className="card">
          <div className="card-header">원본 PDF</div>
          {!uploadA ? (
            <PdfUploader onUploaded={setUploadA} />
          ) : (
            <div className="flex-between">
              <div>
                <div className="font-bold">{uploadA.filename}</div>
                <div className="text-sm text-muted">{uploadA.page_count}페이지</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setUploadA(null)}>변경</button>
            </div>
          )}
        </div>

        {/* 수정본 */}
        <div className="card">
          <div className="card-header">수정본 PDF</div>
          {!uploadB ? (
            <PdfUploader onUploaded={setUploadB} />
          ) : (
            <div className="flex-between">
              <div>
                <div className="font-bold">{uploadB.filename}</div>
                <div className="text-sm text-muted">{uploadB.page_count}페이지</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setUploadB(null)}>변경</button>
            </div>
          )}
        </div>
      </div>

      {uploadA && uploadB && (
        <>
          <div className="card">
            <div className="card-header">추가 지시 (선택)</div>
            <textarea
              className="textarea"
              placeholder="예: 단가 변경만 비교, 조항 변경 위주로 분석..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-block mb-4" onClick={startCompare} disabled={processing}>
            {processing ? "비교 중..." : "비교 시작"}
          </button>
        </>
      )}

      {processing && (
        <div className="card">
          <div className="flex-between mb-2">
            <span className="text-sm font-bold">비교 중...</span>
            <span className="text-sm text-muted">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>}

      {results.length > 0 && (
        <div className="card">
          <div className="flex-between mb-3">
            <div className="card-header" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
              비교 결과 ({results.length}페이지)
            </div>
            <button className="btn btn-primary btn-sm" onClick={exportDocx}>워드 다운로드</button>
          </div>
          {results.map((r) => (
            <div key={r.page} style={{ marginBottom: 16 }}>
              <div className="flex-between mb-2">
                <span className="font-bold">페이지 {r.page}</span>
                {r.status === "done" && <span className="badge badge-success">완료</span>}
                {r.status === "error" && <span className="badge badge-danger">오류: {r.detail}</span>}
              </div>
              {r.diff && <MarkdownView content={r.diff} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
