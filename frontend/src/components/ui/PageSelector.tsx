"use client";

import { useState } from "react";

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

  return (
    <div>
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
              onClick={() => togglePage(page)}
            >
              <img src={`data:image/png;base64,${thumb}`} alt={`페이지 ${page}`} />
              <span className="page-num">{page}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
