"""번역 라우터 — 외국어 PDF → 한국어 번역"""

import os
import asyncio
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.pdf import pdf_to_images
from services.vision import call_vision

logger = logging.getLogger(__name__)
router = APIRouter()

from routers.upload import get_job, _jobs

SYSTEM_PROMPT = """당신은 전문 번역가입니다.

## 규칙
1. 이미지의 모든 텍스트를 인식하고 한국어로 번역하세요.
2. 원본 문서의 구조(제목, 목록, 표 등)를 마크다운으로 유지하세요.
3. 전문 용어는 괄호 안에 원문을 병기하세요. 예: 콘크리트 양생(Curing)
4. 표가 있으면 마크다운 테이블로 번역하세요.
5. 숫자, 단위, 고유명사는 원문 그대로 유지하세요.
6. 자연스러운 한국어로 번역하되 원문의 의미를 왜곡하지 마세요."""


class TranslateRequest(BaseModel):
    job_id: str
    pages: List[int] = []
    source_lang: str = "auto"  # auto / en / ja / zh 등
    custom_prompt: Optional[str] = None


@router.post("/start")
def start_translate(req: TranslateRequest, background_tasks: BackgroundTasks):
    j = get_job(req.job_id)
    pages = req.pages if req.pages else list(range(1, j["page_count"] + 1))

    j["translate_status"] = "TRANSLATING"
    j["translate_steps"] = [{"page": p, "status": "pending", "detail": ""} for p in pages]
    j["translate_progress"] = 0
    j["translate_pages"] = {}
    j["translate_error"] = None

    background_tasks.add_task(_run_translate, req.job_id, pages, req.source_lang, req.custom_prompt)
    return {"status": "started", "pages": pages}


def _run_translate(job_id: str, pages: list[int], source_lang: str, custom_prompt: str | None):
    j = _jobs.get(job_id)
    if not j:
        return

    try:
        pdf_path = j["pdf_path"]
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        translate_pages = {}
        for idx, page_num in enumerate(pages):
            j["translate_steps"][idx]["status"] = "running"
            j["translate_progress"] = int((idx / len(pages)) * 100)

            try:
                images = pdf_to_images(pdf_bytes, dpi=200, pages=[page_num - 1])
                if not images:
                    j["translate_steps"][idx]["status"] = "error"
                    j["translate_steps"][idx]["detail"] = "이미지 변환 실패"
                    continue

                lang_hint = "" if source_lang == "auto" else f" (원문 언어: {source_lang})"
                user_msg = f"이 페이지의 모든 내용을 한국어로 번역해주세요.{lang_hint} 원본 구조를 유지하면서 마크다운으로 작성하세요."
                if custom_prompt:
                    user_msg += f"\n\n추가 지시: {custom_prompt}"

                result = call_vision(images[0], SYSTEM_PROMPT, user_msg)
                translate_pages[str(page_num)] = result

                j["translate_steps"][idx]["status"] = "done"
                j["translate_steps"][idx]["detail"] = f"{len(result)}자"

            except Exception as e:
                logger.exception("번역 오류 (page %d)", page_num)
                j["translate_steps"][idx]["status"] = "error"
                j["translate_steps"][idx]["detail"] = str(e)[:80]

        j["translate_pages"] = translate_pages
        j["translate_status"] = "DONE"
        j["translate_progress"] = 100

    except Exception as e:
        logger.exception("번역 실패 (job_id=%s)", job_id)
        j["translate_status"] = "FAILED"
        j["translate_error"] = str(e)[:200]


@router.get("/stream/{job_id}")
async def stream_translate(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")

    async def event_gen():
        while True:
            j = _jobs.get(job_id)
            if not j:
                break
            data = {
                "status": j.get("translate_status", "UNKNOWN"),
                "progress": j.get("translate_progress", 0),
                "steps": j.get("translate_steps", []),
            }
            if j.get("translate_status") == "DONE":
                data["translate_pages"] = j.get("translate_pages", {})
            if j.get("translate_status") == "FAILED":
                data["error"] = j.get("translate_error")
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            if j.get("translate_status") in ("DONE", "FAILED"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/result/{job_id}")
def get_translate_result(job_id: str):
    j = get_job(job_id)
    return {
        "status": j.get("translate_status", "UNKNOWN"),
        "translate_pages": j.get("translate_pages", {}),
        "steps": j.get("translate_steps", []),
        "progress": j.get("translate_progress", 0),
        "error": j.get("translate_error"),
    }
