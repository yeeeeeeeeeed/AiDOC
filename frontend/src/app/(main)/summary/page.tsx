"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import PageSelector from "@/components/ui/PageSelector";
import MarkdownView from "@/components/ui/MarkdownView";
import api, { createSSEConnection, drmDownload } from "@/lib/api";
import type { UploadResult, StreamEvent, FileItem } from "@/types";

export default function SummaryPage() {
  return <Suspense><SummaryInner /></Suspense>;
}

function SummaryInner() {
  const searchParams = useSearchParams();

  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [length, setLength] = useState<"short" | "medium" | "detailed">("medium");
  const [customPrompt, setCustomPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const jobs = searchParams.get("jobs");
    if (jobs) {
      const jobId = jobs.split(",")[0];
      api.get<{ status: string; filename: string; page_count: number }>(`/api/pdf/jobs/${jobId}`)
        .then((data) => {
          setUpload({ job_id: jobId, filename: data.filename, page_count: data.page_count, thumbnails: [] });
          setSelectedPages(Array.from({ length: data.page_count }, (_, i) => i + 1));
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const handleUploaded = (result: UploadResult) => {
    setUpload(result);
    setSelectedPages(Array.from({ length: result.page_count }, (_, i) => i + 1));
    setSummary("");
    setError("");
  };

  const startSummary = async () => {
    if (!upload || selectedPages.length === 0) return;
    setProcessing(true);
    setError("");
    setSummary("");

    try {
      await api.post("/api/pdf/summary/start", {
        job_id: upload.job_id,
        pages: selectedPages,
        length,
        custom_prompt: customPrompt || null,
      });

      createSSEConnection(
        `/api/pdf/summary/stream/${upload.job_id}`,
        (data: StreamEvent) => {
          setProgress(data.progress);
          if (data.result) {
            setSummary(data.result);
            setProcessing(false);
          }
        },
        () => setProcessing(false),
        (err) => { setError(err); setProcessing(false); }
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "요약 시작 실패");
      setProcessing(false);
    }
  };

  const exportDocx = async () => {
    if (!upload || !summary) return;
    try {
      const res = await api.post<{ fileItem: FileItem }>("/api/pdf/export/docx", {
        job_id: upload.job_id,
        content: summary,
        title: `${upload.filename} - 요약`,
      });
      await drmDownload(res.fileItem);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>문서 요약</h1>
      <p className="text-muted mb-4">AI가 PDF 문서를 분석하여 핵심 내용을 요약합니다.</p>

      {!upload && (
        <div className="card">
          <PdfUploader onUploaded={handleUploaded} />
        </div>
      )}

      {upload && (
        <>
          <div className="card">
            <div className="flex-between">
              <div>
                <span className="font-bold">{upload.filename}</span>
                <span className="text-muted text-sm" style={{ marginLeft: 12 }}>{upload.page_count}페이지</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setUpload(null); setSummary(""); }}>
                다른 파일
              </button>
            </div>
          </div>

          {upload.thumbnails.length > 0 && (
            <div className="card">
              <div className="card-header">페이지 선택</div>
              <PageSelector
                thumbnails={upload.thumbnails}
                pageCount={upload.page_count}
                selectedPages={selectedPages}
                onSelectionChange={setSelectedPages}
              />
            </div>
          )}

          <div className="card">
            <div className="card-header">요약 옵션</div>
            <div className="flex gap-3 mb-3">
              {(["short", "medium", "detailed"] as const).map((l) => (
                <button
                  key={l}
                  className={`btn btn-sm ${length === l ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setLength(l)}
                >
                  {{ short: "간단 (3~5문장)", medium: "보통 (반 페이지)", detailed: "상세 (1~2페이지)" }[l]}
                </button>
              ))}
            </div>
            <textarea
              className="textarea"
              placeholder="추가 지시 (선택): 예) 계약 조건 위주로 요약, 숫자 데이터 포함..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-block mb-4"
            onClick={startSummary}
            disabled={processing || selectedPages.length === 0}
          >
            {processing ? "요약 중..." : `요약 시작 (${selectedPages.length}페이지)`}
          </button>
        </>
      )}

      {processing && (
        <div className="card">
          <div className="flex-between mb-2">
            <span className="text-sm font-bold">요약 중...</span>
            <span className="text-sm text-muted">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>}

      {summary && (
        <div className="card">
          <div className="flex-between mb-3">
            <div className="card-header" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
              요약 결과
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(summary)}>
                복사
              </button>
              <button className="btn btn-primary btn-sm" onClick={exportDocx}>
                워드 다운로드
              </button>
            </div>
          </div>
          <MarkdownView content={summary} />
        </div>
      )}
    </div>
  );
}
