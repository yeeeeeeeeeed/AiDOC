"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PdfUploader from "@/components/ui/PdfUploader";
import PageSelector from "@/components/ui/PageSelector";
import ProgressStream from "@/components/ui/ProgressStream";
import TableEditor from "@/components/ui/TableEditor";
import api, { createSSEConnection, drmDownload } from "@/lib/api";
import { saveSession, loadSession, clearSession, saveThumbs, loadThumbs, saveResult, loadResult } from "@/lib/session";
import type { UploadResult, StreamEvent, TableData, FileItem, StepStatus } from "@/types";

const SESSION_KEY = "table";

export default function TableExtractPage() {
  return <Suspense><TableExtractInner /></Suspense>;
}

function Stepper({ step }: { step: number }) {
  const steps = [
    { label: "업로드",    desc: "PDF 선택" },
    { label: "페이지 선택", desc: "범위 지정" },
    { label: "추출 미리보기", desc: "표 감지 · 변환" },
  ];
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #EBE8E0",
        borderRadius: 14,
        padding: "16px 24px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        minWidth: 0,
      }}
    >
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          {/* Step item — flex:none so it always sizes to content */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: i < step ? "#0E8F5C" : i === step ? "#3B5BFF" : "#EBE8E0",
                color: i <= step ? "#fff" : "#8A9199",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: i <= step ? "#0F1419" : "#8A9199",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {s.label}
              </div>
              <div style={{ fontSize: 11.5, color: "#8A9199" }}>{s.desc}</div>
            </div>
          </div>
          {/* Connector — only between items, flex:1 to fill space */}
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: "#EBE8E0", margin: "0 16px", minWidth: 24 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function TableExtractInner() {
  const searchParams = useSearchParams();

  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [activePreset, setActivePreset] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTable, setActiveTable] = useState(0);
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
        const saved = loadResult<TableData[]>(SESSION_KEY);
        if (saved && saved.length > 0) setTables(saved);
      })
      .catch(() => clearSession(SESSION_KEY));
  }, [searchParams]);

  const handleUploaded = (result: UploadResult) => {
    setUpload(result);
    setSelectedPages(Array.from({ length: result.page_count }, (_, i) => i + 1));
    setTables([]);
    setError("");
    saveSession(SESSION_KEY, { job_id: result.job_id, filename: result.filename, page_count: result.page_count });
    saveThumbs(SESSION_KEY, result.thumbnails);
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
            saveResult(SESSION_KEY, data.tables);
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

  const exportCsv = async () => {
    if (!upload || tables.length === 0) return;
    const t = tables[activeTable];
    if (!t) return;
    const rows = [t.headers, ...t.rows];
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${t.title || "표"}.csv`;
    a.click();
  };

  const currentStep = !upload ? 0 : tables.length === 0 ? 1 : 2;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>표 추출</h1>
        {tables.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#E6F6EE", color: "#0E8F5C", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
            {tables.length}개 표 감지
          </span>
        )}
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>PDF에서 표를 감지하여 편집 가능한 엑셀로 변환합니다</p>

      {/* Stepper */}
      <Stepper step={currentStep} />

      {/* Upload */}
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
              padding: "16px 20px",
              marginBottom: 16,
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
              onClick={() => { setUpload(null); setTables([]); clearSession(SESSION_KEY); }}
            >
              다른 파일
            </button>
          </div>

          {upload.thumbnails.length > 0 && tables.length === 0 && (
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

          {tables.length === 0 && (
            <>
              <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>추출 옵션</div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>빠른 지시</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["빈 셀 '-' 표기", "숫자 천 단위 콤마", "합계 행 강조 표시"].map((t) => {
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
                    placeholder='예: 단가 컬럼만 추출, 합계 행 제외, "규격" 열 기준으로 분리...'
                    value={customPrompt}
                    onChange={(e) => { setCustomPrompt(e.target.value); setActivePreset(""); }}
                    style={{ minHeight: 80, fontSize: 12.5 }}
                  />
                </div>
              </div>

              <button
                onClick={startExtract}
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
                {processing ? "추출 중..." : selectedPages.length === 0 ? "페이지를 선택하세요" : `표 추출 시작 · ${selectedPages.length}페이지`}
              </button>
            </>
          )}
        </>
      )}

      {processing && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <ProgressStream progress={progress} steps={steps} statusText="표 추출 중..." />
        </div>
      )}

      {error && (
        <div style={{ background: "#FDEBE7", border: "1px solid #C8321E", borderRadius: 14, padding: 16, color: "#C8321E", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {tables.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
          {/* Table header */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #F1EEE6",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {tables[activeTable]?.title || `표 ${activeTable + 1}`}
            </div>
            {tables[activeTable] && (
              <span style={{ fontSize: 12, color: "#8A9199" }}>
                {tables[activeTable].rows.length}행 × {tables[activeTable].headers.length}열
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-sm" onClick={exportCsv}>↓ CSV</button>
            <button
              className="btn btn-primary btn-sm"
              style={{ background: "#0E8F5C" }}
              onClick={exportExcel}
            >
              ↓ 엑셀 다운로드
            </button>
          </div>

          {/* Table editor */}
          <TableEditor
            tables={[tables[activeTable]]}
            onTablesChange={(updated) => {
              const next = [...tables];
              next[activeTable] = updated[0];
              setTables(next);
            }}
          />

          {/* Tabs */}
          <div
            style={{
              padding: "10px 20px",
              borderTop: "1px solid #F1EEE6",
              display: "flex",
              gap: 6,
              fontSize: 12,
            }}
          >
            {tables.map((t, i) => (
              <div
                key={i}
                onClick={() => setActiveTable(i)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: i === activeTable ? "#0F1419" : "transparent",
                  color: i === activeTable ? "#fff" : "#8A9199",
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                {t.title || `표 ${i + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info banner */}
      {tables.length > 0 && (
        <div
          style={{
            background: "#EEF1FF",
            borderRadius: 10,
            padding: "12px 18px",
            marginTop: 12,
            fontSize: 12.5,
            color: "#2740C7",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 15 }}>💡</span>
          <span>셀을 클릭하여 직접 편집할 수 있습니다. 엑셀 다운로드 시 수정 내용이 반영됩니다.</span>
        </div>
      )}
    </div>
  );
}
