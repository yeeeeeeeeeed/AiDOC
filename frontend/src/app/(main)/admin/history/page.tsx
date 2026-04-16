"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { HistoryItem, AccessCheck } from "@/types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";

export default function HistoryPage() {
  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [filterUser, setFilterUser] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json())
      .then(setAccess)
      .catch(() => {});
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        page: String(page),
        size: "50",
      });
      if (filterUser) params.set("user_id", filterUser);

      const res = await api.get<{
        items: HistoryItem[];
        total: number;
        page: number;
        total_pages: number;
      }>(`/api/admin/history?${params.toString()}`);

      setItems(res.items);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (access?.is_admin) fetchHistory();
  }, [access, page]);

  if (access && !access.is_admin) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>이력 관리</h1>
        <div className="card text-center" style={{ padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: "var(--text-muted)" }}>!</div>
          <div className="font-bold">관리자만 접근할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>이력 관리</h1>
      <p className="text-muted mb-4">사용자 작업 이력을 조회합니다.</p>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-3" style={{ flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <label className="text-sm text-muted">시작일</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted">종료일</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted">사용자 ID</label>
            <input
              className="input"
              placeholder="전체"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { setPage(1); fetchHistory(); }}>
            조회
          </button>
        </div>
      </div>

      {/* Results */}
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
                <tr>
                  <th>시간</th>
                  <th>사용자</th>
                  <th>메뉴</th>
                  <th>작업</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="text-sm">{formatDate(item.timestamp)}</td>
                    <td>{item.user_id}</td>
                    <td><span className="badge badge-info">{item.menu}</span></td>
                    <td>{item.action}</td>
                    <td className="text-sm text-muted">{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex-center gap-2 mt-3" style={{ justifyContent: "center" }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              이전
            </button>
            <span className="text-sm">
              {page} / {Math.ceil(total / 50)}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= Math.ceil(total / 50)}
              onClick={() => setPage(page + 1)}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
