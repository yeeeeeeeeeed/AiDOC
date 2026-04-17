"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { HistoryItem, AccessCheck } from "@/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";

interface TokenEntry {
  timestamp: string;
  user_id: string;
  user_name?: string;
  job_id: string;
  menu: string;
  filename: string;
  page: number;
  input_tokens: number;
  output_tokens: number;
}

interface TokenMonth {
  month: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  unique_users: number;
}

interface DayVisit {
  date: string;
  total_visits: number;
  unique_users: number;
  users: { user_id: string; user_name: string }[];
}

interface VisitorSummary {
  date_from: string;
  date_to: string;
  total_visits: number;
  unique_users: number;
  daily: DayVisit[];
  top_users: { user_id: string; user_name: string; visits: number }[];
}

// Azure OpenAI gpt-5.4-mini 기준 추정 단가 (USD/1M tokens → KRW 환산)
const PRICE_INPUT_PER_M = 0.15;  // USD
const PRICE_OUTPUT_PER_M = 0.60; // USD
const USD_TO_KRW = 1380;

function calcCost(input: number, output: number) {
  const usd = (input / 1_000_000) * PRICE_INPUT_PER_M + (output / 1_000_000) * PRICE_OUTPUT_PER_M;
  return { usd, krw: usd * USD_TO_KRW };
}

function fmtNum(n: number) {
  return n.toLocaleString("ko-KR");
}

function lastWeek() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function decodeName(name: string | undefined): string {
  if (!name) return "";
  try { return decodeURIComponent(name); } catch { return name; }
}

