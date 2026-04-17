"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import PageSelector from "@/components/ui/PageSelector";
import ProgressStream from "@/components/ui/ProgressStream";
import MarkdownView from "@/components/ui/MarkdownView";
import api, { createSSEConnection, drmDownload } from "@/lib/api";
import { saveSession, loadSession, clearSession, saveThumbs, loadThumbs, saveResult, loadResult } from "@/lib/session";
import type { UploadResult, StreamEvent, FileItem, StepStatus } from "@/types";

const SESSION_KEY = "content";

export default function ContentExtractPage() {
  return <Suspense><ContentExtractInner /></Suspense>;
}

function ContentExtractInner() {
  const searchParams = useSearchParams();

  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [contentPages, setContentPages] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "pages">("preview");

  useEffect(() => {
    const jobs = searchParams.get("jobs");
    const jobId = jobs ? jobs.split(",")[0] : loadSession(SESSION_KEY)?.job_id;
    if (!jobId) return;

    api.get<{ status: string; filename: string; page_count: number; thumbnails?: string[] }>(
      `/api/pdf/jobs/${jobId}?with_thumbnails=true`
    )
      .then((data) => {
        const thumbs = data.thumbnails?.length ? data.thumbnails : loadThumbs(SESSION_KEY);
        setUpload({ job_id: jobId, filename: data.filename, page_count: data.page_count, thumbnails: thumbs });
        setSelectedPages(Array.from({ length: data.page_count }, (_, i) => i + 1));
        saveSession(SESSION_KEY, { job_id: jobId, filename: data.filename, page_count: data.page_count });
        // 이전 추출 결과 복원
        const saved = loadResult<Record<string, string>>(SESSION_KEY);
        if (saved && Object.keys(saved).length > 0) setContentPages(saved);
      })
      .catch(() => clearSession(SESSION_KEY));
  }, [searchParams]);

  const handleUploaded = (result: UploadResult) => {
    setUpload(result);
    setSelectedPages(Array.from({ length: result.page_count }, (_, i) => i + 1));
    setContentPages({});
    setError("");
    saveSession(SESSION_KEY, { job_id: result.job_id, filename: result.filename, page_count: result.page_count });
    saveThumbs(SESSION_KEY, result.thumbnails);
  };

  const startExtract = async () => {
    if (!upload || selectedPages.length === 0) return;
    setProcessing(true);
    setError("");
    setContentPages({});

    try {
      await api.post("/api/pdf/extract/content/start", {
        job_id: upload.job_id,
        pages: selectedPages,
        custom_prompt: customPrompt || null,
      });

      createSSEConnection(
        `/api/pdf/extract/content/stream/${upload.job_id}`,
        (data: StreamEvent) => {
          setProgress(data.progress);
          if (data.steps) setSteps(data.steps);
          if (data.content_pages) {
            setContentPages(data.content_pages);
            saveResult(SESSION_KEY, data.content_pages);
            setProcessing(false);
          }
        },
        () => setProcessing(false),
        (err) => {
          setError(err);
          setProcessing(false);
        }
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "추출 시작 실패");
      setProcessing(false);
    }
  };

  const exportDocx = async () => {
    if (!upload) return;
    try {
      const res = await api.post<{ fileItem: FileItem }>("/api/pdf/export/docx", {
        job_id: upload.job_id,
        title: upload.filename.replace(".pdf", ""),
        menu: "내용추출",
      });
      await drmDownload(res.fileItem);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    }
  };

  const fullContent = Object.keys(contentPages)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => contentPages[k])
    .join("\n\n---\n\n");

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>내용 추출</h1>
      <p className="text-muted mb-4">PDF의 모든 내용을 원본 구조 그대로 텍스트로 변환합니다.</p>

      {/* Upload */}
      {!upload && (
        <div className="card">
          <PdfUploader onUploaded={handleUploaded} />
        </div>
      )}

      {/* File info + page selector */}
      {upload && (
        <>
          <div className="card">
            <div className="flex-between">
              <div>
                <span className="font-bold">{upload.filename}</span>
                <span className="text-muted text-sm" style={{ marginLeft: 12 }}>
                  {upload.page_count}페이지
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setUpload(null); setContentPages({}); clearSession(SESSION_KEY); }}>
                다른 파일
              </button>
            </div>
          </div>

          {/* Page selector */}
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

          {/* Custom prompt */}
          <div className="card">
            <div className="card-header">추가 지시 (선택)</div>
            <textarea
              className="textarea"
              placeholder="예: 제목과 본문만 추출해줘, 수식은 LaTeX로 표현해줘..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>

          {/* Start button */}
          <button
            className="btn btn-primary btn-block mb-4"
            onClick={startExtract}
            disabled={processing || selectedPages.length === 0}
          >
            {processing ? "추출 중..." : `내용 추출 시작 (${selectedPages.length}페이지)`}
          </button>
        </>
      )}

      {/* Progress */}
      {processing && (
        <div className="card">
          <ProgressStream progress={progress} steps={steps} statusText="내용 추출 중..." />
        </div>
      )}

      {/* Error */}
      {error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>}

      {/* Results */}
      {fullContent && (
        <div className="card">
          <div className="flex-between mb-3">
            <div className="card-header" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
              추출 결과
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(fullContent)}>
                전체 복사
              </button>
              <button className="btn btn-primary btn-sm" onClick={exportDocx}>
                워드 다운로드
              </button>
            </div>
          </div>

          {/* Tabs: all / per page */}
          <div className="tabs">
            <button className={`tab ${activeTab === "preview" ? "active" : ""}`} onClick={() => setActiveTab("preview")}>
              전체 보기
            </button>
            <button className={`tab ${activeTab === "pages" ? "active" : ""}`} onClick={() => setActiveTab("pages")}>
              페이지별 보기
            </button>
          </div>

          {activeTab === "preview" && <MarkdownView content={fullContent} hideCopy />}
          {activeTab === "pages" &&
            Object.keys(contentPages)
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => (
                <div key={k} style={{ marginBottom: 16 }}>
                  <div className="font-bold mb-2">페이지 {k}</div>
                  <MarkdownView content={contentPages[k]} hideCopy />
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
