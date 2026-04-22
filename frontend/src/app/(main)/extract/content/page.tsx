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
  const [activePreset, setActivePreset] = useState("");
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
        (err) => { setError(err); setProcessing(false); }
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

  const hasResult = Object.keys(contentPages).length > 0;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>내용 추출</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#EEF1FF", color: "#2740C7", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>AI</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>PDF의 모든 내용을 원본 구조 그대로 텍스트로 변환합니다</p>

      {!upload && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <PdfUploader onUploaded={handleUploaded} />
        </div>
      )}

      {upload && (
        <>
          {/* File chip */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #EBE8E0",
              borderRadius: 14,
              padding: "14px 20px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div className="pdf-icon">PDF</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{upload.filename}</div>
              <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 2 }}>{upload.page_count}페이지</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setUpload(null); setContentPages({}); clearSession(SESSION_KEY); }}
            >
              다른 파일
            </button>
          </div>

          {upload.thumbnails.length > 0 && !hasResult && (
            <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>페이지 선택</div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 12, color: "#8A9199" }}>{selectedPages.length}/{upload.page_count} 선택</div>
              </div>
              <PageSelector
                thumbnails={upload.thumbnails}
                pageCount={upload.page_count}
                selectedPages={selectedPages}
                onSelectionChange={setSelectedPages}
              />
            </div>
          )}

          {!hasResult && (
            <>
              <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20, marginBottom: 16 }}>
                {/* 빠른 지시 칩 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 6 }}>빠른 지시</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["제목·소제목 구조 유지", "표·수식 텍스트 변환", "각주·참고문헌 포함"].map((t) => {
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
                  placeholder="예: 제목과 본문만 추출해줘, 수식은 LaTeX로 표현해줘..."
                  value={customPrompt}
                  onChange={(e) => { setCustomPrompt(e.target.value); setActivePreset(""); }}
                  style={{ fontSize: 13 }}
                />
              </div>

              <button
                className="btn btn-accent btn-block"
                style={{ marginBottom: 16 }}
                onClick={startExtract}
                disabled={processing || selectedPages.length === 0}
              >
                {processing ? "추출 중..." : `내용 추출 시작 (${selectedPages.length}페이지)`}
              </button>
            </>
          )}
        </>
      )}

      {processing && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <ProgressStream progress={progress} steps={steps} statusText="내용 추출 중..." />
        </div>
      )}

      {error && (
        <div style={{ background: "#FDEBE7", border: "1px solid #C8321E", borderRadius: 14, padding: 16, color: "#C8321E", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {hasResult && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #F1EEE6",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>추출 결과</div>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#E6F6EE", color: "#0E8F5C", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>완료</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(fullContent)}>
              ⎘ 전체 복사
            </button>
            <button className="btn btn-primary btn-sm" onClick={exportDocx}>
              ↓ 워드
            </button>
          </div>

          <div style={{ padding: "0 24px" }}>
            <div className="tabs" style={{ margin: "0 0 0" }}>
              <button className={`tab ${activeTab === "preview" ? "active" : ""}`} onClick={() => setActiveTab("preview")}>
                전체 보기
              </button>
              <button className={`tab ${activeTab === "pages" ? "active" : ""}`} onClick={() => setActiveTab("pages")}>
                페이지별 보기
              </button>
            </div>
          </div>

          <div style={{ padding: "16px 24px 24px" }}>
            {activeTab === "preview" && <MarkdownView content={fullContent} hideCopy />}
            {activeTab === "pages" &&
              Object.keys(contentPages)
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => (
                  <div key={k} style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#8A9199",
                        fontFamily: `"JetBrains Mono", monospace`,
                        marginBottom: 10,
                        letterSpacing: 0.5,
                      }}
                    >
                      PAGE {k}
                    </div>
                    <MarkdownView content={contentPages[k]} hideCopy />
                    <div style={{ height: 1, background: "#F1EEE6", marginTop: 20 }} />
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
