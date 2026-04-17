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
  { value: "zh-CN", label: "중국어 (간체, 중국 본토)" },
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

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>번역</h1>
      <p className="text-muted mb-4">PDF 문서를 원하는 언어로 번역하여 추출합니다.</p>

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
              <button className="btn btn-secondary btn-sm" onClick={() => { setUpload(null); setTranslatePages({}); clearSession(SESSION_KEY); }}>
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
            <div className="card-header">번역 옵션</div>
            <div className="flex gap-3 mb-3">
              <div>
                <label className="text-sm text-muted">원문 언어</label>
                <select className="select" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted">번역 대상 언어</label>
                <select className="select" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                  {TARGET_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              className="textarea"
              placeholder="추가 지시 (선택): 예) 기술 용어는 영문 병기, 표는 원문 유지..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-block mb-4"
            onClick={startTranslate}
            disabled={processing || selectedPages.length === 0}
          >
            {processing ? "번역 중..." : `번역 시작 (${selectedPages.length}페이지)`}
          </button>
        </>
      )}

      {processing && (
        <div className="card">
          <ProgressStream progress={progress} steps={steps} statusText="번역 중..." />
        </div>
      )}

      {error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>}

      {fullContent && (
        <div className="card">
          <div className="flex-between mb-3">
            <div className="card-header" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
              번역 결과
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
          {Object.keys(translatePages)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => (
              <div key={k} style={{ marginBottom: 16 }}>
                <div className="font-bold mb-2">페이지 {k}</div>
                <MarkdownView content={translatePages[k]} hideCopy />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
