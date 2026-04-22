import React from "react";

export function CardHeader({
  title,
  right,
  filters,
}: {
  title: string;
  right?: React.ReactNode;
  filters?: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: "1px solid #F1EEE6" }}>
      <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", minHeight: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {filters && (
        <div style={{ padding: "12px 20px 14px", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          {filters}
        </div>
      )}
      {/* bottom padding when no filters */}
      {!filters && <div style={{ height: 14 }} />}
    </div>
  );
}

export function CsvIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4, flexShrink: 0 }}>
      <path d="M8 2v9m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
