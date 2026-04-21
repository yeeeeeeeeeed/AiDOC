// AiDoc screen mocks — trendy, clean refresh

const COLORS = {
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
};

const FONT = `"Pretendard", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
const MONO = `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

// ------- shared bits -------
function Shell({ active = "home", children }) {
  return (
    <div style={{ display: "flex", height: "100%", background: COLORS.bg, fontFamily: FONT, color: COLORS.ink }}>
      <Sidebar active={active} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar />
        <div style={{ flex: 1, overflow: "auto", padding: "28px 40px 48px" }}>{children}</div>
      </div>
    </div>
  );
}

function Sidebar({ active }) {
  const items = [
    { k: "home", label: "홈", icon: "◻" },
    { k: "content", label: "내용 추출", icon: "▤" },
    { k: "table", label: "표 추출", icon: "▦" },
    { k: "summary", label: "문서 요약", icon: "≡" },
    { k: "compare", label: "PDF 비교", icon: "⇄" },
    { k: "translate", label: "번역", icon: "A⇋가" },
    { k: "admin", label: "관리자", icon: "⚙", divider: true },
  ];
  return (
    <aside style={{ width: 240, background: COLORS.side, color: COLORS.sideInk, display: "flex", flexDirection: "column", padding: "20px 14px", flexShrink: 0 }}>
      <div style={{ padding: "6px 10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, #7B8EFF)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", letterSpacing: -0.5 }}>A</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }}>AiDoc</div>
          <div style={{ fontSize: 11, color: COLORS.sideMuted, marginTop: 1 }}>AI 문서 도우미</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: COLORS.sideMuted, padding: "14px 12px 8px", letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 }}>Workspace</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(it => (
          <React.Fragment key={it.k}>
          {it.divider && <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 10px" }}/>}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderRadius: 8, fontSize: 13.5,
            background: active === it.k ? "rgba(255,255,255,0.08)" : "transparent",
            color: active === it.k ? "#fff" : COLORS.sideInk,
            fontWeight: active === it.k ? 500 : 400,
            position: "relative",
          }}>
            {active === it.k && <span style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 2.5, background: COLORS.accent, borderRadius: 2 }}/>}
            <span style={{ fontSize: 13, width: 18, textAlign: "center", color: active === it.k ? COLORS.accent : COLORS.sideMuted, fontFamily: MONO }}>{it.icon}</span>
            {it.label}
            {it.k === "admin" && <span style={{ marginLeft: "auto", fontSize: 9.5, padding: "2px 5px", background: "rgba(255,255,255,0.1)", borderRadius: 3, color: COLORS.sideMuted, letterSpacing: 0.3 }}>ADMIN</span>}
          </div>
          </React.Fragment>
        ))}
      </nav>
      <div style={{ flex: 1 }}/>
      <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#3C3F46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>김</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>김예은</div>
            <div style={{ fontSize: 10.5, color: COLORS.sideMuted }}>관리자 · POSCO ENC</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <div style={{ height: 56, borderBottom: `1px solid ${COLORS.line}`, background: COLORS.panel, display: "flex", alignItems: "center", padding: "0 40px", gap: 14, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: COLORS.ink3 }}>
        <span>Workspace</span>
        <span style={{ opacity: .5 }}>/</span>
        <span style={{ color: COLORS.ink, fontWeight: 500 }}>PDF 문서</span>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: `1px solid ${COLORS.line}`, borderRadius: 8, fontSize: 12.5, color: COLORS.ink3, background: COLORS.bg, minWidth: 260 }}>
        <span style={{ opacity: .6 }}>⌕</span>
        <span>파일, 기능, 기록 검색</span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 10.5, padding: "2px 6px", background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 4, fontFamily: MONO }}>⌘K</span>
      </div>
      <button style={btnGhost()}>도움말</button>
      <button style={btnPrimary()}>+ 새 작업</button>
    </div>
  );
}

function btnPrimary() { return { padding: "8px 14px", background: COLORS.ink, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT }; }
function btnGhost() { return { padding: "8px 12px", background: "transparent", color: COLORS.ink2, border: `1px solid ${COLORS.line}`, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: FONT }; }
function btnAccent() { return { padding: "10px 18px", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: FONT }; }

function Card({ children, style, pad = 24 }) {
  return <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: pad, ...style }}>{children}</div>;
}

function Badge({ color = "ok", children }) {
  const map = {
    ok: [COLORS.okSoft, COLORS.ok],
    warn: [COLORS.warnSoft, COLORS.warn],
    accent: [COLORS.accentSoft, COLORS.accentInk],
    danger: [COLORS.dangerSoft, COLORS.danger],
    neutral: ["#F3F2EC", COLORS.ink2],
  };
  const [bg, fg] = map[color];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", background: bg, color: fg, borderRadius: 999, fontSize: 11.5, fontWeight: 500 }}>{children}</span>;
}

