export const COLORS = {
  bg: "#FAFAF7",
  panel: "#FFFFFF",
  ink: "#0F1419",
  ink2: "#4A5259",
  ink3: "#8A9199",
  line: "#EBE8E0",
  lineSoft: "#F1EEE6",
  side: "#17181C",
  sideInk: "#E5E5E0",
  sideMuted: "#797C82",
  accent: "#3B5BFF",
  accentSoft: "#EEF1FF",
  accentInk: "#2740C7",
  ok: "#0E8F5C",
  okSoft: "#E6F6EE",
  warn: "#B26A00",
  warnSoft: "#FFF2DE",
  danger: "#C8321E",
  dangerSoft: "#FDEBE7",
} as const;

export const FONT = `"Pretendard", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
export const MONO = `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

export const btnPrimary = {
  padding: "8px 14px",
  background: COLORS.ink,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
} as const;

export const btnGhost = {
  padding: "8px 12px",
  background: "transparent",
  color: COLORS.ink2,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 8,
  fontSize: 13,
  cursor: "pointer",
} as const;

export const btnAccent = {
  padding: "10px 18px",
  background: COLORS.accent,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
} as const;

export const cardBase = {
  background: COLORS.panel,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 14,
} as const;
