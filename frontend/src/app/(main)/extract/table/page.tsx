"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import PageSelector from "@/components/ui/PageSelector";
import ProgressStream from "@/components/ui/ProgressStream";
import TableEditor from "@/components/ui/TableEditor";
import api, { createSSEConnection, drmDownload } from "@/lib/api";
import type { UploadResult, StreamEvent, TableData, FileItem, StepStatus } from "@/types";

export default function TableExtractPage() {
  return <Suspense><TableExtractInner /></Suspense>;
}

function TableExtractInner() {
  const searchParams = useSearchParams();

  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
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
    setTables([]);
    setError("");
  };

  const startExtract = async () => {
    if (!upload || selectedPages.length === 0) return;
    setProcessing(true);
    setError("");
    setTables([]);

    try {
      await api.post("/api/pdf/extract/table/start", {
        job_id: upload.job_id,
        pages: selectedPages,
        custom_prompt: customPrompt || null,
      });

      createSSEConnection(
        `/api/pdf/extract/table/stream/${upload.job_id}`,
        (data: StreamEvent) => {
          setProgress(data.progress);
          if (data.steps) setSteps(data.steps);
          if (data.tables) {
            setTables(data.tables);
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

  const exportExcel = async () => {
    if (!upload) return;
    try {
      const res = await api.post<{ fileItem: FileItem }>("/api/pdf/export/excel", {
        job_id: upload.job_id,
        tables,
      });
      await drmDownload(res.fileItem);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>표 추출</h1>
      <p className="text-muted mb-4">PDF에서 표를 감지하여 편집 가능한 엑셀로 변환합니다.</p>

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
                <span className="text-muted text-sm" style={{ marginLeft: 12 }}>
                  {upload.page_count}페이지
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setUpload(null); setTables([]); }}>
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
            <div className="card-header">추가 지시 (선택)</div>
            <textarea
              className="textarea"
              placeholder='예: 단가 컬럼만 추출, 합계 행 제외, "규격" 열 기준으로 분리...'
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-block mb-4"
            onClick={startExtract}
            disabled={processing || selectedPages.length === 0}
          >
            {processing ? "추출 중..." : `표 추출 시작 (${selectedPages.length}페이지)`}
          </button>
        </>
      )}

      {processing && (
        <div className="card">
          <ProgressStream progress={progress} steps={steps} statusText="표 추출 중..." />
        </div>
      )}

      {error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>{error}</div>}

      {tables.length > 0 && (
        <div className="card">
          <div className="flex-between mb-3">
            <div className="card-header" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
              추출 결과 ({tables.length}개 표)
            </div>
            <button className="btn btn-primary btn-sm" onClick={exportExcel}>
              엑셀 다운로드
            </button>
          </div>
          <TableEditor tables={tables} onTablesChange={setTables} />
        </div>
      )}
    </div>
  );
}
