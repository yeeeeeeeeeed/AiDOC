"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { CardHeader, CsvIcon } from "@/components/admin/CardHeader";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";
const MONO = `"JetBrains Mono", monospace`;

const PRICE_INPUT_PER_M = 0.15;
const PRICE_OUTPUT_PER_M = 0.60;
const USD_TO_KRW = 1380;

interface TokenEntry {
  timestamp: string; user_id: string; user_name?: string;
  job_id: string; menu: string; filename: string;
  page: number; input_tokens: number; output_tokens: number;
}
interface TokenMonth {
  month: string; requests: number; input_tokens: number; output_tokens: number; unique_users: number;
}

function calcCost(input: number, output: number) {
  const usd = (input / 1_000_000) * PRICE_INPUT_PER_M + (output / 1_000_000) * PRICE_OUTPUT_PER_M;
  return { usd, krw: usd * USD_TO_KRW };
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

const MENU_BADGE: Record<string, { bg: string; color: string }> = {
  요약: { bg: "#FFF2DE", color: "#B26A00" },
  번역: { bg: "#FDEBE7", color: "#C8321E" },
  표추출: { bg: "#E6F6EE", color: "#0E8F5C" },
  비교: { bg: "#EEF1FF", color: "#2740C7" },
  내용추출: { bg: "#F3F2EC", color: "#4A5259" },
};

export default function TokensPage() {
  const [access, setAccess] = useState<{ is_admin: boolean } | null>(null);
  const [tokenYear, setTokenYear] = useState(new Date().getFullYear().toString());
  const [tokenMonths, setTokenMonths] = useState<TokenMonth[]>([]);
  const [tokenItems, setTokenItems] = useState<TokenEntry[]>([]);
  const [tokenTotal, setTokenTotal] = useState(0);
  const [tokenPage, setTokenPage] = useState(1);
  const [tokenDateFrom, setTokenDateFrom] = useState(lastWeek().from);
  const [tokenDateTo, setTokenDateTo] = useState(lastWeek().to);
  const [tokenFilterUser, setTokenFilterUser] = useState("");
  const [tokenFilterMenu, setTokenFilterMenu] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json()).then(setAccess).catch(() => {});
  }, []);

  const fetchTokenSummary = useCallback(async () => {
    try {
      const res = await api.get<{ months: TokenMonth[] }>(`/api/admin/tokens/summary?year=${tokenYear}`);
      setTokenMonths(res.months);
    } catch {}
  }, [tokenYear]);

  const fetchTokenDetail = useCallback(async () => {
    setTokenLoading(true);
    try {
      const params = new URLSearchParams({ date_from: tokenDateFrom, date_to: tokenDateTo, page: String(tokenPage), size: "50" });
      if (tokenFilterUser) params.set("user_id", tokenFilterUser);
      if (tokenFilterMenu) params.set("menu", tokenFilterMenu);
      const res = await api.get<{ items: TokenEntry[]; total: number; total_input_tokens: number; total_output_tokens: number }>(
        `/api/admin/tokens/detail?${params}`
      );
      setTokenItems(res.items); setTokenTotal(res.total);
    } catch {} finally { setTokenLoading(false); }
  }, [tokenDateFrom, tokenDateTo, tokenPage, tokenFilterUser, tokenFilterMenu]);

  useEffect(() => {
    if (access?.is_admin) fetchTokenSummary();
  }, [access]);

  useEffect(() => {
    if (access?.is_admin) fetchTokenDetail();
  }, [access, tokenPage]);

  if (access && !access.is_admin) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, marginBottom: 8 }}>토큰 사용량</h1>
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#8A9199" }}>관리자만 접근할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  const totMonthly = tokenMonths.reduce(
    (a, m) => ({ requests: a.requests + m.requests, inp: a.inp + m.input_tokens, out: a.out + m.output_tokens }),
    { requests: 0, inp: 0, out: 0 }
  );
  const totCost = calcCost(totMonthly.inp, totMonthly.out);
  const maxReq = Math.max(...tokenMonths.map(m => m.requests), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>토큰 사용량</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#F3F2EC", color: "#4A5259", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>⚙ Admin</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>월별 / 상세 토큰 사용량 및 추정 비용</p>

      {/* KPI row */}
      {tokenMonths.length > 0 && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>YTD 요청</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>
              {fmtNum(totMonthly.requests)}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>건</span>
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>입력 토큰</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, fontFamily: MONO }}>
              {(totMonthly.inp / 1e6).toFixed(1)}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 2, fontFamily: "inherit" }}>M</span>
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>출력 토큰</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, fontFamily: MONO }}>
              {(totMonthly.out / 1e6).toFixed(2)}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 2, fontFamily: "inherit" }}>M</span>
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #0F1419 0%, #23262D 100%)", border: "none", borderRadius: 14, padding: 20, color: "#fff" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>추정 비용 (YTD)</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, fontFamily: MONO }}>₩{fmtNum(Math.round(totCost.krw))}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 6, fontFamily: MONO }}>${totCost.usd.toFixed(2)} · gpt-5.4-mini</div>
          </div>
        </div>
      )}

      {/* 월별 사용량 */}
      <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        <CardHeader
          title="월별 사용량"
          filters={
            <>
              <select
                className="select"
                style={{ width: "auto", fontSize: 12 }}
                value={tokenYear}
                onChange={(e) => setTokenYear(e.target.value)}
              >
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={fetchTokenSummary}>조회</button>
                <button className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center" }} onClick={() => downloadCsv(
                  ["월", "요청 수", "사용자", "입력 토큰", "출력 토큰", "합계", "비용(USD)", "비용(KRW)"],
                  tokenMonths.map(m => {
                    const c = calcCost(m.input_tokens, m.output_tokens);
                    return [m.month, m.requests, m.unique_users, m.input_tokens, m.output_tokens, m.input_tokens + m.output_tokens, c.usd.toFixed(3), Math.round(c.krw)];
                  })
                , `토큰월별_${tokenYear}.csv`)}>
                  <CsvIcon />CSV
                </button>
              </div>
            </>
          }
        />
        {tokenMonths.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#8A9199", fontSize: 13 }}>데이터 없음</div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
            <table className="admin-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>월</th>
                  <th style={{ textAlign: "right" }}>요청 수</th>
                  <th style={{ textAlign: "right" }}>사용자</th>
                  <th style={{ textAlign: "right" }}>입력 토큰</th>
                  <th style={{ textAlign: "right" }}>출력 토큰</th>
                  <th style={{ textAlign: "right" }}>합계</th>
                  <th style={{ textAlign: "right" }}>비용 (USD)</th>
                  <th style={{ textAlign: "right" }}>비용 (KRW)</th>
                </tr>
              </thead>
              <tbody>
                {tokenMonths.map((m) => {
                  const cost = calcCost(m.input_tokens, m.output_tokens);
                  return (
                    <tr key={m.month}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: MONO, fontSize: 12 }}>{m.month}</span>
                          <div style={{ width: 60, height: 4, background: "#F1EEE6", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${(m.requests / maxReq) * 100}%`, height: "100%", background: "#3B5BFF" }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(m.requests)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO, color: "#8A9199" }}>{m.unique_users}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(m.input_tokens)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(m.output_tokens)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO, fontWeight: 500 }}>{fmtNum(m.input_tokens + m.output_tokens)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO, color: "#8A9199" }}>${cost.usd.toFixed(3)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO, fontWeight: 500 }}>₩{fmtNum(Math.round(cost.krw))}</td>
                    </tr>
                  );
                })}
                {tokenMonths.length > 1 && (() => {
                  const c = calcCost(totMonthly.inp, totMonthly.out);
                  return (
                    <tr style={{ background: "#EEF1FF", fontWeight: 600 }}>
                      <td>합계</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(totMonthly.requests)}</td>
                      <td style={{ textAlign: "right", color: "#8A9199" }}>—</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(totMonthly.inp)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(totMonthly.out)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(totMonthly.inp + totMonthly.out)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO, color: "#2740C7" }}>${c.usd.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO, color: "#2740C7" }}>₩{fmtNum(Math.round(c.krw))}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: "10px 20px", fontSize: 11.5, color: "#8A9199", borderTop: "1px solid #F1EEE6" }}>
          * gpt-5.4-mini 기준 추정치 · 입력 $0.15/1M · 출력 $0.60/1M · 환율 ₩1,380/USD
        </div>
      </div>

      {/* 상세 조회 */}
      <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
        <CardHeader
          title="상세 조회"
          right={
            tokenTotal > 0
              ? <span style={{ fontSize: 12.5, color: "#8A9199" }}>{fmtNum(tokenTotal)}건</span>
              : undefined
          }
          filters={
            <>
              <div>
                <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>시작일</div>
                <input type="date" className="input" style={{ width: "auto" }} value={tokenDateFrom} onChange={(e) => setTokenDateFrom(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>종료일</div>
                <input type="date" className="input" style={{ width: "auto" }} value={tokenDateTo} onChange={(e) => setTokenDateTo(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>직번</div>
                <input className="input" placeholder="전체" value={tokenFilterUser} onChange={(e) => setTokenFilterUser(e.target.value)} style={{ width: 110 }} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "#8A9199", marginBottom: 4 }}>메뉴</div>
                <select className="select" style={{ width: "auto" }} value={tokenFilterMenu} onChange={(e) => setTokenFilterMenu(e.target.value)}>
                  <option value="">전체</option>
                  <option value="내용추출">내용추출</option>
                  <option value="표추출">표추출</option>
                  <option value="요약">요약</option>
                  <option value="번역">번역</option>
                </select>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setTokenPage(1); fetchTokenDetail(); }}>조회</button>
                <button className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center" }} onClick={() => downloadCsv(
                  ["시간", "직번", "이름", "메뉴", "파일", "페이지", "입력토큰", "출력토큰", "비용(USD)"],
                  tokenItems.map(e => { const c = calcCost(e.input_tokens, e.output_tokens); return [formatDate(e.timestamp), e.user_id, decodeName(e.user_name), e.menu, e.filename, e.page === -1 ? "전체" : e.page, e.input_tokens, e.output_tokens, c.usd.toFixed(4)]; })
                , `토큰상세_${tokenDateFrom}_${tokenDateTo}.csv`)}>
                  <CsvIcon />CSV
                </button>
              </div>
            </>
          }
        />
        {tokenLoading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#8A9199", fontSize: 13 }}>조회 중...</div>
        ) : tokenItems.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#8A9199", fontSize: 13 }}>데이터 없음</div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
            <table className="admin-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>시간</th><th>직번</th><th>이름</th><th>메뉴</th>
                  <th>파일</th>
                  <th style={{ textAlign: "right" }}>페이지</th>
                  <th style={{ textAlign: "right" }}>입력</th>
                  <th style={{ textAlign: "right" }}>출력</th>
                  <th style={{ textAlign: "right" }}>비용(USD)</th>
                </tr>
              </thead>
              <tbody>
                {tokenItems.map((e, i) => {
                  const s = MENU_BADGE[e.menu] || { bg: "#F3F2EC", color: "#4A5259" };
                  const c = calcCost(e.input_tokens, e.output_tokens);
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: 11.5, color: "#8A9199", fontFamily: MONO }}>{formatDate(e.timestamp)}</td>
                      <td style={{ fontFamily: MONO, color: "#3B5BFF", fontWeight: 500 }}>{e.user_id}</td>
                      <td style={{ fontWeight: 500 }}>{decodeName(e.user_name)}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: s.bg, color: s.color, borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>{e.menu}</span>
                      </td>
                      <td style={{ fontSize: 12, color: "#4A5259", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.filename}</td>
                      <td style={{ textAlign: "right", color: "#8A9199", fontFamily: MONO }}>{e.page === -1 ? "전체" : e.page}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(e.input_tokens)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO }}>{fmtNum(e.output_tokens)}</td>
                      <td style={{ textAlign: "right", fontFamily: MONO, fontWeight: 500 }}>${c.usd.toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {tokenTotal > 50 && (
          <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, justifyContent: "center", borderTop: "1px solid #F1EEE6" }}>
            <button className="btn btn-secondary btn-sm" disabled={tokenPage <= 1} onClick={() => setTokenPage(tokenPage - 1)}>← 이전</button>
            <span style={{ fontSize: 12.5, fontFamily: MONO }}>{tokenPage} / {Math.ceil(tokenTotal / 50)}</span>
            <button className="btn btn-secondary btn-sm" disabled={tokenPage >= Math.ceil(tokenTotal / 50)} onClick={() => setTokenPage(tokenPage + 1)}>다음 →</button>
          </div>
        )}
      </div>
    </div>
  );
}
