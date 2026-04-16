"""이력 관리 + 관리자 라우터"""

import os
import json
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request

from utils.db import execute_query, execute_command

logger = logging.getLogger(__name__)
router = APIRouter()

# 관리자 목록 파일
ADMIN_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "admins.json")
USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "users.json")

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


def _get_users() -> list[str]:
    return _load_json_list(USERS_FILE)


def is_admin(request: Request) -> bool:
    user_id = request.cookies.get("AXI-USER-ID", "")
    return user_id in _get_admins()


def is_allowed_user(request: Request) -> bool:
    user_id = request.cookies.get("AXI-USER-ID", "")
    admins = _get_admins()
    users = _get_users()
    return user_id in admins or user_id in users


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
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(VISITOR_LOG_DIR, f"actions_{today}.json")

    actions = _load_json_list(log_file) if os.path.exists(log_file) else []
    actions.append({
        "user_id": user_id,
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
        "is_allowed": is_allowed_user(request),
        "is_admin": is_admin(request),
        "user_id": request.cookies.get("AXI-USER-ID", ""),
        "user_name": request.cookies.get("AXI-USER-NAME", ""),
    }


@router.get("/history")
def get_history(
    request: Request,
    date_from: str = "",
    date_to: str = "",
    user_id: str = "",
    action_type: str = "",
    page: int = 1,
    size: int = 50,
):
    """이력 조회 (관리자 전용)"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    if not date_from:
        date_from = datetime.now().strftime("%Y-%m-%d")
    if not date_to:
        date_to = date_from

    # 액션 로그 파일에서 읽기
    from datetime import timedelta
    all_actions = []
    current = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(date_to, "%Y-%m-%d")

    while current <= end:
        day_str = current.strftime("%Y-%m-%d")
        log_file = os.path.join(VISITOR_LOG_DIR, f"actions_{day_str}.json")
        if os.path.exists(log_file):
            day_actions = _load_json_list(log_file)
            all_actions.extend(day_actions)
        current += timedelta(days=1)

    # 필터링
    if user_id:
        all_actions = [a for a in all_actions if a.get("user_id") == user_id]
    if action_type:
        all_actions = [a for a in all_actions if a.get("action") == action_type]

    # 최신순 정렬
    all_actions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    # 페이징
    total = len(all_actions)
    start = (page - 1) * size
    items = all_actions[start:start + size]

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "total_pages": (total + size - 1) // size,
    }


@router.get("/visitors")
def get_visitors(request: Request, date: str = ""):
    """방문자 통계 (관리자 전용)"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    log_file = os.path.join(VISITOR_LOG_DIR, f"{date}.json")
    visitors = _load_json_list(log_file) if os.path.exists(log_file) else []

    unique_users = list(set(v.get("user_id") for v in visitors if v.get("user_id")))
    return {
        "date": date,
        "total_visits": len(visitors),
        "unique_users": len(unique_users),
        "users": unique_users,
    }


# ── 사용자/관리자 관리 ──

@router.get("/users")
def get_user_list(request: Request):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")
    return {"admins": _get_admins(), "users": _get_users()}


@router.post("/users/add")
async def add_user(request: Request):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")
    body = await request.json()
    uid = body.get("user_id", "").strip()
    role = body.get("role", "user")
    if not uid:
        raise HTTPException(400, "user_id 필요")

    if role == "admin":
        admins = _get_admins()
        if uid not in admins:
            admins.append(uid)
            _save_json_list(ADMIN_FILE, admins)
    else:
        users = _get_users()
        if uid not in users:
            users.append(uid)
            _save_json_list(USERS_FILE, users)
    return {"ok": True}


@router.post("/users/remove")
async def remove_user(request: Request):
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")
    body = await request.json()
    uid = body.get("user_id", "").strip()

    admins = _get_admins()
    users = _get_users()
    if uid in admins:
        admins.remove(uid)
        _save_json_list(ADMIN_FILE, admins)
    if uid in users:
        users.remove(uid)
        _save_json_list(USERS_FILE, users)
    return {"ok": True}
