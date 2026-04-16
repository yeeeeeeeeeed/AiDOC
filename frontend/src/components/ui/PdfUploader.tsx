"use client";

import { useState, useRef, useCallback } from "react";
import type { UploadResult } from "@/types";
import api, { drmUpload } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

interface Props {
  onUploaded: (result: UploadResult) => void;
  multiple?: boolean;
}

export default function PdfUploader({ onUploaded, multiple = false }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError("");
      setUploading(true);

      try {
        for (let i = 0; i < (multiple ? files.length : 1); i++) {
          const file = files[i];
          if (!file.name.toLowerCase().endsWith(".pdf")) {
            setError("PDF 파일만 업로드할 수 있습니다.");
            continue;
          }

          let fileItem = null;

          // DRM 업로드 시도 (프록시 사용 가능 시)
          const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
          const isPdf = header[0] === 0x25 && header[1] === 0x50; // %PDF

          if (!isPdf) {
            // DRM 암호화 파일 — TCM 토큰 유무 확인
            const tcmToken = document.cookie
              .split("; ")
              .find((c) => c.startsWith("AXI-TCM-TOKEN="))
              ?.split("=")[1];
            if (!tcmToken) {
              throw new Error(
                "DRM 암호화된 파일입니다. AiDoc에 다시 로그인한 후 업로드해 주세요."
              );
            }
          }

          try {
            const drmRes = await drmUpload(file);
            if (drmRes?.fileItem) {
              fileItem = drmRes.fileItem;
            }
          } catch (drmErr) {
            // DRM 프록시 실패 시 — 파일이 DRM 암호화돼 있으면 직접 업로드 불가
            if (!isPdf) {
              throw new Error(
                "DRM 복호화에 실패했습니다. AiDoc에 다시 로그인한 후 업로드해 주세요."
              );
            }
            // 일반 PDF면 직접 업로드 진행 (DRM 프록시 오류 무시)
            void drmErr;
          }

          const fd = new FormData();
          fd.append("file", file);
          if (fileItem) {
            fd.append("fileItem", JSON.stringify(fileItem));
          }

          const result = await api.uploadForm<UploadResult>("/api/pdf/upload", fd);
          onUploaded(result);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, multiple]
  );

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? "dragover" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>...</div>
            <div>업로드 중...</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12, color: "var(--text-muted)" }}>+</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              PDF 파일을 드래그하거나 클릭하여 업로드
            </div>
            <div className="text-muted text-sm mt-2">
              {multiple ? "여러 파일 선택 가능" : "PDF 파일 1개"}
            </div>
          </div>
        )}
      </div>
      {error && (
        <div style={{ color: "var(--danger)", marginTop: 8, fontSize: 13 }}>{error}</div>
      )}
    </div>
  );
}
