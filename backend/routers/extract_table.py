"""표 추출 라우터 — PDF 이미지에서 표를 JSON으로 추출"""

import os
import asyncio
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.pdf import pdf_to_images
from services.vision import call_vision, parse_tables_json

logger = logging.getLogger(__name__)
router = APIRouter()

# upload 라우터의 Job 저장소 참조
from routers.upload import get_job, set_job, _jobs

SYSTEM_PROMPT = """당신은 PDF 이미지에서 표 데이터를 정확하게 추출하는 전문 OCR 시스템입니다.

## 규칙
1. 이미지에 있는 **모든 표**를 빠짐없이 추출하세요.
2. title에는 표의 제목이나 품목 이름을 넣으세요.
3. 병합된 셀은 해당 값을 반복해서 채워주세요. 빈 셀은 빈 문자열 ""로 처리하세요.
4. 숫자에서 쉼표(,)는 제거하지 말고 그대로 유지하세요.
5. 표가 아닌 일반 텍스트, 광고, 각주 등은 무시하세요.
6. **반드시 아래 JSON 형식만 출력하세요. 설명, 마크다운, 코드블록 없이 순수 JSON만 출력하세요.**

## 출력 형식
{
  "tables": [
    {
      "title": "표 제목",
      "headers": ["열1", "열2", "열3"],
      "rows": [
        ["값1", "값2", "값3"],
        ["값4", "값5", "값6"]
      ]
    }
  ]
}"""


class ExtractRequest(BaseModel):
    job_id: str
    pages: List[int] = []       # 1-based, 빈 리스트면 전체
    custom_prompt: Optional[str] = None  # 커스텀 지시


@router.post("/start")
def start_extract(req: ExtractRequest, background_tasks: BackgroundTasks):
    j = get_job(req.job_id)
    pages = req.pages if req.pages else list(range(1, j["page_count"] + 1))

    j["table_status"] = "EXTRACTING"
    j["table_steps"] = [{"page": p, "status": "pending", "detail": ""} for p in pages]
    j["table_progress"] = 0
    j["tables"] = []
    j["table_error"] = None

    background_tasks.add_task(_run_extract, req.job_id, pages, req.custom_prompt)
    return {"status": "started", "pages": pages}


def _run_extract(job_id: str, pages: list[int], custom_prompt: str | None):
    j = _jobs.get(job_id)
    if not j:
        return

    try:
        pdf_path = j["pdf_path"]
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        all_tables = []
        for idx, page_num in enumerate(pages):
            j["table_steps"][idx]["status"] = "running"
            j["table_progress"] = int((idx / len(pages)) * 100)

            try:
                images = pdf_to_images(pdf_bytes, dpi=200, pages=[page_num - 1])
                if not images:
                    j["table_steps"][idx]["status"] = "error"
                    j["table_steps"][idx]["detail"] = "이미지 변환 실패"
                    continue

                user_msg = "이 이미지에서 모든 표를 찾아 JSON으로 추출해주세요. 설명 없이 JSON만 출력하세요."
                if custom_prompt:
                    user_msg += f"\n\n추가 지시: {custom_prompt}"

                content = call_vision(images[0], SYSTEM_PROMPT, user_msg)
                tables = parse_tables_json(content)
                for t in tables:
                    t["page"] = page_num
                all_tables.extend(tables)

                j["table_steps"][idx]["status"] = "done"
                j["table_steps"][idx]["detail"] = f"{len(tables)}개 표"

            except Exception as e:
                logger.exception("표 추출 오류 (page %d)", page_num)
                j["table_steps"][idx]["status"] = "error"
                j["table_steps"][idx]["detail"] = str(e)[:80]

        j["tables"] = all_tables
        j["table_status"] = "DONE"
        j["table_progress"] = 100

    except Exception as e:
        logger.exception("표 추출 실패 (job_id=%s)", job_id)
        j["table_status"] = "FAILED"
        j["table_error"] = str(e)[:200]


@router.get("/stream/{job_id}")
async def stream_table_extract(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")

    async def event_gen():
        while True:
            j = _jobs.get(job_id)
            if not j:
                break
            data = {
                "status": j.get("table_status", "UNKNOWN"),
                "progress": j.get("table_progress", 0),
                "steps": j.get("table_steps", []),
            }
            if j.get("table_status") == "DONE":
                data["tables"] = j.get("tables", [])
            if j.get("table_status") == "FAILED":
                data["error"] = j.get("table_error")
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            if j.get("table_status") in ("DONE", "FAILED"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/result/{job_id}")
def get_table_result(job_id: str):
    j = get_job(job_id)
    return {
        "status": j.get("table_status", "UNKNOWN"),
        "tables": j.get("tables", []),
        "steps": j.get("table_steps", []),
        "progress": j.get("table_progress", 0),
        "error": j.get("table_error"),
    }
