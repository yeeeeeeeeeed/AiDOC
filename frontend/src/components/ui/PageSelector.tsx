"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  thumbnails: string[];
  pageCount: number;
  selectedPages: number[];
  onSelectionChange: (pages: number[]) => void;
}

export default function PageSelector({
  thumbnails,
  pageCount,
  selectedPages,
  onSelectionChange,
}: Props) {
  const [previewPage, setPreviewPage] = useState<number | null>(null);

  const togglePage = (page: number) => {
    if (selectedPages.includes(page)) {
      onSelectionChange(selectedPages.filter((p) => p !== page));
    } else {
      onSelectionChange([...selectedPages, page].sort((a, b) => a - b));
    }
  };

  const selectAll = () => {
    onSelectionChange(Array.from({ length: pageCount }, (_, i) => i + 1));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const openPreview = (page: number) => setPreviewPage(page);
  const closePreview = () => setPreviewPage(null);

  const goPrev = useCallback(() => {
    if (previewPage && previewPage > 1) setPreviewPage(previewPage - 1);
  }, [previewPage]);

  const goNext = useCallback(() => {
    if (previewPage && previewPage < pageCount) setPreviewPage(previewPage + 1);
  }, [previewPage, pageCount]);

  useEffect(() => {
    if (previewPage === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewPage, goPrev, goNext]);

  const isPreviewSelected = previewPage !== null && selectedPages.includes(previewPage);

  return (
    <>
      <div className="flex-between mb-3">
        <span className="text-sm text-muted">
          {selectedPages.length} / {pageCount} 페이지 선택
        </span>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={selectAll}>
            전체 선택
          </button>
          <button className="btn btn-secondary btn-sm" onClick={deselectAll}>
            선택 해제
          </button>
        </div>
      </div>

      <div className="thumbnails">
        {thumbnails.map((thumb, idx) => {
          const page = idx + 1;
          const isSelected = selectedPages.includes(page);
          return (
            <div
              key={page}
              className={`thumbnail ${isSelected ? "selected" : ""}`}
            >
              {/* 체크박스 */}
              <div
                className="thumb-checkbox"
                onClick={(e) => { e.stopPropagation(); togglePage(page); }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePage(page)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* 이미지 클릭 → 팝업 */}
              <img
                src={`data:image/png;base64,${thumb}`}
                alt={`페이지 ${page}`}
                onClick={() => openPreview(page)}
                style={{ cursor: "zoom-in" }}
              />
              <span className="page-num">{page}</span>
            </div>
          );
        })}
      </div>

      {/* 팝업 모달 */}
      {previewPage !== null && (
        <div className="page-modal-overlay" onClick={closePreview}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="page-modal-header">
              <div className="flex gap-3" style={{ alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={isPreviewSelected}
                    onChange={() => togglePage(previewPage)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 600 }}>페이지 {previewPage} 선택</span>
                </label>
                <span className="text-sm text-muted">
                  ({selectedPages.length}/{pageCount} 선택됨)
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={closePreview}>
                닫기
              </button>
            </div>

            {/* 이미지 */}
            <div className="page-modal-body">
              <img
                src={`data:image/png;base64,${thumbnails[previewPage - 1]}`}
                alt={`페이지 ${previewPage}`}
                style={{ maxWidth: "100%", maxHeight: "calc(90vh - 120px)", objectFit: "contain" }}
              />
            </div>

            {/* 하단 네비게이션 */}
            <div className="page-modal-footer">
              <button
                className="btn btn-secondary btn-sm"
                onClick={goPrev}
                disabled={previewPage <= 1}
              >
                ← 이전
              </button>
              <span className="text-sm text-muted">
                {previewPage} / {pageCount}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={goNext}
                disabled={previewPage >= pageCount}
              >
                다음 →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
