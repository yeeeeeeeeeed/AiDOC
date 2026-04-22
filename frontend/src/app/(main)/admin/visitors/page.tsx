"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { CardHeader, CsvIcon } from "@/components/admin/CardHeader";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";
const MONO = `"JetBrains Mono", monospace`;

interface DayVisit {
  date: string; total_visits: number; unique_users: number;
  users: { user_id: string; user_name: string }[];
}
interface VisitorEntry {
  user_id: string; user_name?: string; ip?: string; path: string; timestamp: string;
}
interface VisitorSummary {
  date_from: string; date_to: string; total_visits: number; unique_users: number;
  daily: DayVisit[];
  top_users: { user_id: string; user_name: string; visits: number }[];
  entries: VisitorEntry[];
}

function fmtNum(n: number) { return n.toLocaleString("ko-KR"); }

function decodeName(name?: string): string {
  if (!name) return "";
  let v = name;
  for (let i = 0; i < 5; i++) {
    try { const d = decodeURIComponent(v); if (d === v) break; v = d; } catch { break; }
  }
  return v;
}

function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const bom = "﻿";
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function lastWeek() {
  const to = new Date(); const from = new Date();
  from.setDate(to.getDate() - 7);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function VisitorsPage() {
  const [access, setAccess] = useState<{ is_admin: boolean } | null>(null);
  const [dateFrom, setDateFrom] = useState(lastWeek().from);
  const [dateTo, setDateTo] = useState(lastWeek().to);
  const [visitorData, setVisitorData] = useState<VisitorSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json()).then(setAccess).catch(() => {});
  }, []);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      setVisitorData(await api.get<VisitorSummary>(`/api/admin/visitors?date_from=${dateFrom}&date_to=${dateTo}`));
    } catch {} finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { if (access?.is_admin) fetchVisitors(); }, [access]);

  if (access && !access.is_admin) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, marginBottom: 8 }}>방문자 로그</h1>
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#8A9199" }}>관리자만 접근할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  const maxVisitors = Math.max(...(visitorData?.daily.map(d => d.unique_users) ?? [1]), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>방문자 로그</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#F3F2EC", color: "#4A5259", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>⚙ Admin</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>접속 통계 및 상세 방문 로그</p>

      {/* Filter card */}
      <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        <CardHeader
          title="조회 기간"
          filters={
            <>
              <div>
                <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>시작일</div>
                <input type="date" className="input" style={{ width: "auto" }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>종료일</div>
                <input type="date" className="input" style={{ width: "auto" }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={fetchVisitors}>조회</button>
                {visitorData && (
                  <button className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center" }} onClick={() => downloadCsv(
                    ["날짜", "시간", "직번", "이름", "IP", "경로"],
                    (visitorData.entries || []).map(e => {
                      const ts = e.timestamp; const d = ts.slice(0, 10); const t = ts.slice(11, 19);
                      return [d, t, e.user_id, decodeName(e.user_name), e.ip || "", e.path];
                    })
                  , `방문자로그_${dateFrom}_${dateTo}.csv`)}>
                    <CsvIcon />CSV
                  </button>
                )}
              </div>
            </>
          }
        />
      </div>

      {loading && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 60, textAlign: "center", color: "#8A9199", fontSize: 13 }}>
          조회 중...
        </div>
      )}

      {!loading && visitorData && (
        <>
          {/* KPI */}
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>총 방문 수</div>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>
                {fmtNum(visitorData.total_visits)}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>건</span>
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>고유 사용자</div>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>
                {fmtNum(visitorData.unique_users)}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>명</span>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          {visitorData.daily.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>일별 방문자 수</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, paddingBottom: 28, position: "relative" }}>
                {visitorData.daily.map((d) => {
                  const pct = (d.unique_users / maxVisitors) * 100;
                  return (
                    <div
                      key={d.date}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                      title={`${d.date}: ${d.unique_users}명`}
                    >
                      {d.unique_users > 0 && (
                        <div style={{ fontSize: 10, color: "#8A9199", marginBottom: 3, fontFamily: MONO }}>{d.unique_users}</div>
                      )}
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(pct, 3)}%`,
                          background: pct > 0 ? `linear-gradient(to bottom, #3B5BFF, #7B8EFF)` : "#F1EEE6",
                          borderRadius: "3px 3px 0 0",
                          transition: "height 0.3s",
                        }}
                      />
                      <div style={{ fontSize: 10, color: "#8A9199", marginTop: 5, whiteSpace: "nowrap" }}>{d.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top users */}
          {visitorData.top_users && visitorData.top_users.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1EEE6", fontSize: 14, fontWeight: 600 }}>최다 방문 사용자</div>
              <div style={{ padding: "12px 24px" }}>
                {visitorData.top_users.slice(0, 5).map((u, i) => {
                  const maxV = visitorData.top_users[0].visits;
                  return (
                    <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < 4 ? "1px solid #F1EEE6" : "none" }}>
                      <span style={{ fontSize: 12, color: "#8A9199", fontFamily: MONO, width: 20, textAlign: "right" }}>{i + 1}</span>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EEF1FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#2740C7", flexShrink: 0 }}>
                        {decodeName(u.user_name)?.charAt(0) || u.user_id.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{decodeName(u.user_name) || u.user_id}</div>
                        <div style={{ fontSize: 11, color: "#8A9199", fontFamily: MONO }}>{u.user_id}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 80, height: 4, background: "#F1EEE6", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${(u.visits / maxV) * 100}%`, height: "100%", background: "#3B5BFF" }} />
                        </div>
                        <span style={{ fontSize: 12.5, fontFamily: MONO, color: "#4A5259", minWidth: 30, textAlign: "right" }}>{u.visits}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail log */}
          <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
            <CardHeader
              title="상세 로그"
              right={<span style={{ fontSize: 12.5, color: "#8A9199" }}>{fmtNum(visitorData.total_visits)}건</span>}
            />
            <div style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>날짜</th><th>시간</th><th>직번</th><th>이름</th><th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {(visitorData.entries || []).map((e, i) => {
                    const ts = e.timestamp; const d = ts.slice(0, 10); const t = ts.slice(11, 19);
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 11.5, fontFamily: MONO, color: "#8A9199" }}>{d}</td>
                        <td style={{ fontSize: 11.5, fontFamily: MONO }}>{t}</td>
                        <td style={{ fontFamily: MONO, color: "#3B5BFF", fontWeight: 500 }}>{e.user_id}</td>
                        <td style={{ fontWeight: 500 }}>{decodeName(e.user_name)}</td>
                        <td style={{ fontSize: 12, color: "#8A9199", fontFamily: MONO }}>{e.ip || "-"}</td>
                      </tr>
                    );
                  })}
                  {(!visitorData.entries || visitorData.entries.length === 0) && (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#8A9199" }}>데이터 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !visitorData && (
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 60, textAlign: "center", color: "#8A9199", fontSize: 13 }}>
          조회 버튼을 눌러 통계를 확인하세요.
        </div>
      )}
    </div>
  );
}
