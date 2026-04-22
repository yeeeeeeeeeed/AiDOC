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

const SESSION_KEY = "translate";

const TARGET_LANGUAGES = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "ja", label: "일본어" },
  { value: "zh-CN", label: "중국어 (간체)" },
  { value: "zh-TW", label: "중국어 (번체, 대만)" },
  { value: "zh-HK", label: "중국어 (번체, 홍콩)" },
  { value: "vi", label: "베트남어" },
  { value: "th", label: "태국어" },
  { value: "id", label: "인도네시아어" },
  { value: "ms", label: "말레이어" },
  { value: "tl", label: "필리핀어 (타갈로그)" },
  { value: "km", label: "크메르어 (캄보디아)" },
  { value: "my", label: "미얀마어" },
  { value: "de", label: "독일어" },
  { value: "fr", label: "프랑스어" },
  { value: "es", label: "스페인어" },
  { value: "es-AR", label: "스페인어 (아르헨티나)" },
  { value: "pl", label: "폴란드어" },
  { value: "ru", label: "러시아어" },
];

const LANGUAGES = [
  { value: "auto", label: "자동 감지" },
  { value: "en", label: "영어" },
  { value: "ja", label: "일본어" },
  { value: "zh-CN", label: "중국어 (간체)" },
  { value: "zh-TW", label: "중국어 (번체, 대만)" },
  { value: "zh-HK", label: "중국어 (번체, 홍콩)" },
  { value: "vi", label: "베트남어" },
  { value: "th", label: "태국어" },
  { value: "id", label: "인도네시아어" },
  { value: "ms", label: "말레이어" },
  { value: "tl", label: "필리핀어 (타갈로그)" },
  { value: "km", label: "크메르어 (캄보디아)" },
  { value: "my", label: "미얀마어" },
  { value: "de", label: "독일어" },
  { value: "fr", label: "프랑스어" },
  { value: "es", label: "스페인어" },
  { value: "ru", label: "러시아어" },
];

function LangPill({ code, name, active }: { code: string; name: string; active?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: active ? "#EEF1FF" : "#F3F2EC",
        color: active ? "#2740C7" : "#4A5259",
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 600, fontFamily: `"JetBrains Mono", monospace`, fontSize: 10.5, letterSpacing: 0.5 }}>
        {code}
      </span>
      <span>{name}</span>
    </div>
  );
}

export default function TranslatePage() {
  return <Suspense><TranslateInner /></Suspense>;
}

