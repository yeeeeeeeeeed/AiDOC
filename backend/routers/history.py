"""이력 관리 + 관리자 라우터"""

import os
import json
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
router = APIRouter()

# 관리자 목록 파일
ADMIN_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "admins.json")

# 방문자 로그 디렉토리
VISITOR_LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Log", "visitors")
os.makedirs(VISITOR_LOG_DIR, exist_ok=True)


def _load_json_list(filepath: str) -> list:
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_json_list(filepath: str, data: list):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _get_admins() -> list[str]:
    return _load_json_list(ADMIN_FILE)


def is_admin(request: Request) -> bool:
    user_id = request.cookies.get("AXI-USER-ID", "")
    return user_id in _get_admins()


def is_allowed_user(request: Request) -> bool:
    return True  # 모든 SSO 인증 사용자 허용


def log_visitor(request: Request):
    """방문자 로그 기록"""
    user_id = request.cookies.get("AXI-USER-ID", "")
    if not user_id:
        return
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(VISITOR_LOG_DIR, f"{today}.json")

    visitors = _load_json_list(log_file) if os.path.exists(log_file) else []
    entry = {
        "user_id": user_id,
        "user_name": request.cookies.get("AXI-USER-NAME", ""),
        "path": str(request.url.path),
        "method": request.method,
        "timestamp": datetime.now().isoformat(),
    }
    visitors.append(entry)
    _save_json_list(log_file, visitors)


def log_action(menu: str, action: str, detail: str = "", request: Request = None):
    """액션 로그 기록"""
    user_id = request.cookies.get("AXI-USER-ID", "") if request else ""
    user_name = request.cookies.get("AXI-USER-NAME", "") if request else ""
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(VISITOR_LOG_DIR, f"actions_{today}.json")

    actions = _load_json_list(log_file) if os.path.exists(log_file) else []
    actions.append({
        "user_id": user_id,
        "user_name": user_name,
        "menu": menu,
        "action": action,
        "detail": detail,
        "timestamp": datetime.now().isoformat(),
    })
    _save_json_list(log_file, actions)


# ── 관리자 전용 API ──

@router.get("/check")
def check_access(request: Request):
    """접근 권한 확인"""
    return {
        "is_allowed": True,
        "is_admin": is_admin(request),
        "user_id": request.cookies.get("AXI-USER-ID", ""),
        "user_name": request.cookies.get("AXI-USER-NAME", ""),
    }


@router.get("/dashboard")
def get_dashboard(request: Request):
    """관리자 대시보드 통계"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    def read_visitors(date: str):
        f = os.path.join(VISITOR_LOG_DIR, f"{date}.json")
        return _load_json_list(f) if os.path.exists(f) else []

    def read_actions(date: str):
        f = os.path.join(VISITOR_LOG_DIR, f"actions_{date}.json")
        return _load_json_list(f) if os.path.exists(f) else []

    today_visitors = read_visitors(today)
    yest_visitors = read_visitors(yesterday)
    today_actions = read_actions(today)

    today_unique = len(set(v.get("user_id") for v in today_visitors if v.get("user_id")))
    yest_unique = len(set(v.get("user_id") for v in yest_visitors if v.get("user_id")))

    # 이번 주 누적 방문
    week_visits = 0
    cur = datetime.now() - timedelta(days=6)
    while cur <= datetime.now():
        day_v = read_visitors(cur.strftime("%Y-%m-%d"))
        week_visits += len(set(v.get("user_id") for v in day_v if v.get("user_id")))
        cur += timedelta(days=1)

    # 최근 방문자 (오늘 기준 최신순, 중복 제거)
    seen = set()
    recent_visitors = []
    for v in sorted(today_visitors, key=lambda x: x.get("timestamp", ""), reverse=True):
        uid = v.get("user_id", "")
        if uid and uid not in seen:
            seen.add(uid)
            recent_visitors.append({"user_id": uid, "user_name": v.get("user_name", ""), "timestamp": v.get("timestamp", "")})
        if len(recent_visitors) >= 10:
            break

    recent_executions = sorted(today_actions, key=lambda x: x.get("timestamp", ""), reverse=True)[:10]

    return {
        "today_unique_visitors": today_unique,
        "yest_unique_visitors": yest_unique,
        "today_executions": len(today_actions),
        "week_visits": week_visits,
        "recent_visitors": recent_visitors,
        "recent_executions": recent_executions,
    }


@router.get("/history")
def get_history(
    request: Request,
    date_from: str = "",
    date_to: str = "",
    user_id: str = "",
    user_name: str = "",
    action_type: str = "",
    page: int = 1,
    size: int = 50,
):
    """이력 조회 (관리자 전용)"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    if not date_from:
        date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")

    all_actions = []
    current = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(date_to, "%Y-%m-%d")

    while current <= end:
        day_str = current.strftime("%Y-%m-%d")
        log_file = os.path.join(VISITOR_LOG_DIR, f"actions_{day_str}.json")
        if os.path.exists(log_file):
            all_actions.extend(_load_json_list(log_file))
        current += timedelta(days=1)

    if user_id:
        all_actions = [a for a in all_actions if a.get("user_id") == user_id]
    if user_name:
        kw = user_name.lower()
        all_actions = [a for a in all_actions if kw in a.get("user_name", "").lower()]
    if action_type:
        all_actions = [a for a in all_actions if a.get("action") == action_type]

    all_actions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    total = len(all_actions)
    start = (page - 1) * size
    items = all_actions[start:start + size] if size > 0 else all_actions

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "total_pages": (total + size - 1) // size,
    }


