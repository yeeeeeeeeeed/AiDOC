"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { HistoryItem, AccessCheck } from "@/types";
import { CardHeader, CsvIcon } from "@/components/admin/CardHeader";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";
const MONO = `"JetBrains Mono", monospace`;

function decodeName(name?: string): string {
  if (!name) return "";
  let v = name;
  for (let i = 0; i < 5; i++) {
    try { const d = decodeURIComponent(v); if (d === v) break; v = d; } catch (_e) { break; }
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

function fmtNum(n: number) { return n.toLocaleString("ko-KR"); }

const MENU_BADGE: Record<string, { bg: string; color: string }> = {
  요약: { bg: "#FFF2DE", color: "#B26A00" },
  번역: { bg: "#FDEBE7", color: "#C8321E" },
  표추출: { bg: "#E6F6EE", color: "#0E8F5C" },
  비교: { bg: "#EEF1FF", color: "#2740C7" },
  내용추출: { bg: "#F3F2EC", color: "#4A5259" },
};

function MenuBadge({ menu }: { menu: string }) {
  const s = MENU_BADGE[menu] || { bg: "#F3F2EC", color: "#4A5259" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: s.bg, color: s.color, borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
      {menu}
    </span>
  );
}

interface AdminEntry { user_id: string; user_name: string; }

function AdminManager() {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [newId, setNewId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/admin/users`, { credentials: "include" });
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err) { console.error("[history] fetch error:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addAdmin = async () => {
    if (!newId.trim()) return;
    const res = await fetch(`${BACKEND}/api/admin/users/add`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: newId.trim() }),
    });
    if (res.ok) { setMsgOk(true); setMsg(`${newId} 관리자 추가 완료`); setNewId(""); load(); }
    else { setMsgOk(false); setMsg("오류: 권한이 없거나 요청이 실패했습니다."); }
  };

  const removeAdmin = async (uid: string) => {
    if (!confirm(`${uid} 을 관리자에서 삭제하시겠습니까?`)) return;
    await fetch(`${BACKEND}/api/admin/users/remove`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: uid }),
    });
    setMsgOk(true); setMsg(`${uid} 삭제 완료`); load();
  };

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #EBE8E0" }}>관리자 추가</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 6 }}>직번 (사용자 ID)</div>
            <input
              className="input"
              placeholder="예: 162264"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAdmin()}
            />
          </div>
          <button className="btn btn-primary" onClick={addAdmin}>추가</button>
        </div>
        {msg && (
          <p style={{ fontSize: 12.5, marginTop: 10, color: msgOk ? "#0E8F5C" : "#C8321E" }}>{msg}</p>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1EEE6", fontSize: 14, fontWeight: 600 }}>관리자 목록</div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8A9199", fontSize: 13 }}>불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>직번</th>
                <th>이름</th>
                <th>권한</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.user_id}>
                  <td style={{ fontFamily: MONO, color: "#3B5BFF", fontWeight: 500 }}>{a.user_id}</td>
                  <td style={{ fontWeight: 500 }}>{decodeName(a.user_name) || <span style={{ color: "#8A9199" }}>-</span>}</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#EEF1FF", color: "#2740C7", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>관리자</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => removeAdmin(a.user_id)}>삭제</button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#8A9199" }}>등록된 관리자 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ── 방문자 로그 타입 ─────────────────────────────────────────────────────────

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

function VisitorsTab() {
  const [dateFrom, setDateFrom] = useState(lastWeek().from);
  const [dateTo, setDateTo] = useState(lastWeek().to);
  const [visitorData, setVisitorData] = useState<VisitorSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      setVisitorData(await api.get<VisitorSummary>(`/api/admin/visitors?date_from=${dateFrom}&date_to=${dateTo}`));
    } catch (err) { console.error("[history] fetch error:", err); } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchVisitors(); }, []);

  const maxVisitors = Math.max(...(visitorData?.daily.map(d => d.unique_users) ?? [1]), 1);

  return (
    <>
      {/* Filter */}
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
                      <div style={{
                        width: "100%",
                        height: `${Math.max(pct, 3)}%`,
                        background: pct > 0 ? "linear-gradient(to bottom, #3B5BFF, #7B8EFF)" : "#F1EEE6",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.3s",
                      }} />
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
    </>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "visitors" | "users">("history");

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(lastWeek().from);
  const [dateTo, setDateTo] = useState(lastWeek().to);
  const [filterUser, setFilterUser] = useState("");
  const [filterName, setFilterName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json()).then(setAccess).catch((err) => { console.error("[history] fetch error:", err); });
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, page: String(page), size: "50" });
      if (filterUser) params.set("user_id", filterUser);
      if (filterName) params.set("user_name", filterName);
      const res = await api.get<{ items: HistoryItem[]; total: number }>(`/api/admin/history?${params}`);
      setItems(res.items); setTotal(res.total);
    } catch (err) { console.error("[history] fetch error:", err); } finally { setLoading(false); }
  }, [dateFrom, dateTo, page, filterUser, filterName]);

  useEffect(() => { if (access?.is_admin && activeTab === "history") fetchHistory(); }, [access, activeTab, page]);

  if (access && !access.is_admin) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, marginBottom: 8 }}>관리자</h1>
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#8A9199" }}>관리자만 접근할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>관리자</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#F3F2EC", color: "#4A5259", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>⚙ Admin</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>작업 이력과 권한을 관리합니다</p>

      <div className="tabs">
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>작업 이력</button>
        <button className={`tab ${activeTab === "visitors" ? "active" : ""}`} onClick={() => setActiveTab("visitors")}>방문자 로그</button>
        <button className={`tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>권한 관리</button>
      </div>

      {activeTab === "history" && (
        <>
          <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <CardHeader
              title="작업 이력 조회"
              filters={
                <>
                  <div>
                    <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>시작일</div>
                    <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "auto" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>종료일</div>
                    <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "auto" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>직번</div>
                    <input className="input" placeholder="전체" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={{ width: 120 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>이름</div>
                    <input className="input" placeholder="전체" value={filterName} onChange={(e) => setFilterName(e.target.value)} style={{ width: 120 }} />
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setPage(1); fetchHistory(); }}>조회</button>
                    <button className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center" }} onClick={() => downloadCsv(
                      ["시간", "직번", "이름", "메뉴", "작업", "상세"],
                      items.map(it => [formatDate(it.timestamp), it.user_id, decodeName(it.user_name), it.menu, it.action, it.detail])
                    , `작업이력_${dateFrom}_${dateTo}.csv`)}>
                      <CsvIcon />CSV
                    </button>
                  </div>
                </>
              }
            />
          </div>

          <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
            <CardHeader
              title="결과"
              right={<span style={{ fontSize: 12.5, color: "#8A9199" }}>총 {total}건</span>}
            />
            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#8A9199", fontSize: 13 }}>조회 중...</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "#8A9199", fontSize: 13 }}>이력이 없습니다.</div>
            ) : (
              <div style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>시간</th><th>직번</th><th>이름</th><th>메뉴</th><th>작업</th><th>상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 11.5, color: "#8A9199", fontFamily: MONO }}>{formatDate(item.timestamp)}</td>
                        <td style={{ fontFamily: MONO, color: "#3B5BFF", fontWeight: 500 }}>{item.user_id}</td>
                        <td style={{ fontWeight: 500 }}>{decodeName(item.user_name)}</td>
                        <td><MenuBadge menu={item.menu} /></td>
                        <td style={{ fontSize: 13 }}>{item.action}</td>
                        <td style={{ fontSize: 12, color: "#8A9199", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > 50 && (
              <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, justifyContent: "center", borderTop: "1px solid #F1EEE6" }}>
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← 이전</button>
                <span style={{ fontSize: 12.5, fontFamily: MONO }}>{page} / {Math.ceil(total / 50)}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)}>다음 →</button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "visitors" && <VisitorsTab />}

      {activeTab === "users" && <AdminManager />}
    </div>
  );
}
