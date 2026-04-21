"use client";

import { useState, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "/aidoc-api";
const MONO = `"JetBrains Mono", monospace`;

type LimitStatus = "ok" | "near" | "blocked";

interface UserLimit {
  id: string;
  nm: string;
  dept: string;
  used: number;
  limit: number;
  today: number;
  status: LimitStatus;
  auto_block: boolean;
}

const MOCK_USERS: UserLimit[] = [
  { id: "162264", nm: "김예은",   dept: "품질관리팀",  used: 892_400,   limit: 1_000_000, today: 84_200, status: "near",    auto_block: true },
  { id: "158901", nm: "박지훈",   dept: "시공지원실",  used: 1_082_600, limit: 1_000_000, today: 0,      status: "blocked", auto_block: true },
  { id: "171022", nm: "이서연",   dept: "품질관리팀",  used: 420_180,   limit: 1_000_000, today: 28_400, status: "ok",      auto_block: false },
  { id: "149577", nm: "최민호",   dept: "설계1팀",    used: 684_020,   limit: 800_000,   today: 52_400, status: "near",    auto_block: true },
  { id: "180341", nm: "정하늘",   dept: "기획실",     used: 128_400,   limit: 500_000,   today: 0,      status: "ok",      auto_block: false },
  { id: "192014", nm: "강지민",   dept: "시공지원실",  used: 312_880,   limit: 500_000,   today: 14_200, status: "ok",      auto_block: false },
  { id: "167723", nm: "윤도현",   dept: "설계2팀",    used: 48_200,    limit: 500_000,   today: 0,      status: "ok",      auto_block: false },
];

const STATUS_MAP: Record<LimitStatus, { label: string; bg: string; color: string }> = {
  ok:      { label: "정상",   bg: "#E6F6EE", color: "#0E8F5C" },
  near:    { label: "주의",   bg: "#FFF2DE", color: "#B26A00" },
  blocked: { label: "차단됨", bg: "#FDEBE7", color: "#C8321E" },
};

function fmtK(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function fmtNum(n: number) { return n.toLocaleString("ko-KR"); }

interface EditModalProps {
  user: UserLimit;
  onClose: () => void;
  onSave: (u: UserLimit) => void;
}

function EditModal({ user, onClose, onSave }: EditModalProps) {
  const [limit, setLimit] = useState(String(user.limit));
  const [autoBlock, setAutoBlock] = useState(user.auto_block);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #EBE8E0", display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>한도 편집</div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#8A9199" }}>×</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "12px 16px", background: "#FAFAF7", borderRadius: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EEF1FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#2740C7" }}>
              {user.nm.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{user.nm}</div>
              <div style={{ fontSize: 11.5, color: "#8A9199" }}>{user.id} · {user.dept}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 6 }}>월 토큰 한도</div>
            <input
              className="input"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="예: 1000000"
            />
            <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 4 }}>현재 사용: {fmtNum(user.used)} / {fmtNum(user.limit)}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>자동 차단</div>
              <div style={{ fontSize: 11.5, color: "#8A9199", marginTop: 2 }}>한도 초과 시 자동으로 차단</div>
            </div>
            <div
              onClick={() => setAutoBlock(!autoBlock)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: autoBlock ? "#3B5BFF" : "#EBE8E0",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <div style={{
                position: "absolute",
                top: 3,
                left: autoBlock ? 22 : 3,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.15s",
              }} />
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #EBE8E0", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button
            className="btn btn-accent"
            style={{ padding: "8px 18px", fontSize: 13 }}
            onClick={() => {
              onSave({ ...user, limit: Number(limit) || user.limit, auto_block: autoBlock });
              onClose();
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LimitsPage() {
  const [access, setAccess] = useState<{ is_admin: boolean } | null>(null);
  const [users, setUsers] = useState<UserLimit[]>(MOCK_USERS);
  const [editing, setEditing] = useState<UserLimit | null>(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/admin/check`, { credentials: "include" })
      .then((r) => r.json()).then(setAccess).catch(() => {});
  }, []);

  if (access && !access.is_admin) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, marginBottom: 8 }}>사용 한도</h1>
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#8A9199" }}>관리자만 접근할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  const overCount = users.filter(u => u.status === "near" || u.status === "blocked").length;
  const blockedCount = users.filter(u => u.status === "blocked").length;
  const avgUsage = Math.round(users.reduce((s, u) => s + (u.used / u.limit) * 100, 0) / users.length);

  const unblock = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "ok" as LimitStatus } : u));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>사용 한도</h1>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: "#F3F2EC", color: "#4A5259", borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>⚙ Admin</span>
      </div>
      <p style={{ color: "#8A9199", fontSize: 13.5, marginBottom: 24 }}>사용자별 월 토큰 한도를 설정하고 모니터링합니다</p>

      {/* KPI */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>한도 주의/초과</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5, color: "#B26A00" }}>
            {overCount}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>명</span>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>차단된 사용자</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5, color: "#C8321E" }}>
            {blockedCount}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 4 }}>명</span>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, color: "#8A9199", marginBottom: 8 }}>평균 사용률</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>
            {avgUsage}<span style={{ fontSize: 13, color: "#8A9199", fontWeight: 400, marginLeft: 2 }}>%</span>
          </div>
        </div>
      </div>

      {/* Mock notice */}
      <div style={{ background: "#FFF2DE", border: "1px solid #B26A00", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 12.5, color: "#B26A00" }}>
        📋 현재 목업 데이터로 표시 중입니다. 백엔드 API 연동 후 실제 데이터가 반영됩니다.
      </div>

      {/* Users table */}
      <div style={{ background: "#fff", border: "1px solid #EBE8E0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1EEE6", fontSize: 14, fontWeight: 600 }}>
          사용자별 한도 현황
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>직번</th>
              <th>이름</th>
              <th>부서</th>
              <th>이번 달 사용 / 한도</th>
              <th style={{ textAlign: "right" }}>오늘 사용</th>
              <th>상태</th>
              <th>자동차단</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const pct = Math.min((u.used / u.limit) * 100, 100);
              const barColor = u.status === "blocked" ? "#C8321E" : u.status === "near" ? "#B26A00" : "#3B5BFF";
              const s = STATUS_MAP[u.status];
              return (
                <tr key={u.id}>
                  <td style={{ fontFamily: MONO, color: "#3B5BFF", fontWeight: 500 }}>{u.id}</td>
                  <td style={{ fontWeight: 500 }}>{u.nm}</td>
                  <td style={{ fontSize: 12.5, color: "#8A9199" }}>{u.dept}</td>
                  <td style={{ minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#F1EEE6", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontFamily: MONO, color: "#4A5259", whiteSpace: "nowrap" }}>
                        {fmtK(u.used)} / {fmtK(u.limit)}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", fontFamily: MONO, fontSize: 12, color: u.today > 0 ? "#0F1419" : "#8A9199" }}>
                    {u.today > 0 ? fmtK(u.today) : "—"}
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: s.bg, color: s.color, borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>
                      {s.label}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: u.auto_block ? "#3B5BFF" : "#8A9199" }}>
                      {u.auto_block ? "켜짐" : "꺼짐"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(u)}>편집</button>
                      {u.status === "blocked" && (
                        <button
                          className="btn btn-sm"
                          style={{ background: "#E6F6EE", color: "#0E8F5C", border: "none" }}
                          onClick={() => unblock(u.id)}
                        >
                          차단 해제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))}
        />
      )}
    </div>
  );
}