@router.get("/visitors")
def get_visitors(
    request: Request,
    date_from: str = "",
    date_to: str = "",
):
    """방문자 통계 (관리자 전용)"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    if not date_from:
        date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")

    daily = []
    all_visitors = []
    current = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(date_to, "%Y-%m-%d")

    while current <= end:
        day_str = current.strftime("%Y-%m-%d")
        log_file = os.path.join(VISITOR_LOG_DIR, f"{day_str}.json")
        day_visitors = _load_json_list(log_file) if os.path.exists(log_file) else []

        unique = {}
        for v in day_visitors:
            uid = v.get("user_id", "")
            if uid and uid not in unique:
                unique[uid] = v.get("user_name", "")

        daily.append({
            "date": day_str,
            "total_visits": len(day_visitors),
            "unique_users": len(unique),
            "users": [{"user_id": k, "user_name": v} for k, v in unique.items()],
        })
        all_visitors.extend(day_visitors)
        current += timedelta(days=1)

    # 전체 기간 사용자별 방문 횟수
    user_counts: dict[str, dict] = {}
    for v in all_visitors:
        uid = v.get("user_id", "")
        if not uid:
            continue
        if uid not in user_counts:
            user_counts[uid] = {"user_id": uid, "user_name": v.get("user_name", ""), "visits": 0}
        user_counts[uid]["visits"] += 1

    top_users = sorted(user_counts.values(), key=lambda x: x["visits"], reverse=True)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_visits": len(all_visitors),
        "unique_users": len(user_counts),
        "daily": daily,
        "top_users": top_users,
    }


# ── 관리자 관리 ──

@router.get("/users")
def get_user_list(request: Request):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")
    return {"admins": _get_admins()}


@router.post("/users/add")
async def add_user(request: Request):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")
    body = await request.json()
    uid = body.get("user_id", "").strip()
    if not uid:
        raise HTTPException(400, "user_id 필요")

    admins = _get_admins()
    if uid not in admins:
        admins.append(uid)
        _save_json_list(ADMIN_FILE, admins)
    return {"ok": True}


@router.post("/users/remove")
async def remove_user(request: Request):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")
    body = await request.json()
    uid = body.get("user_id", "").strip()

    admins = _get_admins()
    if uid in admins:
        admins.remove(uid)
        _save_json_list(ADMIN_FILE, admins)
    return {"ok": True}


# ── 토큰 사용량 ──

TOKEN_LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Log")

def _read_token_logs(date_from: str, date_to: str) -> list:
    all_entries = []
    current = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(date_to, "%Y-%m-%d")
    while current <= end:
        day_str = current.strftime("%Y-%m-%d")
        log_file = os.path.join(TOKEN_LOG_DIR, f"tokens_{day_str}.jsonl")
        if os.path.exists(log_file):
            with open(log_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            all_entries.append(json.loads(line))
                        except Exception:
                            pass
        current += timedelta(days=1)
    return all_entries


@router.get("/tokens/summary")
def get_token_summary(request: Request, year: str = ""):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    if not year:
        year = datetime.now().strftime("%Y")

    entries = _read_token_logs(f"{year}-01-01", f"{year}-12-31")

    monthly: dict[str, dict] = {}
    for e in entries:
        month = e.get("timestamp", "")[:7]
        if not month:
            continue
        if month not in monthly:
            monthly[month] = {"month": month, "requests": 0, "input_tokens": 0, "output_tokens": 0, "users": set()}
        monthly[month]["requests"] += 1
        monthly[month]["input_tokens"] += e.get("input_tokens", 0)
        monthly[month]["output_tokens"] += e.get("output_tokens", 0)
        if e.get("user_id"):
            monthly[month]["users"].add(e["user_id"])

    result = []
    for m in sorted(monthly.keys()):
        d = monthly[m]
        result.append({
            "month": d["month"],
            "requests": d["requests"],
            "input_tokens": d["input_tokens"],
            "output_tokens": d["output_tokens"],
            "unique_users": len(d["users"]),
        })
    return {"year": year, "months": result}


@router.get("/tokens/detail")
def get_token_detail(
    request: Request,
    date_from: str = "",
    date_to: str = "",
    user_id: str = "",
    menu: str = "",
    page: int = 1,
    size: int = 50,
):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    if not date_from:
        date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = datetime.now().strftime("%Y-%m-%d")

    entries = _read_token_logs(date_from, date_to)

    if user_id:
        entries = [e for e in entries if e.get("user_id") == user_id]
    if menu:
        entries = [e for e in entries if e.get("menu") == menu]

    entries.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    total = len(entries)
    total_input = sum(e.get("input_tokens", 0) for e in entries)
    total_output = sum(e.get("output_tokens", 0) for e in entries)
    start = (page - 1) * size
    items = entries[start:start + size]

    return {
        "items": items,
        "total": total,
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "page": page,
        "total_pages": max(1, (total + size - 1) // size),
    }