function TranslateInner() {
  const searchParams = useSearchParams();

  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("ko");
  const [customPrompt, setCustomPrompt] = useState("");
  const [activePreset, setActivePreset] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [translatePages, setTranslatePages] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

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
        if (saved && Object.keys(saved).length > 0) setTranslatePages(saved);
      })
      .catch(() => clearSession(SESSION_KEY));
  }, [searchParams]);

  const handleUploaded = (result: UploadResult) => {
    setUpload(result);
    setSelectedPages(Array.from({ length: result.page_count }, (_, i) => i + 1));
    setTranslatePages({});
    setError("");
    saveSession(SESSION_KEY, { job_id: result.job_id, filename: result.filename, page_count: result.page_count });
    saveThumbs(SESSION_KEY, result.thumbnails);
  };

  const startTranslate = async () => {
    if (!upload || selectedPages.length === 0) return;
    setProcessing(true);
    setError("");
    setTranslatePages({});

    try {
      await api.post("/api/pdf/translate/start", {
        job_id: upload.job_id,
        pages: selectedPages,
        source_lang: sourceLang,
        target_lang: targetLang,
        custom_prompt: customPrompt || null,
      });

      createSSEConnection(
        `/api/pdf/translate/stream/${upload.job_id}`,
        (data: StreamEvent) => {
          setProgress(data.progress);
          if (data.steps) setSteps(data.steps);
          if (data.translate_pages) {
            setTranslatePages(data.translate_pages);
            saveResult(SESSION_KEY, data.translate_pages);
            setProcessing(false);
          }
        },
        () => setProcessing(false),
        (err) => { setError(err); setProcessing(false); }
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "번역 시작 실패");
      setProcessing(false);
    }
  };

  const fullContent = Object.keys(translatePages)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => translatePages[k])
    .join("\n\n---\n\n");

  const exportDocx = async () => {
    if (!upload || !fullContent) return;
    try {
      const res = await api.post<{ fileItem: FileItem }>("/api/pdf/export/docx", {
        job_id: upload.job_id,
        content: fullContent,
        title: `${upload.filename} - 번역`,
        menu: "번역",
      });
      await drmDownload(res.fileItem);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    }
  };

  const hasResult = Object.keys(translatePages).length > 0;
  const srcLabel = LANGUAGES.find((l) => l.value === sourceLang)?.label ?? sourceLang;
  const tgtLabel = TARGET_LANGUAGES.find((l) => l.value === targetLang)?.label ?? targetLang;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>번역</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#EEF1FF", color: "#2740C7", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>AI</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>PDF 문서를 원하는 언어로 번역하여 추출합니다</p>

      {!upload && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <PdfUploader onUploaded={handleUploaded} />
        </div>
      )}

      {upload && (
        <>
          {/* File + lang bar */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #EBE8E0",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div className="pdf-icon">PDF</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{upload.filename}</div>
              <div style={{ fontSize: 12, color: "#8A9199", marginTop: 2 }}>{upload.page_count}페이지</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                background: "#FAFAF7",
                border: "1px solid #EBE8E0",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              <LangPill code={sourceLang.toUpperCase().slice(0, 2)} name={srcLabel} />
              <span style={{ color: "#8A9199" }}>→</span>
              <LangPill code={targetLang.toUpperCase().slice(0, 2)} name={tgtLabel} active />
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setUpload(null); setTranslatePages({}); clearSession(SESSION_KEY); }}
            >
              다른 파일
            </button>
          </div>

          {!hasResult && (
            <>
              {upload.thumbnails.length > 0 && (
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

              <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>번역 옵션</div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 6 }}>원문 언어</div>
                      <select className="select" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2, color: "#8A9199", fontSize: 18 }}>
                      →
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 6 }}>번역 대상 언어</div>
                      <select className="select" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                        {TARGET_LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>빠른 지시</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["기술 용어 영문 병기", "경어체 유지", "단락 구조 그대로"].map((t) => {
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

                <div>
                  <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>추가 지시 (선택)</div>
                  <textarea
                    className="textarea"
                    placeholder="예: 기술 용어는 영문 병기, 표는 원문 유지..."
                    value={customPrompt}
                    onChange={(e) => { setCustomPrompt(e.target.value); setActivePreset(""); }}
                    style={{ minHeight: 80, fontSize: 12.5 }}
                  />
                </div>
              </div>

              <button
                onClick={startTranslate}
                disabled={processing || selectedPages.length === 0}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: (processing || selectedPages.length === 0) ? "#EBE8E0" : "#3B5BFF",
                  color: (processing || selectedPages.length === 0) ? "#8A9199" : "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (processing || selectedPages.length === 0) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.12s, color 0.12s",
                  marginBottom: 16,
                }}
              >
                {processing ? "번역 중..." : selectedPages.length === 0 ? "페이지를 선택하세요" : `번역 시작 · ${selectedPages.length}페이지`}
              </button>
            </>
          )}
        </>
      )}

      {processing && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <ProgressStream progress={progress} steps={steps} statusText="번역 중..." />
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>전체 진행률</div>
            <div style={{ flex: 1, height: 6, background: "#F1EEE6", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #3B5BFF, #7B8EFF)",
                  borderRadius: 3,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ fontSize: 12.5, color: "#8A9199", fontFamily: `"JetBrains Mono", monospace` }}>
              {progress}%
            </div>
          </div>
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
            <div style={{ fontSize: 14, fontWeight: 600 }}>번역 결과</div>
            <LangPill code={tgtLabel.slice(0, 2).toUpperCase()} name={tgtLabel} active />
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#E6F6EE", color: "#0E8F5C", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>완료</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(fullContent)}>
              ⎘ 복사
            </button>
            <button className="btn btn-primary btn-sm" onClick={exportDocx}>
              ↓ 워드
            </button>
          </div>
          <div style={{ padding: 24 }}>
            {Object.keys(translatePages)
              .sort((a, b) => Number(a) - Number(b))
              .map((k, idx, arr) => (
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
                  <MarkdownView content={translatePages[k]} hideCopy />
                  {idx < arr.length - 1 && <div style={{ height: 1, background: "#F1EEE6", marginTop: 20 }} />}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
