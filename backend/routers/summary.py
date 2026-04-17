"""문서 요약 라우터"""

import os
import asyncio
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.pdf import pdf_to_images
from services.vision import call_vision, call_vision_multi
from utils.token_logger import log_tokens

logger = logging.getLogger(__name__)
router = APIRouter()

from routers.upload import get_job, _jobs

SYSTEM_PROMPT = """당신은 문서 요약 전문가입니다.

## 규칙
1. 문서의 핵심 내용을 정확하게 요약하세요.
2. 마크다운 형식으로 구조화하세요:
   - 문서 제목/유형
   - 핵심 요약 (3~5 문장)
   - 주요 항목별 세부 내용
   - 중요 수치/날짜/조건 등
3. 원문의 의미를 왜곡하지 마세요.
4. 한국어로 작성하세요."""


class SummaryRequest(BaseModel):
    job_id: str
    pages: List[int] = []
    length: str = "medium"
    custom_prompt: Optional[str] = None


@router.post("/start")
def start_summary(req: SummaryRequest, background_tasks: BackgroundTasks, request: Request):
    j = get_job(req.job_id)
    pages = req.pages if req.pages else list(range(1, j["page_count"] + 1))
    user_id = request.cookies.get("AXI-USER-ID", "")
    user_name = request.cookies.get("AXI-USER-NAME", "")
    filename = j.get("filename", "")

    from routers.history import log_action
    log_action("요약", "start", f"{filename}, {len(pages)}페이지, {req.length}", request)

    j["summary_status"] = "PROCESSING"
    j["summary_progress"] = 0
    j["summary_result"] = None
    j["summary_error"] = None

    background_tasks.add_task(_run_summary, req.job_id, pages, req.length, req.custom_prompt, user_id, user_name)
    return {"status": "started", "pages": pages}


def _run_summary(job_id: str, pages: list[int], length: str, custom_prompt: str | None, user_id: str = "", user_name: str = ""):
    j = _jobs.get(job_id)
    if not j:
        return

    filename = j.get("filename", "")

    try:
        pdf_path = j["pdf_path"]
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        all_images = []
        for page_num in pages:
            images = pdf_to_images(pdf_bytes, dpi=150, pages=[page_num - 1])
            if images:
                all_images.append(images[0])
            j["summary_progress"] = int((len(all_images) / len(pages)) * 50)

        length_instruction = {
            "short": "3~5문장의 간단한 요약",
            "medium": "A4 반 페이지 분량의 요약",
            "detailed": "A4 1~2페이지 분량의 상세 요약",
        }.get(length, "A4 반 페이지 분량의 요약")

        user_msg = f"이 문서를 {length_instruction}으로 요약해주세요."
        if custom_prompt:
            user_msg += f"\n\n추가 지시: {custom_prompt}"

        j["summary_progress"] = 60

        MAX_IMAGES_PER_CALL = 10
        partial_summaries = []
        total_input = 0
        total_output = 0

        for i in range(0, len(all_images), MAX_IMAGES_PER_CALL):
            batch = all_images[i:i + MAX_IMAGES_PER_CALL]
            token_ctx: dict = {}
            if len(all_images) <= MAX_IMAGES_PER_CALL:
                result = call_vision_multi(batch, SYSTEM_PROMPT, user_msg, token_ctx=token_ctx)
            else:
                batch_msg = f"이 문서의 {i+1}~{i+len(batch)} 페이지 내용을 요약해주세요."
                result = call_vision_multi(batch, SYSTEM_PROMPT, batch_msg, token_ctx=token_ctx)
            partial_summaries.append(result)
            total_input += token_ctx.get("input_tokens", 0)
            total_output += token_ctx.get("output_tokens", 0)
            j["summary_progress"] = 60 + int((i / len(all_images)) * 30)

        if len(partial_summaries) > 1:
            combined = "\n\n---\n\n".join(partial_summaries)
            from openai import AzureOpenAI
            client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_VISION_API_KEY", ""),
                api_version=os.getenv("AZURE_OPENAI_VISION_API_VERSION", "2024-12-01-preview"),
                azure_endpoint=os.getenv("AZURE_OPENAI_VISION_ENDPOINT", ""),
            )
            model = os.getenv("AZURE_OPENAI_VISION_DEPLOYMENT_NAME", "")
            merge_resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "아래 부분 요약들을 하나의 통합 요약으로 정리해주세요. 마크다운 형식으로 작성하세요."},
                    {"role": "user", "content": f"{length_instruction}으로 통합해주세요:\n\n{combined}"},
                ],
                max_completion_tokens=8192,
                temperature=0,
            )
            final_summary = merge_resp.choices[0].message.content.strip()
            if merge_resp.usage:
                total_input += merge_resp.usage.prompt_tokens
                total_output += merge_resp.usage.completion_tokens
        else:
            final_summary = partial_summaries[0] if partial_summaries else "요약 결과 없음"

        log_tokens(user_id, job_id, "요약", filename, -1, total_input, total_output, user_name)

        j["summary_result"] = final_summary
        j["summary_status"] = "DONE"
        j["summary_progress"] = 100

    except Exception as e:
        logger.exception("요약 실패 (job_id=%s)", job_id)
        j["summary_status"] = "FAILED"
        j["summary_error"] = str(e)[:200]


@router.get("/stream/{job_id}")
async def stream_summary(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")

    async def event_gen():
        while True:
            j = _jobs.get(job_id)
            if not j:
                break
            data = {
                "status": j.get("summary_status", "UNKNOWN"),
                "progress": j.get("summary_progress", 0),
            }
            if j.get("summary_status") == "DONE":
                data["result"] = j.get("summary_result")
            if j.get("summary_status") == "FAILED":
                data["error"] = j.get("summary_error")
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            if j.get("summary_status") in ("DONE", "FAILED"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
