"""내용 추출 라우터 — PDF 이미지에서 텍스트를 원본 구조 그대로 추출"""

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

SYSTEM_PROMPT = """당신은 PDF 이미지에서 텍스트를 정확하게 추출하는 전문 OCR 시스템입니다.

## 규칙
1. 이미지의 **모든 텍스트**를 빠짐없이 추출하세요.
2. 원본 문서의 구조를 **마크다운 형식**으로 정확히 재현하세요:
   - 제목 → # / ## / ###
   - 목록 → - 또는 1. 2. 3.
   - 표 → 마크다운 테이블 (| 열1 | 열2 |)
   - 강조 → **볼드**, *이탤릭*
   - 들여쓰기, 단락 구분을 유지하세요
3. 이미지, 그림, 차트는 [이미지: 설명] 형태로 위치와 내용을 표시하세요.
4. 머리글/바닥글(페이지 번호 등)은 제외하세요.
5. 원문 그대로 추출하세요. 요약하거나 생략하지 마세요."""


class ContentExtractRequest(BaseModel):
    job_id: str
    pages: List[int] = []
    custom_prompt: Optional[str] = None


@router.post("/start")
def start_content_extract(req: ContentExtractRequest, background_tasks: BackgroundTasks):
    j = get_job(req.job_id)
    pages = req.pages if req.pages else list(range(1, j["page_count"] + 1))

    j["content_status"] = "EXTRACTING"
    j["content_steps"] = [{"page": p, "status": "pending", "detail": ""} for p in pages]
    j["content_progress"] = 0
    j["content_pages"] = {}
    j["content_error"] = None

    background_tasks.add_task(_run_content_extract, req.job_id, pages, req.custom_prompt)
    return {"status": "started", "pages": pages}


def _run_content_extract(job_id: str, pages: list[int], custom_prompt: str | None):
    j = _jobs.get(job_id)
    if not j:
        return

    try:
        pdf_path = j["pdf_path"]
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        content_pages = {}
        for idx, page_num in enumerate(pages):
            j["content_steps"][idx]["status"] = "running"
            j["content_progress"] = int((idx / len(pages)) * 100)

            try:
                images = pdf_to_images(pdf_bytes, dpi=200, pages=[page_num - 1])
                if not images:
                    j["content_steps"][idx]["status"] = "error"
                    j["content_steps"][idx]["detail"] = "이미지 변환 실패"
                    continue

                user_msg = "이 PDF 페이지의 모든 내용을 원본 구조 그대로 마크다운으로 추출해주세요."
                if custom_prompt:
                    user_msg += f"\n\n추가 지시: {custom_prompt}"

                result = call_vision(images[0], SYSTEM_PROMPT, user_msg)
                content_pages[str(page_num)] = result

                j["content_steps"][idx]["status"] = "done"
                j["content_steps"][idx]["detail"] = f"{len(result)}자"

            except Exception as e:
                logger.exception("내용 추출 오류 (page %d)", page_num)
                j["content_steps"][idx]["status"] = "error"
                j["content_steps"][idx]["detail"] = str(e)[:80]

        j["content_pages"] = content_pages
        j["content_status"] = "DONE"
        j["content_progress"] = 100

    except Exception as e:
        logger.exception("내용 추출 실패 (job_id=%s)", job_id)
        j["content_status"] = "FAILED"
        j["content_error"] = str(e)[:200]


@router.get("/stream/{job_id}")
async def stream_content_extract(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")

    async def event_gen():
        while True:
            j = _jobs.get(job_id)
            if not j:
                break
            data = {
                "status": j.get("content_status", "UNKNOWN"),
                "progress": j.get("content_progress", 0),
                "steps": j.get("content_steps", []),
            }
            if j.get("content_status") == "DONE":
                data["content_pages"] = j.get("content_pages", {})
            if j.get("content_status") == "FAILED":
                data["error"] = j.get("content_error")
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            if j.get("content_status") in ("DONE", "FAILED"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/result/{job_id}")
def get_content_result(job_id: str):
    j = get_job(job_id)
    return {
        "status": j.get("content_status", "UNKNOWN"),
        "content_pages": j.get("content_pages", {}),
        "steps": j.get("content_steps", []),
        "progress": j.get("content_progress", 0),
        "error": j.get("content_error"),
    }
