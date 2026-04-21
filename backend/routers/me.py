"""현재 로그인 사용자 전용 API (/api/me)"""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request

from .history import _read_token_logs

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recent-jobs")
def get_recent_jobs(request: Request, limit: int = 10):
    """현재 로그인 유저의 최근 완료 작업 N건 (토큰 로그 기준)"""
    user_id = request.cookies.get("AXI-USER-ID", "")
    if not user_id:
        raise HTTPException(401, "로그인이 필요합니다.")

    date_to = datetime.now().strftime("%Y-%m-%d")
    date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    try:
        entries = _read_token_logs(date_from, date_to)
    except Exception:
        logger.exception("recent-jobs 토큰 로그 읽기 실패")
        return []

    user_entries = [e for e in entries if e.get("user_id") == user_id]

    # job_id 기준 그루핑: 최신 timestamp를 대표값으로, page_count는 레코드 수
    jobs: dict[str, dict] = {}
    for e in user_entries:
        job_id = e.get("job_id", "")
        if not job_id:
            continue
        ts = e.get("timestamp", "")
        if job_id not in jobs:
            jobs[job_id] = {
                "job_id": job_id,
                "menu": e.get("menu", ""),
                "filename": e.get("filename", ""),
                "timestamp": ts,
                "page_count": 0,
            }
        jobs[job_id]["page_count"] += 1
        # 최신 timestamp로 갱신
        if ts > jobs[job_id]["timestamp"]:
            jobs[job_id]["timestamp"] = ts

    sorted_jobs = sorted(jobs.values(), key=lambda x: x["timestamp"], reverse=True)
    return sorted_jobs[:limit]


@router.get("/stats")
def get_my_stats(request: Request, month: str = ""):
    """현재 로그인 유저의 월별 KPI 통계"""
    user_id = request.cookies.get("AXI-USER-ID", "")
    if not user_id:
        raise HTTPException(401, "로그인이 필요합니다.")

    if not month:
        month = datetime.now().strftime("%Y-%m")

    try:
        first_day = datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(400, "month 형식은 YYYY-MM 이어야 합니다.")

    # 해당 월의 마지막 날 계산
    if first_day.month == 12:
        last_day = first_day.replace(day=31)
    else:
        last_day = first_day.replace(month=first_day.month + 1) - timedelta(days=1)

    date_from = first_day.strftime("%Y-%m-%d")
    date_to = last_day.strftime("%Y-%m-%d")

    empty = {"total_jobs": 0, "total_pages": 0, "top_menu": None, "top_menu_count": 0}

    try:
        entries = _read_token_logs(date_from, date_to)
    except Exception:
        logger.exception("stats 토큰 로그 읽기 실패")
        return empty

    user_entries = [e for e in entries if e.get("user_id") == user_id]
    if not user_entries:
        return empty

    # total_jobs: 고유 job_id 수
    total_jobs = len({e.get("job_id") for e in user_entries if e.get("job_id")})

    # total_pages: 레코드 수 (page=-1은 전체 처리 1건으로 카운트)
    total_pages = len(user_entries)

    # top_menu: 고유 job_id 수 기준, 동률이면 가장 최근 사용 기능 우선
    menu_jobs: dict[str, set] = {}
    menu_latest: dict[str, str] = {}
    for e in user_entries:
        menu = e.get("menu", "")
        job_id = e.get("job_id", "")
        ts = e.get("timestamp", "")
        if not menu or not job_id:
            continue
        if menu not in menu_jobs:
            menu_jobs[menu] = set()
            menu_latest[menu] = ""
        menu_jobs[menu].add(job_id)
        if ts > menu_latest[menu]:
            menu_latest[menu] = ts

    top_menu = None
    top_menu_count = 0
    if menu_jobs:
        top_menu = max(
            menu_jobs.keys(),
            key=lambda m: (len(menu_jobs[m]), menu_latest[m]),
        )
        top_menu_count = len(menu_jobs[top_menu])

    return {
        "total_jobs": total_jobs,
        "total_pages": total_pages,
        "top_menu": top_menu,
        "top_menu_count": top_menu_count,
    }
