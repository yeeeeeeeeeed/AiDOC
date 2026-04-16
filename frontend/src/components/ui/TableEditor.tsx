"use client";

import { useState } from "react";
import type { TableData } from "@/types";

interface Props {
  tables: TableData[];
  onTablesChange: (tables: TableData[]) => void;
}

export default function TableEditor({ tables, onTablesChange }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  const updateCell = (tableIdx: number, rowIdx: number, colIdx: number, value: string) => {
    const updated = [...tables];
    const rows = [...updated[tableIdx].rows];
    const row = [...rows[rowIdx]];
    row[colIdx] = value;
    rows[rowIdx] = row;
    updated[tableIdx] = { ...updated[tableIdx], rows };
    onTablesChange(updated);
  };

  const deleteRow = (tableIdx: number, rowIdx: number) => {
    const updated = [...tables];
    const rows = updated[tableIdx].rows.filter((_, i) => i !== rowIdx);
    updated[tableIdx] = { ...updated[tableIdx], rows };
    onTablesChange(updated);
  };

  const deleteTable = (tableIdx: number) => {
    onTablesChange(tables.filter((_, i) => i !== tableIdx));
    if (activeIdx >= tables.length - 1) setActiveIdx(Math.max(0, tables.length - 2));
  };

  if (tables.length === 0) {
    return <div className="text-muted text-center" style={{ padding: 40 }}>추출된 표가 없습니다.</div>;
  }

  const table = tables[activeIdx];

  return (
    <div>
      {/* Table tabs */}
      <div className="flex gap-2 mb-3" style={{ flexWrap: "wrap" }}>
        {tables.map((t, idx) => (
          <button
            key={idx}
            className={`btn btn-sm ${idx === activeIdx ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveIdx(idx)}
          >
            {t.page ? `[p.${t.page}] ` : ""}
            {t.title || `표 ${idx + 1}`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex-between mb-2">
        <span className="text-sm text-muted">
          {table.headers.length}열 x {table.rows.length}행
        </span>
        <button className="btn btn-danger btn-sm" onClick={() => deleteTable(activeIdx)}>
          이 표 삭제
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
        <table className="table-preview">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              {table.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>
                <td className="text-muted text-sm">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci}>
                    <input
                      value={cell}
                      onChange={(e) => updateCell(activeIdx, ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button
                    className="btn btn-sm"
                    style={{ padding: "2px 6px", fontSize: 11, color: "var(--danger)" }}
                    onClick={() => deleteRow(activeIdx, ri)}
                    title="행 삭제"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
