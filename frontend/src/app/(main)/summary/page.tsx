"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import PageSelector from "@/components/ui/PageSelector";
import MarkdownView from "@/components/ui/MarkdownView";
import api, { createSSEConnection, drmDownload } from "@/lib/api";
import { saveSession, loadSession, clearSession, saveThumbs, loadThumbs, saveResult, loadResult } from "@/lib/session";
import type { UploadResult, StreamEvent, FileItem } from "@/types";

const SESSION_KEY = "summary";

export default function SummaryPage() {
  return <Suspense><SummaryInner /></Suspense>;
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s, transform 0.2s",
        background: "#0F1419",
        color: "#fff",
        borderRadius: 8,
        padding: "10px 18px",
        fontSize: 13,
        fontWeight: 500,
        pointerEvents: "none",
        zIndex: 9999,
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}

function SummaryInner() {
  const searchParams = useSearchParams();

  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [length, setLength] = useState<"short" | "medium" | "detailed">("medium");
  const [customPrompt, setCustomPrompt] = useState("");
  const [activePreset, setActivePreset] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const saved = loadResult<string>(SESSION_KEY);
        if (saved) setSummary(saved);
      })
      .catch(() => clearSession(SESSION_KEY));
  }, [searchParams]);

  const showToast = () => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  };

  const handleChipClick = (t: string) => {
    if (activePreset === t) {
      setActivePreset("");
      setCustomPrompt("");
    } else {
      setActivePreset(t);
      setCustomPrompt(t);
      showToast();
    }
  };

  const handleUploaded = (result: UploadResult) => {
    setUpload(result);
    setSelectedPages(Array.from({ length: result.page_count }, (_, i) => i + 1));
    setSummary("");
    setError("");
    saveSession(SESSION_KEY, { job_id: result.job_id, filename: result.filename, page_count: result.page_count });
    saveThumbs(SESSION_KEY, result.thumbnails);
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
            saveResult(SESSION_KEY, data.result);
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
        menu: "요약",
      });
      await drmDownload(res.fileItem);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    }
  };

  const LENGTH_OPTIONS = [
    { k: "short" as const, l: "간단", s: "3~5문장" },
    { k: "medium" as const, l: "보통", s: "반 페이지" },
    { k: "detailed" as const, l: "상세", s: "1~2p" },
  ];

  const PRESETS = ["계약서 핵심 조항만", "숫자·금액 중심", "실행 체크리스트"];

  const ctaDisabled = processing || selectedPages.length === 0;

  return (
    <div>
      <Toast message="빠른 지시가 적용되었습니다" visible={toastVisible} />

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>문서 요약</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#EEF1FF", color: "#2740C7", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>AI</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>AI가 PDF 문서를 분석하여 핵심 내용을 요약합니다</p>

      {!upload && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <PdfUploader onUploaded={handleUploaded} />
        </div>
      )}

      {upload && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* File chip */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #EBE8E0",
              borderRadius: 14,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div className="pdf-icon">PDF</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{upload.filename}</div>
              <div style={{ fontSize: 12, color: "#8A9199", marginTop: 2 }}>{upload.page_count}페이지</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setUpload(null); setSummary(""); clearSession(SESSION_KEY); }}
            >
              다른 파일
            </button>
          </div>

          {/* Page selector */}
          {upload.thumbnails.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>페이지 선택</div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 12, color: "#8A9199" }}>
                  {selectedPages.length}/{upload.page_count} 선택
                </div>
              </div>
              <PageSelector
                thumbnails={upload.thumbnails}
                pageCount={upload.page_count}
                selectedPages={selectedPages}
                onSelectionChange={setSelectedPages}
              />
            </div>
          )}

          {/* Options card */}
          <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>요약 옵션</div>

            {/* 요약 길이 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>요약 길이</div>
              <div style={{ display: "inline-flex", border: "1px solid #EBE8E0", borderRadius: 8, overflow: "hidden" }}>
                {LENGTH_OPTIONS.map((o, idx) => (
                  <button
                    key={o.k}
                    onClick={() => setLength(o.k)}
                    style={{
                      minWidth: 72,
                      padding: "8px 10px",
                      textAlign: "center",
                      border: "none",
                      borderLeft: idx > 0 ? "1px solid #EBE8E0" : "none",
                      background: length === o.k ? "#0F1419" : "#fff",
                      color: length === o.k ? "#fff" : "#0F1419",
                      cursor: "pointer",
                      transition: "background 0.12s, color 0.12s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      if (length !== o.k) {
                        const el = e.currentTarget;
                        el.style.background = "rgba(15,20,25,0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (length !== o.k) {
                        e.currentTarget.style.background = "#fff";
                      }
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{o.l}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.65, marginTop: 2 }}>{o.s}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 빠른 지시 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>빠른 지시</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PRESETS.map((t) => {
                  const active = activePreset === t;
                  return (
                    <button
                      key={t}
                      onClick={() => handleChipClick(t)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: active ? "2px solid #3B5BFF" : "1px solid #EBE8E0",
                        background: active ? "#EEF1FF" : "#FAFAF7",
                        fontSize: 11.5,
                        color: active ? "#2740C7" : "#4A5259",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "border-color 0.12s, color 0.12s, background 0.12s",
                      }}
                      onMouseEnter={(e) => { if (!active) { const el = e.currentTarget; el.style.borderColor = "#3B5BFF"; el.style.color = "#3B5BFF"; } }}
                      onMouseLeave={(e) => { if (!active) { const el = e.currentTarget; el.style.borderColor = "#EBE8E0"; el.style.color = "#4A5259"; } }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 추가 지시 */}
            <div>
              <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>추가 지시 (선택)</div>
              <textarea
                className="textarea"
                placeholder="예) 계약 조건과 숫자 데이터 위주로 요약, bullet 형식 선호"
                value={customPrompt}
                onChange={(e) => { setCustomPrompt(e.target.value); setActivePreset(""); }}
                style={{ minHeight: 80, fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* 풀폭 CTA */}
          <button
            onClick={startSummary}
            disabled={ctaDisabled}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 10,
              border: "none",
              background: ctaDisabled ? "#EBE8E0" : "#3B5BFF",
              color: ctaDisabled ? "#8A9199" : "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: ctaDisabled ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.12s, color 0.12s",
            }}
          >
            {processing ? "요약 중..." : selectedPages.length === 0 ? "페이지를 선택하세요" : `요약 시작 · ${selectedPages.length}페이지`}
          </button>

          {/* Progress */}
          {processing && (
            <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>요약 중...</span>
                <span style={{ fontSize: 12.5, color: "#8A9199" }}>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#FDEBE7", border: "1px solid #C8321E", borderRadius: 14, padding: 16, color: "#C8321E", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Result or placeholder */}
          {summary ? (
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
                <div style={{ fontSize: 14, fontWeight: 600 }}>요약 결과</div>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#E6F6EE", color: "#0E8F5C", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>완료</span>
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigator.clipboard.writeText(summary)}
                >
                  ⎘ 복사
                </button>
                <button className="btn btn-primary btn-sm" onClick={exportDocx}>
                  ↓ 워드
                </button>
              </div>
              <div style={{ padding: 24 }}>
                <MarkdownView content={summary} hideCopy />
              </div>
            </div>
          ) : !processing && (
            <div
              style={{
                border: "1px dashed #EBE8E0",
                borderRadius: 14,
                padding: 48,
                minHeight: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 24, color: "#8A9199", lineHeight: 1 }}>≡</div>
              <div style={{ fontSize: 13, color: "#8A9199", textAlign: "center" }}>
                페이지를 선택하고 요약을 시작하면 결과가 여기에 표시됩니다
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#F1EEE6", color: "#8A9199", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
                대기
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
