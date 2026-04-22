"""사용 한도 관리 API"""

import os
import json
import threading
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .history import is_admin, _read_token_logs, _lookup_names

logger = logging.getLogger(__name__)
router = APIRouter()

LIMITS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "Log", "limits.json")
_LOCK = threading.RLock()

_DEFAULT: dict = {
    "default_limit": 500_000,
    "default_daily_limit": 50_000,
    "users": {},
}


# ── 파일 I/O ──────────────────────────────────────────────────────────────────

def _read_limits() -> dict:
    """limits.json 읽기. 없으면 기본값 반환 (파일 생성 X)."""
    if not os.path.exists(LIMITS_FILE):
        return {**_DEFAULT, "users": {}}
    try:
        with open(LIMITS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        data.setdefault("default_limit", _DEFAULT["default_limit"])
        data.setdefault("default_daily_limit", _DEFAULT["default_daily_limit"])
        data.setdefault("users", {})
        return data
    except Exception:
        logger.exception("limits.json 읽기 실패")
        return {**_DEFAULT, "users": {}}


def _write_limits(data: dict) -> None:
    os.makedirs(os.path.dirname(LIMITS_FILE), exist_ok=True)
    with open(LIMITS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _ensure_file() -> None:
    """서버 기동 시 limits.json 없으면 초기 생성."""
    if not os.path.exists(LIMITS_FILE):
        with _LOCK:
            if not os.path.exists(LIMITS_FILE):
                _write_limits({**_DEFAULT, "users": {}})


_ensure_file()


# ── 헬퍼 ──────────────────────────────────────────────────────────────────────

def _now_kst() -> str:
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst).isoformat(timespec="seconds")


def _decode_name(name: str) -> str:
    """URL 인코딩된 이름을 반복 디코드 (JS decodeURIComponent 대응)."""
    if not name:
        return ""
    from urllib.parse import unquote
    v = name
    for _ in range(5):
        d = unquote(v)
        if d == v:
            break
        v = d
    return v


def _compute_status(used: int, limit: int, manually_blocked: bool, auto_block: bool) -> str:
    if manually_blocked:
        return "blocked"
    if auto_block and limit > 0 and used >= limit:
        return "blocked"
    if limit > 0 and used >= limit * 0.9:
        return "near"
    return "ok"


# ── 한도 집행 ────────────────────────────────────────────────────────────────

def check_user_limit(user_id: str) -> str | None:
    """AI 작업 시작 전 한도 체크. 차단/초과 시 오류 메시지 반환, 정상 시 None."""
    if not user_id:
        return None

    now        = datetime.now()
    month_from = now.strftime("%Y-%m-01")
    month_to   = now.strftime("%Y-%m-%d")
    today_str  = now.strftime("%Y-%m-%d")

    with _LOCK:
        ldata = _read_limits()

    default_limit       = ldata["default_limit"]
    default_daily_limit = ldata["default_daily_limit"]
    cfg         = ldata["users"].get(user_id, {})
    limit       = cfg.get("limit", default_limit)
    daily_limit = cfg.get("daily_limit") or default_daily_limit
    auto_block  = cfg.get("auto_block", False)
    man_blocked = cfg.get("blocked", False)

    if man_blocked:
        return "관리자에 의해 차단된 계정입니다. 관리자에게 문의하세요."

    entries = _read_token_logs(month_from, month_to)
    monthly = 0
    today   = 0
    for e in entries:
        if e.get("user_id") != user_id:
            continue
        tokens  = e.get("input_tokens", 0) + e.get("output_tokens", 0)
        monthly += tokens
        if e.get("timestamp", "")[:10] == today_str:
            today += tokens

    if auto_block and limit > 0 and monthly >= limit:
        return f"이번 달 토큰 한도({monthly:,} / {limit:,})를 초과했습니다. 관리자에게 문의하세요."

    if daily_limit > 0 and today >= daily_limit:
        return f"오늘 사용 한도({today:,} / {daily_limit:,})를 초과했습니다. 내일 다시 이용해주세요."

    return None


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@router.get("/limits")
def get_limits(request: Request):
    """전체 사용자 한도 목록 (이번 달 토큰 사용량 포함)"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    now = datetime.now()
    month_from = now.strftime("%Y-%m-01")
    month_to   = now.strftime("%Y-%m-%d")
    today_str  = now.strftime("%Y-%m-%d")

    # 이번 달 토큰 로그
    entries = _read_token_logs(month_from, month_to)

    monthly_usage: dict[str, int] = {}
    today_usage:   dict[str, int] = {}
    user_names:    dict[str, str] = {}

    for e in entries:
        uid = e.get("user_id", "")
        if not uid:
            continue
        tokens = e.get("input_tokens", 0) + e.get("output_tokens", 0)
        monthly_usage[uid] = monthly_usage.get(uid, 0) + tokens
        if e.get("timestamp", "")[:10] == today_str:
            today_usage[uid] = today_usage.get(uid, 0) + tokens
        if uid not in user_names and e.get("user_name"):
            user_names[uid] = e["user_name"]

    with _LOCK:
        ldata = _read_limits()

    default_limit       = ldata["default_limit"]
    default_daily_limit = ldata["default_daily_limit"]
    users_cfg           = ldata["users"]

    all_uids = set(monthly_usage) | set(users_cfg)

    # 이름 조회 (토큰 로그에 없는 사용자)
    missing = [uid for uid in all_uids if uid not in user_names]
    if missing:
        user_names.update(_lookup_names(missing))

    result = []
    for uid in sorted(all_uids):
        cfg           = users_cfg.get(uid, {})
        limit         = cfg.get("limit", default_limit)
        daily_limit   = cfg.get("daily_limit") or default_daily_limit
        auto_block    = cfg.get("auto_block", False)
        man_blocked   = cfg.get("blocked", False)
        used          = monthly_usage.get(uid, 0)
        today         = today_usage.get(uid, 0)

        result.append({
            "id":          uid,
            "nm":          _decode_name(user_names.get(uid, "")),
            "dept":        cfg.get("dept", ""),
            "used":        used,
            "limit":       limit,
            "daily_limit": daily_limit,
            "today":       today,
            "status":      _compute_status(used, limit, man_blocked, auto_block),
            "auto_block":  auto_block,
            "updated_at":  cfg.get("updated_at"),
            "updated_by":  cfg.get("updated_by"),
        })

    return {
        "default_limit":       default_limit,
        "default_daily_limit": default_daily_limit,
        "users":               result,
    }


class LimitPatch(BaseModel):
    limit:       Optional[int]  = None
    daily_limit: Optional[int]  = None
    auto_block:  Optional[bool] = None


@router.patch("/limits/{user_id}")
def patch_limit(user_id: str, body: LimitPatch, request: Request):
    """사용자 한도 / 자동차단 부분 수정"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    if body.limit is not None and body.limit < 0:
        raise HTTPException(400, "limit은 0 이상이어야 합니다.")
    if body.daily_limit is not None and body.daily_limit < 0:
        raise HTTPException(400, "daily_limit은 0 이상이어야 합니다.")

    admin_id = request.cookies.get("AXI-USER-ID", "")

    with _LOCK:
        data = _read_limits()
        cfg  = data["users"].setdefault(user_id, {})

        if body.limit       is not None: cfg["limit"]       = body.limit
        if body.daily_limit is not None: cfg["daily_limit"] = body.daily_limit
        if body.auto_block  is not None: cfg["auto_block"]  = body.auto_block

        cfg["updated_at"] = _now_kst()
        cfg["updated_by"] = admin_id
        _write_limits(data)

    logger.info("limit patched: user=%s by=%s %s", user_id, admin_id, body.model_dump(exclude_none=True))
    return {"ok": True, "user_id": user_id}


@router.post("/limits/{user_id}/unblock")
def unblock_user(user_id: str, request: Request):
    """수동 차단 해제 (manually blocked → false)"""
    if not is_admin(request):
        raise HTTPException(403, "관리자만 접근할 수 있습니다.")

    admin_id = request.cookies.get("AXI-USER-ID", "")

    with _LOCK:
        data = _read_limits()
        cfg  = data["users"].setdefault(user_id, {})
        cfg["blocked"]    = False
        cfg["updated_at"] = _now_kst()
        cfg["updated_by"] = admin_id
        _write_limits(data)

    logger.info("user unblocked: user=%s by=%s", user_id, admin_id)
    return {"ok": True, "user_id": user_id}