// ============ SCREEN 1: HOME ============
function HomeScreen() {
  const features = [
    { k: "content", label: "내용 추출", desc: "PDF의 모든 텍스트를 구조 그대로 워드로", icon: "▤", tint: "#EEF1FF", ink: COLORS.accent },
    { k: "table", label: "표 추출", desc: "표를 자동 감지하여 편집 가능한 엑셀로", icon: "▦", tint: "#E6F6EE", ink: COLORS.ok },
    { k: "summary", label: "문서 요약", desc: "AI가 핵심 내용을 간결하게 정리", icon: "≡", tint: "#FFF2DE", ink: COLORS.warn },
    { k: "compare", label: "PDF 비교", desc: "두 문서의 변경점을 자동으로 분석", icon: "⇄", tint: "#F5EEFF", ink: "#6B3DDB" },
    { k: "translate", label: "번역", desc: "원본 구조 그대로 다국어 번역", icon: "A⇋", tint: "#FDEBE7", ink: COLORS.danger },
  ];
  const recent = [
    { n: "2026 시공품질 관리계획서.pdf", tag: "요약", time: "2시간 전", pages: 48, status: "완료" },
    { n: "협력사 계약서 v3.2.pdf", tag: "비교", time: "어제", pages: 12, status: "완료" },
    { n: "ENG-spec-pipeline.pdf", tag: "번역", time: "04.18", pages: 24, status: "진행 중" },
  ];

  return (
    <Shell active="home">
      {/* Hero */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 6, fontWeight: 500, letterSpacing: 0.3 }}>WELCOME BACK</div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.8, margin: 0, lineHeight: 1.2 }}>
            안녕하세요, 예은님. <span style={{ color: COLORS.ink3, fontWeight: 400 }}>오늘은 어떤 문서를 다뤄볼까요?</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnGhost()}>최근 기록</button>
          <button style={btnPrimary()}>+ PDF 업로드</button>
        </div>
      </div>

      {/* Upload hero */}
      <Card pad={0} style={{ marginBottom: 24, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr" }}>
          <div style={{ padding: 32, borderRight: `1px solid ${COLORS.line}` }}>
            <div style={{ fontSize: 11.5, color: COLORS.accentInk, fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>STEP 01 · 업로드</div>
            <div style={{
              border: `1.5px dashed ${COLORS.line}`, borderRadius: 14, padding: 36,
              background: `repeating-linear-gradient(135deg, ${COLORS.bg}, ${COLORS.bg} 10px, #F5F2EB 10px, #F5F2EB 11px)`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.accentSoft, color: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 300 }}>+</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>PDF를 끌어다 놓거나 클릭하세요</div>
              <div style={{ fontSize: 12.5, color: COLORS.ink3 }}>최대 100MB · DRM 암호화 파일 지원</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <Badge color="neutral">.pdf</Badge>
                <Badge color="neutral">DRM</Badge>
                <Badge color="neutral">다중 업로드</Badge>
              </div>
            </div>
          </div>
          <div style={{ padding: 32, background: COLORS.bg }}>
            <div style={{ fontSize: 11.5, color: COLORS.ink3, fontWeight: 600, letterSpacing: 0.5, marginBottom: 14 }}>STEP 02 · 기능 선택</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {features.slice(0, 3).map(f => (
                <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: f.tint, color: f.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 13 }}>{f.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 11.5, color: COLORS.ink3, marginTop: 1 }}>{f.desc}</div>
                  </div>
                  <span style={{ color: COLORS.ink3, fontSize: 14 }}>→</span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: COLORS.ink3, textAlign: "center", padding: 4 }}>+ 2개 더 보기</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { l: "이번 달 처리", v: "148", u: "건", d: "+12%", p: true },
          { l: "처리한 페이지", v: "3,482", u: "p", d: "+8%", p: true },
          { l: "평균 처리시간", v: "24", u: "초", d: "-6%", p: true },
          { l: "잔여 용량", v: "82", u: "%", d: "5.1 / 6.2 GB", p: false },
        ].map((s, i) => (
          <Card key={i}>
            <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 8 }}>{s.l}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>{s.v}</div>
              <div style={{ fontSize: 13, color: COLORS.ink3 }}>{s.u}</div>
            </div>
            <div style={{ fontSize: 11.5, color: s.p ? COLORS.ok : COLORS.ink3, marginTop: 6, fontWeight: s.p ? 500 : 400 }}>{s.d}</div>
          </Card>
        ))}
      </div>

      {/* Recent */}
      <Card pad={0}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>최근 작업</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 12.5, color: COLORS.accent, fontWeight: 500 }}>전체 보기 →</div>
        </div>
        {recent.map((r, i) => (
          <div key={i} style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, borderBottom: i < recent.length - 1 ? `1px solid ${COLORS.lineSoft}` : "none" }}>
            <div style={{ width: 36, height: 44, borderRadius: 4, background: "#F5F2EB", border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.ink3, fontFamily: MONO }}>PDF</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.n}</div>
              <div style={{ fontSize: 11.5, color: COLORS.ink3, marginTop: 2 }}>{r.pages}페이지 · {r.time}</div>
            </div>
            <Badge color="accent">{r.tag}</Badge>
            <Badge color={r.status === "완료" ? "ok" : "warn"}>● {r.status}</Badge>
            <span style={{ color: COLORS.ink3 }}>⋯</span>
          </div>
        ))}
      </Card>
    </Shell>
  );
}

