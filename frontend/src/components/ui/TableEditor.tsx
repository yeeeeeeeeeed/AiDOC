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
      {/* Show tabs only when multiple tables and no external tab control */}
      {tables.length > 1 && (
        <div style={{ display: "flex", gap: 6, padding: "10px 20px", borderBottom: "1px solid #F1EEE6" }}>
          {tables.map((t, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIdx(idx)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: idx === activeIdx ? "#0F1419" : "transparent",
                color: idx === activeIdx ? "#fff" : "#8A9199",
                cursor: "pointer",
                fontSize: 12,
                transition: "all 0.12s",
              }}
            >
              {t.title || `표 ${idx + 1}`}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
        <table className="table-preview">
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: "center" }}>#</th>
              {table.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>
                <td style={{ textAlign: "center", color: "#8A9199", fontSize: 11.5, fontFamily: "var(--mono)" }}>{ri + 1}</td>
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
                    style={{
                      background: "none",
                      border: "none",
                      color: "#8A9199",
                      cursor: "pointer",
                      fontSize: 13,
                      padding: "2px 6px",
                      borderRadius: 4,
                      lineHeight: 1,
                    }}
                    onClick={() => deleteRow(activeIdx, ri)}
                    title="행 삭제"
                  >
                    ×
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