export default function HistoryPage() {
  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "tokens" | "visitors" | "users">("history");

  // 이력 탭
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(lastWeek().from);
  const [dateTo, setDateTo] = useState(lastWeek().to);
  const [filterUser, setFilterUser] = useState("");
  const [loading, setLoading] = useState(false);

  // 토큰 탭
  const [tokenYear, setTokenYear] = useState(new Date().getFullYear().toString());
  const [tokenMonths, setTokenMonths] = useState<TokenMonth[]>([]);
  const [tokenItems, setTokenItems] = useState<TokenEntry[]>([]);
  const [tokenTotal, setTokenTotal] = useState(0);
  const [tokenTotalInput, setTokenTotalInput] = useState(0);
  const [tokenTotalOutput, setTokenTotalOutput] = useState(0);
  const [tokenPage, setTokenPage] = useState(1);
  const [tokenDateFrom, setTokenDateFrom] = useState(lastWeek().from);
  const [tokenDateTo, setTokenDateTo] = useState(lastWeek().to);
  const [tokenFilterUser, setTokenFilterUser] = useState("");
  const [tokenFilterMenu, setTokenFilterMenu] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);

  // 방문 통계 탭
  const [visitorDateFrom, setVisitorDateFrom] = useState(lastWeek().from);
  const [visitorDateTo, setVisitorDateTo] = useState(lastWeek().to);
  const [visitorData, setVisitorData] = useState<VisitorSummary | null>(null);
  const [visitorLoading, setVisitorLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json())
      .then(setAccess)
      .catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom, date_to: dateTo, page: String(page), size: "50",
      });
      if (filterUser) params.set("user_id", filterUser);
      const res = await api.get<{ items: HistoryItem[]; total: number; page: number; total_pages: number }>(
        `/api/admin/history?${params}`
      );
      setItems(res.items);
      setTotal(res.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, filterUser]);

  const fetchTokenSummary = useCallback(async () => {
    try {
      const res = await api.get<{ year: string; months: TokenMonth[] }>(
        `/api/admin/tokens/summary?year=${tokenYear}`
      );
      setTokenMonths(res.months);
    } catch {}
  }, [tokenYear]);

  const fetchTokenDetail = useCallback(async () => {
    setTokenLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: tokenDateFrom, date_to: tokenDateTo,
        page: String(tokenPage), size: "50",
      });
      if (tokenFilterUser) params.set("user_id", tokenFilterUser);
      if (tokenFilterMenu) params.set("menu", tokenFilterMenu);

      const res = await api.get<{
        items: TokenEntry[];
        total: number;
        total_input_tokens: number;
        total_output_tokens: number;
        total_pages: number;
      }>(`/api/admin/tokens/detail?${params}`);
      setTokenItems(res.items);
      setTokenTotal(res.total);
      setTokenTotalInput(res.total_input_tokens);
      setTokenTotalOutput(res.total_output_tokens);
    } catch {
    } finally {
      setTokenLoading(false);
    }
  }, [tokenDateFrom, tokenDateTo, tokenPage, tokenFilterUser, tokenFilterMenu]);

  const fetchVisitors = useCallback(async () => {
    setVisitorLoading(true);
    try {
      const res = await api.get<VisitorSummary>(
        `/api/admin/visitors?date_from=${visitorDateFrom}&date_to=${visitorDateTo}`
      );
      setVisitorData(res);
    } catch {
    } finally {
      setVisitorLoading(false);
    }
  }, [visitorDateFrom, visitorDateTo]);

  useEffect(() => {
    if (access?.is_admin) fetchHistory();
  }, [access, page, fetchHistory]);

  useEffect(() => {
    if (access?.is_admin && activeTab === "tokens") {
      fetchTokenSummary();
      fetchTokenDetail();
    }
  }, [access, activeTab, fetchTokenSummary, fetchTokenDetail]);

  useEffect(() => {
    if (access?.is_admin && activeTab === "visitors") fetchVisitors();
  }, [access, activeTab, fetchVisitors]);

  if (access && !access.is_admin) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>관리자</h1>
        <div className="card text-center" style={{ padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: "var(--text-muted)" }}>!</div>
          <div className="font-bold">관리자만 접근할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  const totalCost = calcCost(tokenTotalInput, tokenTotalOutput);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>관리자</h1>
      <p className="text-muted mb-4">시스템 이력, 토큰 비용, 방문 통계, 관리자 권한을 관리합니다.</p>

      <div className="tabs" style={{ marginBottom: 0 }}>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>작업 이력</button>
        <button className={`tab ${activeTab === "tokens" ? "active" : ""}`} onClick={() => setActiveTab("tokens")}>토큰 사용량</button>
        <button className={`tab ${activeTab === "visitors" ? "active" : ""}`} onClick={() => setActiveTab("visitors")}>방문 통계</button>
        <button className={`tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>관리자 관리</button>
      </div>

      {/* ── 작업 이력 탭 ── */}
      {activeTab === "history" && (
        <>
          <div className="card">
            <div className="flex gap-3" style={{ flexWrap: "wrap", alignItems: "end" }}>
              <div>
                <label className="text-sm text-muted">시작일</label>
                <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted">종료일</label>
                <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted">사용자 ID</label>
                <input className="input" placeholder="전체" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} />
              </div>
              <div style={{ paddingTop: 20 }}>
                <button className="btn btn-primary" onClick={() => { setPage(1); fetchHistory(); }}>조회</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex-between mb-3">
              <span className="text-sm text-muted">총 {total}건</span>
            </div>
            {loading ? (
              <div className="text-center text-muted" style={{ padding: 40 }}>조회 중...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: 40 }}>이력이 없습니다.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table-preview">
                  <thead>
                    <tr><th>시간</th><th>사용자 ID</th><th>이름</th><th>메뉴</th><th>작업</th><th>상세</th></tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="text-sm">{formatDate(item.timestamp)}</td>
                        <td>{item.user_id}</td>
                        <td>{decodeName(item.user_name)}</td>
                        <td><span className="badge badge-info">{item.menu}</span></td>
                        <td>{item.action}</td>
                        <td className="text-sm text-muted">{item.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > 50 && (
              <div className="flex-center gap-2 mt-3" style={{ justifyContent: "center" }}>
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button>
                <span className="text-sm">{page} / {Math.ceil(total / 50)}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)}>다음</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 토큰 사용량 탭 ── */}
      {activeTab === "tokens" && (
        <>
          <div className="card">
            <div className="flex-between mb-3">
              <div className="card-header" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>월별 사용량</div>
              <div className="flex gap-2" style={{ alignItems: "center" }}>
                <select className="select" value={tokenYear} onChange={(e) => setTokenYear(e.target.value)}>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={fetchTokenSummary}>조회</button>
              </div>
            </div>
            {tokenMonths.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: 24 }}>데이터 없음</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table-preview">
                  <thead>
                    <tr>
                      <th>월</th><th>요청 수</th><th>사용자</th>
                      <th>입력 토큰</th><th>출력 토큰</th><th>합계 토큰</th>
                      <th>추정 비용 (USD)</th><th>추정 비용 (KRW)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenMonths.map((m) => {
                      const cost = calcCost(m.input_tokens, m.output_tokens);
                      return (
                        <tr key={m.month}>
                          <td>{m.month}</td>
                          <td>{fmtNum(m.requests)}</td>
                          <td>{m.unique_users}</td>
                          <td>{fmtNum(m.input_tokens)}</td>
                          <td>{fmtNum(m.output_tokens)}</td>
                          <td>{fmtNum(m.input_tokens + m.output_tokens)}</td>
                          <td>${cost.usd.toFixed(3)}</td>
                          <td>₩{fmtNum(Math.round(cost.krw))}</td>
                        </tr>
                      );
                    })}
                    {tokenMonths.length > 1 && (() => {
                      const tot = tokenMonths.reduce((a, m) => ({
                        requests: a.requests + m.requests,
                        input_tokens: a.input_tokens + m.input_tokens,
                        output_tokens: a.output_tokens + m.output_tokens,
                        unique_users: 0,
                      }), { requests: 0, input_tokens: 0, output_tokens: 0, unique_users: 0 });
                      const c = calcCost(tot.input_tokens, tot.output_tokens);
                      return (
                        <tr style={{ fontWeight: 700, background: "var(--primary-light)" }}>
                          <td>합계</td><td>{fmtNum(tot.requests)}</td><td>-</td>
                          <td>{fmtNum(tot.input_tokens)}</td><td>{fmtNum(tot.output_tokens)}</td>
                          <td>{fmtNum(tot.input_tokens + tot.output_tokens)}</td>
                          <td>${c.usd.toFixed(3)}</td><td>₩{fmtNum(Math.round(c.krw))}</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-sm text-muted" style={{ marginTop: 8 }}>
              * gpt-5.4-mini 기준 추정치: 입력 $0.15/1M · 출력 $0.60/1M · 환율 ₩1,380/USD
            </p>
          </div>

          <div className="card">
            <div className="card-header">상세 조회</div>
            <div className="flex gap-3 mb-3" style={{ flexWrap: "wrap", alignItems: "end" }}>
              <div>
                <label className="text-sm text-muted">시작일</label>
                <input type="date" className="input" value={tokenDateFrom} onChange={(e) => setTokenDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted">종료일</label>
                <input type="date" className="input" value={tokenDateTo} onChange={(e) => setTokenDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted">사용자</label>
                <input className="input" placeholder="전체" value={tokenFilterUser} onChange={(e) => setTokenFilterUser(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted">메뉴</label>
                <select className="select" value={tokenFilterMenu} onChange={(e) => setTokenFilterMenu(e.target.value)}>
                  <option value="">전체</option>
                  <option value="내용추출">내용추출</option>
                  <option value="표추출">표추출</option>
                  <option value="요약">요약</option>
                  <option value="번역">번역</option>
                </select>
              </div>
              <div style={{ paddingTop: 20 }}>
                <button className="btn btn-primary" onClick={() => { setTokenPage(1); fetchTokenDetail(); }}>조회</button>
              </div>
            </div>

            {tokenTotal > 0 && (
              <div className="flex gap-3 mb-3" style={{ flexWrap: "wrap" }}>
                {[
                  { label: "총 요청", value: fmtNum(tokenTotal) + "건" },
                  { label: "입력 토큰", value: fmtNum(tokenTotalInput) },
                  { label: "출력 토큰", value: fmtNum(tokenTotalOutput) },
                  { label: "추정 비용", value: `$${totalCost.usd.toFixed(2)} / ₩${fmtNum(Math.round(totalCost.krw))}` },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--bg-secondary, #f8f9fa)", borderLeft: "3px solid var(--primary)", borderRadius: "var(--radius)", padding: "12px 18px", minWidth: 140 }}>
                    <div className="text-sm text-muted">{s.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {tokenLoading ? (
              <div className="text-center text-muted" style={{ padding: 40 }}>조회 중...</div>
            ) : tokenItems.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: 40 }}>데이터 없음</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table-preview">
                  <thead>
                    <tr>
                      <th>시간</th><th>사용자 ID</th><th>이름</th><th>메뉴</th><th>파일</th><th>페이지</th>
                      <th>입력</th><th>출력</th><th>비용(USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenItems.map((e, i) => {
                      const c = calcCost(e.input_tokens, e.output_tokens);
                      return (
                        <tr key={i}>
                          <td className="text-sm">{formatDate(e.timestamp)}</td>
                          <td>{e.user_id}</td>
                          <td>{decodeName(e.user_name)}</td>
                          <td><span className="badge badge-info">{e.menu}</span></td>
                          <td className="text-sm">{e.filename}</td>
                          <td>{e.page === -1 ? "전체" : e.page}</td>
                          <td>{fmtNum(e.input_tokens)}</td>
                          <td>{fmtNum(e.output_tokens)}</td>
                          <td>${c.usd.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tokenTotal > 50 && (
              <div className="flex-center gap-2 mt-3" style={{ justifyContent: "center" }}>
                <button className="btn btn-secondary btn-sm" disabled={tokenPage <= 1} onClick={() => setTokenPage(tokenPage - 1)}>이전</button>
                <span className="text-sm">{tokenPage} / {Math.ceil(tokenTotal / 50)}</span>
                <button className="btn btn-secondary btn-sm" disabled={tokenPage >= Math.ceil(tokenTotal / 50)} onClick={() => setTokenPage(tokenPage + 1)}>다음</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 방문 통계 탭 ── */}
      {activeTab === "visitors" && (
        <>
          <div className="card">
            <div className="flex gap-3" style={{ flexWrap: "wrap", alignItems: "end" }}>
              <div>
                <label className="text-sm text-muted">시작일</label>
                <input type="date" className="input" value={visitorDateFrom} onChange={(e) => setVisitorDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted">종료일</label>
                <input type="date" className="input" value={visitorDateTo} onChange={(e) => setVisitorDateTo(e.target.value)} />
              </div>
              <div style={{ paddingTop: 20 }}>
                <button className="btn btn-primary" onClick={fetchVisitors}>조회</button>
              </div>
            </div>
          </div>

          {visitorLoading ? (
            <div className="card text-center text-muted" style={{ padding: 40 }}>조회 중...</div>
          ) : visitorData ? (
            <>
              <div className="flex gap-3 mb-4" style={{ flexWrap: "wrap" }}>
                {[
                  { label: "총 방문 횟수", value: fmtNum(visitorData.total_visits) + "회" },
                  { label: "순 방문자 수", value: fmtNum(visitorData.unique_users) + "명" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--bg-secondary, #f8f9fa)", borderLeft: "3px solid var(--primary)", borderRadius: "var(--radius)", padding: "12px 18px", minWidth: 160 }}>
                    <div className="text-sm text-muted">{s.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-header">일별 방문 현황</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="table-preview">
                    <thead>
                      <tr><th>날짜</th><th>총 방문</th><th>순 방문자</th><th>방문자 목록</th></tr>
                    </thead>
                    <tbody>
                      {visitorData.daily.map((d) => (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td>{fmtNum(d.total_visits)}</td>
                          <td>{d.unique_users}</td>
                          <td className="text-sm text-muted">
                            {d.users.map((u) => decodeName(u.user_name) || u.user_id).join(", ") || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {visitorData.top_users.length > 0 && (
                <div className="card">
                  <div className="card-header">사용자별 방문 횟수</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table-preview">
                      <thead>
                        <tr><th>순위</th><th>사용자 ID</th><th>이름</th><th>방문 횟수</th></tr>
                      </thead>
                      <tbody>
                        {visitorData.top_users.map((u, i) => (
                          <tr key={u.user_id}>
                            <td>{i + 1}</td>
                            <td>{u.user_id}</td>
                            <td>{decodeName(u.user_name)}</td>
                            <td>{fmtNum(u.visits)}회</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center text-muted" style={{ padding: 40 }}>조회 버튼을 눌러 통계를 확인하세요.</div>
          )}
        </>
      )}

      {/* ── 관리자 관리 탭 ── */}
      {activeTab === "users" && <AdminManager />}
    </div>
  );
}

function AdminManager() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";
  const [admins, setAdmins] = useState<string[]>([]);
  const [newId, setNewId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/admin/users`, { credentials: "include" });
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [BACKEND]);

  useEffect(() => { load(); }, [load]);

  const addAdmin = async () => {
    if (!newId.trim()) return;
    await fetch(`${BACKEND}/api/admin/users/add`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: newId.trim() }),
    });
    setMsg(`${newId} 관리자 추가 완료`);
    setNewId("");
    load();
  };

  const removeAdmin = async (uid: string) => {
    if (!confirm(`${uid} 을 관리자에서 삭제하시겠습니까?`)) return;
    await fetch(`${BACKEND}/api/admin/users/remove`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: uid }),
    });
    setMsg(`${uid} 삭제 완료`);
    load();
  };

  return (
    <>
      <div className="card">
        <div className="card-header">관리자 추가</div>
        <div className="flex gap-3" style={{ alignItems: "end" }}>
          <div>
            <label className="text-sm text-muted">사용자 ID (사번)</label>
            <input
              className="input"
              placeholder="예: 162264"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAdmin()}
            />
          </div>
          <div style={{ paddingTop: 20 }}>
            <button className="btn btn-primary" onClick={addAdmin}>추가</button>
          </div>
        </div>
        {msg && <p className="text-sm" style={{ color: "var(--success)", marginTop: 8 }}>{msg}</p>}
      </div>

      <div className="card">
        <div className="card-header">관리자 목록</div>
        {loading ? <div className="text-muted text-sm" style={{ padding: 16 }}>불러오는 중...</div> : (
          <table className="table-preview">
            <thead><tr><th>사용자 ID</th><th>권한</th><th>관리</th></tr></thead>
            <tbody>
              {admins.map((uid) => (
                <tr key={uid}>
                  <td>{uid}</td>
                  <td><span className="badge badge-info">관리자</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => removeAdmin(uid)}>삭제</button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={3} className="text-center text-muted" style={{ padding: 24 }}>등록된 관리자 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