// ============ SCREEN 2: SUMMARY ============
function SummaryScreen() {
  const pages = Array.from({ length: 12 }, (_, i) => i + 1);
  const selected = [1, 2, 3, 5, 7, 8];
  return (
    <Shell active="summary">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>문서 요약</h1>
        <Badge color="accent">AI</Badge>
      </div>
      <div style={{ color: COLORS.ink3, fontSize: 13.5, marginBottom: 24 }}>AI가 PDF 문서를 분석하여 핵심 내용을 요약합니다</div>

      {/* File chip */}
      <Card pad={16} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 44, borderRadius: 4, background: "#F5F2EB", border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.ink3, fontFamily: MONO }}>PDF</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>2026 시공품질 관리계획서.pdf</div>
          <div style={{ fontSize: 12, color: COLORS.ink3, marginTop: 2 }}>12페이지 · 2.4 MB</div>
        </div>
        <button style={btnGhost()}>다른 파일</button>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        {/* Left: page selector + result */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>페이지 선택</div>
              <div style={{ flex: 1 }}/>
              <div style={{ fontSize: 12, color: COLORS.ink3 }}>{selected.length}/{pages.length} 선택</div>
              <button style={{ ...btnGhost(), padding: "4px 10px", marginLeft: 8, fontSize: 12 }}>전체</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {pages.map(p => {
                const on = selected.includes(p);
                return (
                  <div key={p} style={{
                    aspectRatio: "3/4", borderRadius: 6,
                    border: on ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                    background: "#F5F2EB",
                    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                    padding: 4, fontSize: 10, color: COLORS.ink3, fontFamily: MONO,
                    position: "relative", overflow: "hidden"
                  }}>
                    <div style={{ position: "absolute", inset: 6, background: `repeating-linear-gradient(0deg, transparent 0, transparent 5px, rgba(0,0,0,0.06) 5px, rgba(0,0,0,0.06) 6px)`, borderRadius: 3 }}/>
                    {on && <div style={{ position: "absolute", top: 4, left: 4, width: 14, height: 14, borderRadius: 3, background: COLORS.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✓</div>}
                    <span style={{ position: "relative" }}>{p}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>요약 결과</div>
              <Badge color="ok">● 완료 · 8.2초</Badge>
              <div style={{ flex: 1 }}/>
              <button style={{ ...btnGhost(), fontSize: 12, padding: "6px 10px" }}>⎘ 복사</button>
              <button style={{ ...btnPrimary(), fontSize: 12, padding: "6px 12px" }}>↓ 워드</button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.75, color: COLORS.ink2 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.ink, marginBottom: 8 }}>2026년 시공품질 관리계획 핵심 요약</div>
              <p style={{ margin: "0 0 10px" }}>본 계획서는 2026년 상반기 전사 시공 프로젝트에 대한 품질관리 체계를 정의하며, <strong style={{ background: "#FFF3B8", padding: "1px 3px" }}>ISO 9001:2015</strong> 기반의 공정별 검사 기준과 비파괴검사(NDT) 적용 범위를 명시한다.</p>
              <p style={{ margin: "0 0 10px" }}>주요 변경점: ① 협력사 품질평가 주기를 분기에서 월 단위로 단축 ② 철근 인장시험 샘플링 기준 강화(20→15톤당 1회) ③ 하자 등급별 책임자 체계 신설.</p>
              <div style={{ padding: 12, background: COLORS.accentSoft, borderRadius: 8, fontSize: 12.5, color: COLORS.accentInk, marginTop: 4 }}>
                <b>핵심 지표 3가지</b><br/>
                · 품질 부적합률 목표: 0.8% 이하 (2025년 대비 -0.3%p)<br/>
                · 하자 재작업 비용: 매출의 1.2% 이내<br/>
                · 고객 만족도: 92점 이상
              </div>
            </div>
          </Card>
        </div>

        {/* Right: options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>요약 옵션</div>
            <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 8 }}>요약 길이</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {[
                { k: "short", l: "간단", s: "3~5문장" },
                { k: "medium", l: "보통", s: "반 페이지", on: true },
                { k: "detailed", l: "상세", s: "1~2p" },
              ].map(o => (
                <div key={o.k} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 8, textAlign: "center",
                  border: o.on ? `1.5px solid ${COLORS.ink}` : `1px solid ${COLORS.line}`,
                  background: o.on ? COLORS.ink : COLORS.panel, color: o.on ? "#fff" : COLORS.ink,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{o.l}</div>
                  <div style={{ fontSize: 10.5, opacity: .7, marginTop: 2 }}>{o.s}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 8 }}>추가 지시 (선택)</div>
            <div style={{
              border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: 12, fontSize: 12.5,
              background: COLORS.bg, color: COLORS.ink3, minHeight: 72, lineHeight: 1.5
            }}>
              계약 조건과 숫자 데이터 위주로 요약, bullet 형식 선호<span style={{ background: COLORS.ink, width: 1.5, height: 14, display: "inline-block", verticalAlign: -2, marginLeft: 2 }}/>
            </div>
            <button style={{ ...btnAccent(), width: "100%", marginTop: 16, padding: "12px 16px" }}>✨ 요약 시작 · 6페이지</button>
          </Card>
          <Card>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>💡 빠른 프리셋</div>
            {["계약서 핵심 조항만", "숫자/금액 중심", "실행 체크리스트"].map(t => (
              <div key={t} style={{ padding: "8px 10px", borderRadius: 6, fontSize: 12.5, color: COLORS.ink2, marginBottom: 2, cursor: "pointer" }}>· {t}</div>
            ))}
          </Card>
        </div>
      </div>
    </Shell>
  );
}

// ============ SCREEN 3: COMPARE ============
function CompareScreen() {
  return (
    <Shell active="compare">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>PDF 비교</h1>
        <Badge color="accent">AI</Badge>
      </div>
      <div style={{ color: COLORS.ink3, fontSize: 13.5, marginBottom: 24 }}>두 PDF의 변경점을 AI가 자동으로 분석합니다</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <FileChip color="neutral" label="원본" name="협력사 계약서 v3.1.pdf" meta="12페이지 · 04.15 업로드"/>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.panel, border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.ink3 }}>⇄</div>
        <FileChip color="accent" label="수정본" name="협력사 계약서 v3.2.pdf" meta="12페이지 · 04.20 업로드"/>
      </div>

      <Card pad={0} style={{ marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>변경 요약</div>
          <Badge color="accent">12페이지</Badge>
          <Badge color="danger">−128 단어</Badge>
          <Badge color="ok">+186 단어</Badge>
          <div style={{ flex: 1 }}/>
          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
            <span style={{ color: COLORS.ink3 }}>보기:</span>
            <span style={{ padding: "3px 8px", background: COLORS.ink, color: "#fff", borderRadius: 5 }}>Side-by-side</span>
            <span style={{ padding: "3px 8px", color: COLORS.ink3, borderRadius: 5 }}>Unified</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {/* original */}
          <div style={{ padding: 20, borderRight: `1px solid ${COLORS.lineSoft}`, fontSize: 13, lineHeight: 1.8 }}>
            <div style={{ fontSize: 11, color: COLORS.ink3, fontFamily: MONO, marginBottom: 10 }}>PAGE 3 · 원본</div>
            <p>제4조 (계약금액) 본 계약의 총 금액은 <span style={{ background: COLORS.dangerSoft, color: COLORS.danger, padding: "2px 4px", borderRadius: 3, textDecoration: "line-through" }}>₩ 487,200,000</span> 으로 한다. 부가세는 별도로 하며 대금 지급은 <span style={{ background: COLORS.dangerSoft, color: COLORS.danger, padding: "2px 4px", borderRadius: 3, textDecoration: "line-through" }}>세 차례</span>에 걸쳐 분할 지급한다.</p>
            <p>제7조 (하자 담보책임) 준공일로부터 <span style={{ background: COLORS.dangerSoft, color: COLORS.danger, padding: "2px 4px", borderRadius: 3, textDecoration: "line-through" }}>1년간</span> 을(를) 하자 담보 기간으로 한다.</p>
          </div>
          <div style={{ padding: 20, fontSize: 13, lineHeight: 1.8 }}>
            <div style={{ fontSize: 11, color: COLORS.ink3, fontFamily: MONO, marginBottom: 10 }}>PAGE 3 · 수정본</div>
            <p>제4조 (계약금액) 본 계약의 총 금액은 <span style={{ background: COLORS.okSoft, color: COLORS.ok, padding: "2px 4px", borderRadius: 3, fontWeight: 500 }}>₩ 512,800,000</span> 으로 한다. 부가세는 별도로 하며 대금 지급은 <span style={{ background: COLORS.okSoft, color: COLORS.ok, padding: "2px 4px", borderRadius: 3, fontWeight: 500 }}>네 차례(계약·착공·중간·준공)</span>에 걸쳐 분할 지급한다.</p>
            <p>제7조 (하자 담보책임) 준공일로부터 <span style={{ background: COLORS.okSoft, color: COLORS.ok, padding: "2px 4px", borderRadius: 3, fontWeight: 500 }}>2년간(주요 구조부 5년)</span> 을(를) 하자 담보 기간으로 한다.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>AI 분석 요약</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { t: "금액 증액", v: "+₩25.6M", s: "약 5.3% 증액", c: "warn" },
            { t: "지급 구조", v: "3회 → 4회", s: "중간 지급 추가", c: "accent" },
            { t: "하자 담보", v: "1년 → 2년", s: "구조부 5년 명시", c: "danger" },
          ].map((x, i) => (
            <div key={i} style={{ padding: 14, background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.lineSoft}` }}>
              <div style={{ fontSize: 11.5, color: COLORS.ink3, marginBottom: 4 }}>{x.t}</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 2, letterSpacing: -0.3 }}>{x.v}</div>
              <div style={{ fontSize: 11.5, color: COLORS.ink3 }}>{x.s}</div>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

function FileChip({ color, label, name, meta }) {
  const isAccent = color === "accent";
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: COLORS.panel,
      border: `1px solid ${isAccent ? COLORS.accent : COLORS.line}`,
      boxShadow: isAccent ? `0 0 0 3px ${COLORS.accentSoft}` : "none",
      display: "flex", alignItems: "center", gap: 14
    }}>
      <div style={{ width: 40, height: 48, borderRadius: 4, background: "#F5F2EB", border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.ink3, fontFamily: MONO }}>PDF</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: isAccent ? COLORS.accent : COLORS.ink3, fontWeight: 600, marginBottom: 2, letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: COLORS.ink3, marginTop: 2 }}>{meta}</div>
      </div>
    </div>
  );
}

// ============ SCREEN 4: TABLE EXTRACT ============
function TableScreen() {
  const rows = [
    ["A-01", "이형철근 D13", "KS D 3504", "14,850", "280", "4,158,000"],
    ["A-02", "이형철근 D16", "KS D 3504", "14,850", "420", "6,237,000"],
    ["A-03", "이형철근 D19", "KS D 3504", "14,850", "310", "4,603,500"],
    ["B-01", "레미콘 25-24-150", "KS F 4009", "98,400", "48", "4,723,200"],
    ["B-02", "레미콘 25-27-150", "KS F 4009", "102,300", "36", "3,682,800"],
    ["C-01", "구조용 강관 Ø114.3", "KS D 3566", "3,840", "180", "691,200"],
  ];
  return (
    <Shell active="table">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>표 추출</h1>
        <Badge color="ok">3개 표 감지</Badge>
      </div>
      <div style={{ color: COLORS.ink3, fontSize: 13.5, marginBottom: 24 }}>PDF에서 표를 감지하여 편집 가능한 엑셀로 변환합니다</div>

      {/* Progress steps */}
      <Card pad={16} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[
            { s: "페이지 분석", d: "완료", done: true },
            { s: "표 감지", d: "3개 발견", done: true },
            { s: "셀 구조 추출", d: "진행 중 · 68%", active: true },
            { s: "엑셀 변환", d: "대기" },
          ].map((st, i, a) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: st.done ? COLORS.ok : st.active ? COLORS.accent : COLORS.line,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 600
                }}>
                  {st.done ? "✓" : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{st.s}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.ink3 }}>{st.d}</div>
                </div>
              </div>
              {i < a.length - 1 && <div style={{ flex: 1, height: 1, background: COLORS.line }}/>}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <Card pad={0}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>표 1 / 3 · 자재 단가표</div>
          <Badge color="neutral">p.4 추출</Badge>
          <Badge color="neutral">6행 × 6열</Badge>
          <div style={{ flex: 1 }}/>
          <button style={{ ...btnGhost(), fontSize: 12, padding: "6px 10px" }}>+ 열 추가</button>
          <button style={{ ...btnGhost(), fontSize: 12, padding: "6px 10px" }}>⎘ 복사</button>
          <button style={{ ...btnPrimary(), fontSize: 12, padding: "6px 12px", background: COLORS.ok }}>↓ 엑셀 다운로드</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#F5F2EB" }}>
                {["코드", "품명", "규격", "단가(원)", "수량", "금액(원)"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: i > 2 ? "right" : "left", fontWeight: 600, fontSize: 11.5, color: COLORS.ink2, borderBottom: `1px solid ${COLORS.line}`, letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.lineSoft}`, background: i === 2 ? COLORS.accentSoft : "transparent" }}>
                  {r.map((c, j) => (
                    <td key={j} style={{
                      padding: "10px 12px",
                      textAlign: j > 2 ? "right" : "left",
                      fontFamily: j > 2 ? MONO : FONT,
                      fontVariantNumeric: j > 2 ? "tabular-nums" : "normal",
                      color: j === 0 ? COLORS.ink3 : COLORS.ink,
                      fontWeight: j === 1 ? 500 : 400,
                    }}>
                      {i === 2 && j === 3 ? <span style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, border: `1.5px solid ${COLORS.accent}`, display: "inline-block", minWidth: 60, textAlign: "right" }}>{c}</span> : c}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ background: "#F5F2EB", fontWeight: 600 }}>
                <td colSpan={5} style={{ padding: "10px 12px", textAlign: "right", fontSize: 12 }}>합계</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>24,095,700</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 20px", borderTop: `1px solid ${COLORS.lineSoft}`, display: "flex", gap: 6, fontSize: 12 }}>
          {["표 1 · 자재 단가표", "표 2 · 공정 일정", "표 3 · 품질검사 항목"].map((t, i) => (
            <div key={i} style={{ padding: "6px 12px", borderRadius: 6, background: i === 0 ? COLORS.ink : "transparent", color: i === 0 ? "#fff" : COLORS.ink3 }}>{t}</div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

// ============ SCREEN 5: TRANSLATE ============
function TranslateScreen() {
  return (
    <Shell active="translate">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>번역</h1>
        <Badge color="accent">AI</Badge>
      </div>
      <div style={{ color: COLORS.ink3, fontSize: 13.5, marginBottom: 24 }}>PDF 문서를 원하는 언어로 번역하여 추출합니다</div>

      <Card pad={16} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 44, borderRadius: 4, background: "#F5F2EB", border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.ink3, fontFamily: MONO }}>PDF</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>ENG-spec-pipeline.pdf</div>
          <div style={{ fontSize: 12, color: COLORS.ink3, marginTop: 2 }}>24페이지 · 1.8 MB</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 10, fontSize: 13 }}>
          <LangPill code="EN" name="영어"/>
          <span style={{ color: COLORS.ink3 }}>→</span>
          <LangPill code="KO" name="한국어" active/>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card pad={0}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
            <LangPill code="EN" name="원문"/>
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 11.5, color: COLORS.ink3, fontFamily: MONO }}>PAGE 3 / 24</span>
          </div>
          <div style={{ padding: 20, fontSize: 13.5, lineHeight: 1.75, color: COLORS.ink2 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>3. Pipeline Construction Standards</div>
            <p style={{ margin: "0 0 10px" }}>All welded joints in the pressure pipeline shall comply with <i>ASME B31.3</i>, and 100% radiographic testing is required for joints exceeding DN 200.</p>
            <p style={{ margin: "0 0 10px" }}>The pipe support spacing shall not exceed <b>3.0m</b> for horizontal runs of carbon steel pipes. Any deviation requires written approval from the project engineer.</p>
            <p style={{ margin: 0 }}>Hydrostatic testing shall be performed at <b>1.5× the design pressure</b> for a minimum duration of 30 minutes, with pressure drop not exceeding 2%.</p>
          </div>
        </Card>

        <Card pad={0} style={{ border: `1px solid ${COLORS.accent}`, boxShadow: `0 0 0 3px ${COLORS.accentSoft}` }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
            <LangPill code="KO" name="번역" active/>
            <Badge color="ok">● 완료</Badge>
            <div style={{ flex: 1 }}/>
            <button style={{ ...btnGhost(), fontSize: 11.5, padding: "5px 10px" }}>⎘</button>
            <button style={{ ...btnGhost(), fontSize: 11.5, padding: "5px 10px" }}>↻</button>
          </div>
          <div style={{ padding: 20, fontSize: 13.5, lineHeight: 1.75, color: COLORS.ink2 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>3. 배관 시공 기준</div>
            <p style={{ margin: "0 0 10px" }}>압력 배관의 모든 용접 이음부는 <i>ASME B31.3</i>을 준수해야 하며, <b>DN 200을 초과하는 이음부</b>는 100% 방사선 투과시험(RT)이 요구된다.</p>
            <p style={{ margin: "0 0 10px" }}>수평 탄소강 배관의 지지대 간격은 <b>3.0m</b>를 초과할 수 없다. 이를 벗어날 경우 프로젝트 엔지니어의 서면 승인을 받아야 한다.</p>
            <p style={{ margin: 0 }}>수압시험은 <b>설계압력의 1.5배</b>로, 최소 30분간 수행하며 압력 강하는 2%를 초과하지 않아야 한다.</p>
          </div>
        </Card>
      </div>

      {/* Progress strip */}
      <Card pad={16} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>전체 진행률</div>
          <div style={{ flex: 1, height: 6, background: COLORS.lineSoft, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "42%", background: `linear-gradient(90deg, ${COLORS.accent}, #7B8EFF)`, borderRadius: 3 }}/>
          </div>
          <div style={{ fontSize: 13, color: COLORS.ink3, fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>10 / 24 페이지 · 42%</div>
          <button style={btnGhost()}>일시정지</button>
        </div>
      </Card>
    </Shell>
  );
}

function LangPill({ code, name, active }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: active ? COLORS.accentSoft : "#F3F2EC", color: active ? COLORS.accentInk : COLORS.ink2, fontSize: 12 }}>
      <span style={{ fontWeight: 600, fontFamily: MONO, fontSize: 10.5, letterSpacing: 0.5 }}>{code}</span>
      <span>{name}</span>
    </div>
  );
}

// ============ SCREEN 6: ADMIN · TOKENS ============
function AdminTokensScreen() {
  const months = [
    { m: "2026-01", req: 842, users: 38, inp: 12_480_300, out: 2_180_400 },
    { m: "2026-02", req: 1_124, users: 46, inp: 18_920_140, out: 3_420_200 },
    { m: "2026-03", req: 1_586, users: 52, inp: 24_380_680, out: 4_810_920 },
    { m: "2026-04", req: 1_942, users: 58, inp: 31_740_220, out: 6_120_840 },
  ];
  const fmtNum = (n) => n.toLocaleString("ko-KR");
  const calcCost = (i, o) => {
    const usd = (i / 1e6) * 0.15 + (o / 1e6) * 0.60;
    return { usd, krw: usd * 1380 };
  };
  const tot = months.reduce((a, m) => ({ req: a.req + m.req, inp: a.inp + m.inp, out: a.out + m.out }), { req: 0, inp: 0, out: 0 });
  const totCost = calcCost(tot.inp, tot.out);
  const details = [
    { t: "2026-04-21 14:32", id: "162264", nm: "김예은", menu: "요약", file: "2026 시공품질 관리계획서.pdf", p: "전체", inp: 184_200, out: 28_400 },
    { t: "2026-04-21 14:18", id: "158901", nm: "박지훈", menu: "번역", file: "ENG-spec-pipeline.pdf", p: 12, inp: 42_180, out: 18_600 },
    { t: "2026-04-21 13:55", id: "171022", nm: "이서연", menu: "표추출", file: "자재단가표_2026Q2.pdf", p: 4, inp: 28_400, out: 12_840 },
    { t: "2026-04-21 13:42", id: "162264", nm: "김예은", menu: "비교", file: "협력사 계약서 v3.2.pdf", p: "전체", inp: 96_800, out: 42_100 },
    { t: "2026-04-21 13:20", id: "149577", nm: "최민호", menu: "내용추출", file: "현장안전수칙_개정안.pdf", p: 18, inp: 52_400, out: 24_800 },
    { t: "2026-04-21 12:48", id: "180341", nm: "정하늘", menu: "요약", file: "월간보고서_3월.pdf", p: "전체", inp: 128_600, out: 19_200 },
  ];

  return (
    <Shell active="admin">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>관리자</h1>
        <Badge color="neutral">⚙ Admin</Badge>
      </div>
      <div style={{ color: COLORS.ink3, fontSize: 13.5, marginBottom: 20 }}>작업 이력·토큰 사용량·방문자 로그·권한을 관리합니다</div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${COLORS.line}`, marginBottom: 20 }}>
        {[
          { k: "history", l: "작업 이력" },
          { k: "tokens", l: "토큰 사용량", on: true },
          { k: "visitors", l: "방문자 로그" },
          { k: "limits", l: "사용 한도" },
          { k: "users", l: "권한 관리" },
        ].map(t => (
          <div key={t.k} style={{
            padding: "10px 16px", fontSize: 13.5,
            color: t.on ? COLORS.ink : COLORS.ink3,
            fontWeight: t.on ? 600 : 400,
            borderBottom: t.on ? `2px solid ${COLORS.ink}` : "2px solid transparent",
            marginBottom: -1, cursor: "pointer"
          }}>{t.l}</div>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 8 }}>YTD 요청</div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>{fmtNum(tot.req)}<span style={{ fontSize: 13, color: COLORS.ink3, fontWeight: 400, marginLeft: 4 }}>건</span></div>
          <div style={{ fontSize: 11.5, color: COLORS.ok, marginTop: 6, fontWeight: 500 }}>+22% vs 전분기</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 8 }}>입력 토큰</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, fontFamily: MONO }}>{(tot.inp / 1e6).toFixed(1)}<span style={{ fontSize: 13, color: COLORS.ink3, fontWeight: 400, marginLeft: 2, fontFamily: FONT }}>M</span></div>
          <div style={{ fontSize: 11.5, color: COLORS.ink3, marginTop: 6 }}>{fmtNum(tot.inp)} tokens</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 8 }}>출력 토큰</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, fontFamily: MONO }}>{(tot.out / 1e6).toFixed(2)}<span style={{ fontSize: 13, color: COLORS.ink3, fontWeight: 400, marginLeft: 2, fontFamily: FONT }}>M</span></div>
          <div style={{ fontSize: 11.5, color: COLORS.ink3, marginTop: 6 }}>{fmtNum(tot.out)} tokens</div>
        </Card>
        <Card style={{ background: `linear-gradient(135deg, ${COLORS.ink} 0%, #23262D 100%)`, color: "#fff", border: "none" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>추정 비용 (YTD)</div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5, fontFamily: MONO }}>₩{fmtNum(Math.round(totCost.krw))}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginTop: 6, fontFamily: MONO }}>${totCost.usd.toFixed(2)} · gpt-5.4-mini</div>
        </Card>
      </div>

      {/* Monthly */}
      <Card pad={0} style={{ marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>월별 사용량</div>
          <Badge color="neutral">2026</Badge>
          <div style={{ flex: 1 }}/>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ padding: "4px 10px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12, color: COLORS.ink2 }}>2026년 ▾</div>
            <button style={{ ...btnGhost(), fontSize: 12, padding: "4px 10px" }}>↓ CSV</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#F5F2EB" }}>
                {["월", "요청 수", "사용자", "입력 토큰", "출력 토큰", "합계", "비용 (USD)", "비용 (KRW)"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, fontSize: 11.5, color: COLORS.ink2, borderBottom: `1px solid ${COLORS.line}`, letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const c = calcCost(m.inp, m.out);
                const maxReq = Math.max(...months.map(x => x.req));
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.lineSoft}` }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: MONO, fontSize: 12 }}>{m.m}</span>
                        <div style={{ width: 60, height: 4, background: COLORS.lineSoft, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${(m.req / maxReq) * 100}%`, height: "100%", background: COLORS.accent }}/>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(m.req)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, color: COLORS.ink3 }}>{m.users}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(m.inp)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(m.out)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{fmtNum(m.inp + m.out)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, color: COLORS.ink3 }}>${c.usd.toFixed(3)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontWeight: 500 }}>₩{fmtNum(Math.round(c.krw))}</td>
                  </tr>
                );
              })}
              <tr style={{ background: COLORS.accentSoft, fontWeight: 600 }}>
                <td style={{ padding: "10px 14px" }}>합계</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(tot.req)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", color: COLORS.ink3 }}>—</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(tot.inp)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(tot.out)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(tot.inp + tot.out)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, color: COLORS.accentInk }}>${totCost.usd.toFixed(2)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, color: COLORS.accentInk }}>₩{fmtNum(Math.round(totCost.krw))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 20px", fontSize: 11.5, color: COLORS.ink3, borderTop: `1px solid ${COLORS.lineSoft}` }}>
          * gpt-5.4-mini 기준 추정치 · 입력 $0.15/1M · 출력 $0.60/1M · 환율 ₩1,380/USD
        </div>
      </Card>

      {/* Detail */}
      <Card pad={0}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>상세 조회</div>
          <div style={{ flex: 1 }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "5px 10px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, color: COLORS.ink3 }}>
            <span>📅</span>
            <span style={{ fontFamily: MONO, color: COLORS.ink2 }}>2026-04-14 ~ 2026-04-21</span>
          </div>
          <div style={{ padding: "5px 10px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12, color: COLORS.ink2 }}>직번 ▾</div>
          <div style={{ padding: "5px 10px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12, color: COLORS.ink2 }}>메뉴: 전체 ▾</div>
          <button style={{ ...btnPrimary(), fontSize: 12, padding: "6px 12px" }}>조회</button>
          <button style={{ ...btnGhost(), fontSize: 12, padding: "6px 10px" }}>↓ CSV</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#F5F2EB" }}>
              {["시간", "직번", "이름", "메뉴", "파일", "페이지", "입력", "출력", "비용(USD)"].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: i >= 5 ? "right" : "left", fontWeight: 600, fontSize: 11.5, color: COLORS.ink2, borderBottom: `1px solid ${COLORS.line}`, letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => {
              const c = calcCost(d.inp, d.out);
              const menuColors = { 요약: "warn", 번역: "danger", 표추출: "ok", 비교: "accent", 내용추출: "neutral" };
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.lineSoft}` }}>
                  <td style={{ padding: "10px 14px", fontSize: 11.5, color: COLORS.ink3, fontFamily: MONO }}>{d.t}</td>
                  <td style={{ padding: "10px 14px", fontFamily: MONO, color: COLORS.accent, fontWeight: 500 }}>{d.id}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{d.nm}</td>
                  <td style={{ padding: "10px 14px" }}><Badge color={menuColors[d.menu] || "neutral"}>{d.menu}</Badge></td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.ink2, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: COLORS.ink3, fontFamily: MONO }}>{d.p}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(d.inp)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtNum(d.out)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: MONO, fontWeight: 500 }}>${c.usd.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, justifyContent: "center", borderTop: `1px solid ${COLORS.lineSoft}`, fontSize: 12, color: COLORS.ink3 }}>
          <button style={{ ...btnGhost(), fontSize: 11.5, padding: "4px 10px" }}>← 이전</button>
          <span style={{ fontFamily: MONO }}>1 / 28</span>
          <button style={{ ...btnGhost(), fontSize: 11.5, padding: "4px 10px" }}>다음 →</button>
        </div>
      </Card>
    </Shell>
  );
}

// ============ SCREEN: ADMIN · USAGE LIMITS (per-user) ============
function AdminLimitsScreen() {
  const fmt = (n) => n.toLocaleString("ko-KR");
  const fmtK = (n) => n >= 1e6 ? (n/1e6).toFixed(2) + "M" : n >= 1e3 ? (n/1e3).toFixed(1) + "K" : String(n);
  const users = [
    { id: "162264", nm: "김예은", dept: "품질관리팀", used: 892_400, limit: 1_000_000, today: 84_200, status: "near" },
    { id: "158901", nm: "박지훈", dept: "시공지원실", used: 1_082_600, limit: 1_000_000, today: 0, status: "blocked" },
    { id: "171022", nm: "이서연", dept: "품질관리팀", used: 420_180, limit: 1_000_000, today: 28_400, status: "ok" },
    { id: "149577", nm: "최민호", dept: "설계1팀", used: 684_020, limit: 800_000, today: 52_400, status: "near" },
    { id: "180341", nm: "정하늘", dept: "기획실", used: 128_400, limit: 500_000, today: 0, status: "ok" },
    { id: "192014", nm: "강지민", dept: "시공지원실", used: 312_880, limit: 500_000, today: 14_200, status: "ok" },
    { id: "167723", nm: "윤도현", dept: "설계2팀", used: 48_200, limit: 500_000, today: 0, status: "ok" },
  ];
  const GLOBAL_USED = 38_420_000;
  const GLOBAL_LIMIT = 50_000_000;
  const globalPct = (GLOBAL_USED / GLOBAL_LIMIT) * 100;

  return (
    <Shell active="admin">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>관리자</h1>
        <Badge color="neutral">⚙ Admin</Badge>
      </div>
      <div style={{ color: COLORS.ink3, fontSize: 13.5, marginBottom: 20 }}>사용량 한도를 전사/부서/개인 단위로 설정하고 모니터링합니다</div>

      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${COLORS.line}`, marginBottom: 20 }}>
        {[
          { l: "작업 이력" }, { l: "토큰 사용량" }, { l: "방문자 로그" },
          { l: "사용 한도", on: true }, { l: "권한 관리" },
        ].map((t, i) => (
          <div key={i} style={{
            padding: "10px 16px", fontSize: 13.5,
            color: t.on ? COLORS.ink : COLORS.ink3,
            fontWeight: t.on ? 600 : 400,
            borderBottom: t.on ? `2px solid ${COLORS.ink}` : "2px solid transparent",
            marginBottom: -1, cursor: "pointer"
          }}>{t.l}</div>
        ))}
      </div>

      {/* Global limit */}
      <Card style={{ marginBottom: 14, background: `linear-gradient(135deg, ${COLORS.ink} 0%, #23262D 100%)`, color: "#fff", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 0.5 }}>전사 월 한도</div>
          <Badge color="ok">● 정상 운용</Badge>
          <div style={{ flex: 1 }}/>
          <button style={{ padding: "6px 12px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 6, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>한도 수정</button>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.8, fontFamily: MONO }}>{fmt(GLOBAL_USED)}</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontFamily: MONO }}>/ {fmt(GLOBAL_LIMIT)} tokens · {globalPct.toFixed(1)}%</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>리셋까지 9일</div>
        </div>
        <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 5, overflow: "hidden", position: "relative" }}>
          <div style={{ height: "100%", width: `${globalPct}%`, background: `linear-gradient(90deg, ${COLORS.accent}, #7B8EFF)`, borderRadius: 5 }}/>
          <div style={{ position: "absolute", top: -2, bottom: -2, left: "80%", width: 1, background: COLORS.warn }}/>
          <div style={{ position: "absolute", top: -2, bottom: -2, left: "95%", width: 1, background: COLORS.danger }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontFamily: MONO }}>
          <span>0</span><span style={{ marginLeft: "auto" }}>경고 80% · 차단 95%</span>
        </div>
      </Card>

      {/* Policy + Add rule */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>기본 한도 정책</div>
          {[
            { l: "개인 기본 (월)", v: "500,000 tokens", sub: "신규 사용자 기본값" },
            { l: "개인 기본 (일)", v: "50,000 tokens", sub: "일일 과다 사용 방지" },
            { l: "파일당 최대", v: "200,000 tokens", sub: "단일 요청 상한" },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 2 ? `1px solid ${COLORS.lineSoft}` : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.l}</div>
                <div style={{ fontSize: 11.5, color: COLORS.ink3, marginTop: 1 }}>{p.sub}</div>
              </div>
              <div style={{ fontSize: 13, fontFamily: MONO, fontWeight: 500 }}>{p.v}</div>
              <button style={{ ...btnGhost(), fontSize: 11.5, padding: "4px 10px" }}>수정</button>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>한도 초과 시 동작</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { l: "80% 도달 시 이메일 알림", on: true },
              { l: "95% 도달 시 사용자에게 경고 배너", on: true },
              { l: "100% 초과 시 신규 요청 차단", on: true },
              { l: "관리자 승인 시 일시 해제", on: false },
            ].map((o, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: COLORS.bg, border: `1px solid ${COLORS.lineSoft}` }}>
                <div style={{ width: 32, height: 18, borderRadius: 10, background: o.on ? COLORS.accent : COLORS.line, position: "relative", transition: "background .15s" }}>
                  <div style={{ position: "absolute", top: 2, left: o.on ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }}/>
                </div>
                <div style={{ fontSize: 13, flex: 1 }}>{o.l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Per-user table */}
      <Card pad={0}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>사용자별 토큰 사용량</div>
          <Badge color="neutral">2026-04</Badge>
          <div style={{ flex: 1 }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12, color: COLORS.ink3, minWidth: 200 }}>
            <span style={{ opacity: .6 }}>⌕</span>
            <span>이름 또는 직번 검색</span>
          </div>
          <div style={{ padding: "5px 10px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12, color: COLORS.ink2 }}>부서: 전체 ▾</div>
          <div style={{ padding: "5px 10px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12, color: COLORS.ink2 }}>상태: 전체 ▾</div>
          <button style={{ ...btnPrimary(), fontSize: 12, padding: "6px 12px" }}>+ 개인 한도 추가</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#F5F2EB" }}>
              {["직번 / 이름", "부서", "이번 달 사용량", "한도", "사용률", "오늘", "상태", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: i >= 2 && i <= 5 ? "right" : "left", fontWeight: 600, fontSize: 11.5, color: COLORS.ink2, borderBottom: `1px solid ${COLORS.line}`, letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const pct = (u.used / u.limit) * 100;
              const over = pct > 100;
              const barColor = over ? COLORS.danger : pct >= 80 ? COLORS.warn : COLORS.accent;
              const statusMap = {
                ok: { color: "ok", label: "● 정상" },
                near: { color: "warn", label: "● 경고" },
                blocked: { color: "danger", label: "● 차단됨" },
              };
              const s = statusMap[u.status];
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.lineSoft}`, background: u.status === "blocked" ? "rgba(200,50,30,0.03)" : "transparent" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F3F2EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600, color: COLORS.ink2 }}>{u.nm[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{u.nm}</div>
                        <div style={{ fontSize: 11, color: COLORS.ink3, fontFamily: MONO }}>{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", color: COLORS.ink2, fontSize: 12.5 }}>{u.dept}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: MONO, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmt(u.used)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: MONO, color: COLORS.ink3, fontVariantNumeric: "tabular-nums" }}>{fmt(u.limit)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <div style={{ width: 100, height: 5, background: COLORS.lineSoft, borderRadius: 3, overflow: "hidden", position: "relative" }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: barColor, borderRadius: 3 }}/>
                        {over && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `repeating-linear-gradient(45deg, transparent 0, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 6px)` }}/>}
                      </div>
                      <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 500, minWidth: 42, textAlign: "right", color: over ? COLORS.danger : pct >= 80 ? COLORS.warn : COLORS.ink2, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: MONO, color: COLORS.ink3, fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>{u.today > 0 ? fmtK(u.today) : "—"}</td>
                  <td style={{ padding: "12px 14px" }}><Badge color={s.color}>{s.label}</Badge></td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {u.status === "blocked"
                      ? <button style={{ ...btnPrimary(), fontSize: 11.5, padding: "5px 10px", background: COLORS.ok }}>해제</button>
                      : <button style={{ ...btnGhost(), fontSize: 11.5, padding: "5px 10px" }}>한도 변경</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}

// ============ SCREEN 7: ADMIN · VISITORS ============
function AdminVisitorsScreen() {
  const daily = [
    { d: "04-14", u: 32 }, { d: "04-15", u: 38 }, { d: "04-16", u: 45 }, { d: "04-17", u: 42 },
    { d: "04-18", u: 28 }, { d: "04-19", u: 14 }, { d: "04-20", u: 12 }, { d: "04-21", u: 52 },
  ];
  const topUsers = [
    { id: "162264", nm: "김예은", v: 48 },
    { id: "158901", nm: "박지훈", v: 36 },
    { id: "171022", nm: "이서연", v: 29 },
    { id: "149577", nm: "최민호", v: 24 },
    { id: "180341", nm: "정하늘", v: 18 },
  ];
  const entries = [
    { d: "2026-04-21", t: "14:32:18", id: "162264", nm: "김예은", ip: "10.82.14.127", path: "/summary" },
    { d: "2026-04-21", t: "14:28:44", id: "158901", nm: "박지훈", ip: "10.82.14.201", path: "/translate" },
    { d: "2026-04-21", t: "14:18:09", id: "171022", nm: "이서연", ip: "10.82.14.088", path: "/extract/table" },
    { d: "2026-04-21", t: "14:02:51", id: "162264", nm: "김예은", ip: "10.82.14.127", path: "/admin/history" },
    { d: "2026-04-21", t: "13:55:33", id: "149577", nm: "최민호", ip: "10.82.15.044", path: "/extract/content" },
    { d: "2026-04-21", t: "13:42:11", id: "180341", nm: "정하늘", ip: "10.82.14.302", path: "/compare" },
    { d: "2026-04-21", t: "13:20:58", id: "162264", nm: "김예은", ip: "10.82.14.127", path: "/home" },
  ];
  const maxU = Math.max(...daily.map(d => d.u));
  const maxT = Math.max(...topUsers.map(u => u.v));
  const fmt = (n) => n.toLocaleString("ko-KR");

  return (
    <Shell active="admin">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>관리자</h1>
        <Badge color="neutral">⚙ Admin</Badge>
      </div>
      <div style={{ color: COLORS.ink3, fontSize: 13.5, marginBottom: 20 }}>작업 이력·토큰 사용량·방문자 로그·권한을 관리합니다</div>

      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${COLORS.line}`, marginBottom: 20 }}>
        {[
          { k: "history", l: "작업 이력" },
          { k: "tokens", l: "토큰 사용량" },
          { k: "visitors", l: "방문자 로그", on: true },
          { k: "limits", l: "사용 한도" },
          { k: "users", l: "권한 관리" },
        ].map(t => (
          <div key={t.k} style={{
            padding: "10px 16px", fontSize: 13.5,
            color: t.on ? COLORS.ink : COLORS.ink3,
            fontWeight: t.on ? 600 : 400,
            borderBottom: t.on ? `2px solid ${COLORS.ink}` : "2px solid transparent",
            marginBottom: -1, cursor: "pointer"
          }}>{t.l}</div>
        ))}
      </div>

      {/* Filter bar */}
      <Card pad={14} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: COLORS.ink3, fontWeight: 500 }}>조회 기간</span>
        <div style={{ padding: "6px 12px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12.5, color: COLORS.ink2, fontFamily: MONO }}>2026-04-14</div>
        <span style={{ color: COLORS.ink3 }}>~</span>
        <div style={{ padding: "6px 12px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12.5, color: COLORS.ink2, fontFamily: MONO }}>2026-04-21</div>
        <button style={{ ...btnPrimary(), fontSize: 12, padding: "6px 14px" }}>조회</button>
        <div style={{ flex: 1 }}/>
        <button style={{ ...btnGhost(), fontSize: 12, padding: "6px 12px" }}>↓ CSV 다운로드</button>
      </Card>

      {/* KPIs + Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card>
            <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 6 }}>총 방문</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>{fmt(263)}<span style={{ fontSize: 13, color: COLORS.ink3, fontWeight: 400, marginLeft: 4 }}>건</span></div>
          </Card>
          <Card>
            <div style={{ fontSize: 12, color: COLORS.ink3, marginBottom: 6 }}>고유 사용자</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>58<span style={{ fontSize: 13, color: COLORS.ink3, fontWeight: 400, marginLeft: 4 }}>명</span></div>
            <div style={{ fontSize: 11.5, color: COLORS.ok, marginTop: 6, fontWeight: 500 }}>+9명 vs 지난주</div>
          </Card>
        </div>
        <Card>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>일별 고유 방문자</div>
            <div style={{ flex: 1 }}/>
            <div style={{ display: "flex", gap: 10, fontSize: 11.5, color: COLORS.ink3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: COLORS.accent, borderRadius: 2 }}/>고유 사용자</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 160, paddingBottom: 26, position: "relative" }}>
            {daily.map((d, i) => {
              const pct = (d.u / maxU) * 100;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative" }}>
                  <div style={{ fontSize: 11, color: COLORS.ink3, marginBottom: 4, fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{d.u}</div>
                  <div style={{
                    width: "100%", maxWidth: 40,
                    background: `linear-gradient(180deg, ${COLORS.accent}, #7B8EFF)`,
                    height: `${Math.max(pct, 4)}%`, borderRadius: "4px 4px 0 0",
                  }}/>
                  <div style={{ position: "absolute", bottom: 0, fontSize: 10.5, color: COLORS.ink3, fontFamily: MONO }}>{d.d}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Top users + Log */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <Card pad={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.lineSoft}`, fontSize: 14, fontWeight: 600 }}>최다 방문 사용자</div>
          <div style={{ padding: "6px 0" }}>
            {topUsers.map((u, i) => (
              <div key={i} style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 22, textAlign: "center", fontSize: 11, color: COLORS.ink3, fontFamily: MONO, fontWeight: 600 }}>{i + 1}</div>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F3F2EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 600, color: COLORS.ink2 }}>{u.nm[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{u.nm}</div>
                  <div style={{ fontSize: 11, color: COLORS.ink3, fontFamily: MONO }}>{u.id}</div>
                </div>
                <div style={{ width: 90, height: 5, background: COLORS.lineSoft, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${(u.v / maxT) * 100}%`, height: "100%", background: COLORS.accent }}/>
                </div>
                <div style={{ fontSize: 12, fontFamily: MONO, fontWeight: 500, fontVariantNumeric: "tabular-nums", minWidth: 24, textAlign: "right" }}>{u.v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card pad={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.lineSoft}`, display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>방문자 상세 로그</div>
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 12, color: COLORS.ink3 }}>총 {fmt(263)}건</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#F5F2EB" }}>
                {["날짜", "시간", "직번", "이름", "IP", "경로"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11.5, color: COLORS.ink2, borderBottom: `1px solid ${COLORS.line}`, letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.lineSoft}` }}>
                  <td style={{ padding: "9px 14px", color: COLORS.ink3, fontSize: 11.5, fontFamily: MONO }}>{e.d}</td>
                  <td style={{ padding: "9px 14px", fontFamily: MONO, fontSize: 11.5 }}>{e.t}</td>
                  <td style={{ padding: "9px 14px", color: COLORS.accent, fontFamily: MONO, fontWeight: 500 }}>{e.id}</td>
                  <td style={{ padding: "9px 14px", fontWeight: 500 }}>{e.nm}</td>
                  <td style={{ padding: "9px 14px", color: COLORS.ink3, fontFamily: MONO, fontSize: 11.5 }}>{e.ip}</td>
                  <td style={{ padding: "9px 14px" }}><span style={{ fontFamily: MONO, fontSize: 11.5, padding: "2px 6px", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 4, color: COLORS.ink2 }}>{e.path}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Shell>
  );
}

Object.assign(window, { HomeScreen, SummaryScreen, CompareScreen, TableScreen, TranslateScreen, AdminTokensScreen, AdminVisitorsScreen, AdminLimitsScreen });
