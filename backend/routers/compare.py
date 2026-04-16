"""PDF 비교 라우터 — 두 PDF의 변경점 분석"""

import os
import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.pdf import pdf_to_images
from services.vision import call_vision_multi

logger = logging.getLogger(__name__)
router = APIRouter()

from routers.upload import _jobs

SYSTEM_PROMPT = """당신은 두 문서를 비교하여 변경점을 분석하는 전문가입니다.

## 규칙
1. 두 이미지(왼쪽=원본, 오른쪽=수정본)를 비교하세요.
2. 변경된 내용을 다음 카테고리로 분류하세요:
   - **추가**: 수정본에만 있는 내용
   - **삭제**: 원본에만 있는 내용
   - **수정**: 내용이 변경된 부분 (원문 → 변경문)
3. 마크다운으로 구조화하세요.
4. 변경이 없으면 "변경 없음"이라고 표시하세요.

## 출력 형식
### 변경 요약
- 전체 N건의 변경 감지

### 상세 변경 내역
#### 추가
- [내용]

#### 삭제
- ~~[내용]~~

#### 수정
- **원문**: [원본 내용] → **변경**: [수정 내용]"""


class CompareRequest(BaseModel):
    job_id_a: str  # 원본 PDF job_id
    job_id_b: str  # 수정본 PDF job_id
    pages: Optional[list[int]] = None  # 비교할 페이지 (1-based)
    custom_prompt: Optional[str] = None


_compare_jobs: dict = {}


@router.post("/start")
def start_compare(req: CompareRequest, background_tasks: BackgroundTasks):
    ja = _jobs.get(req.job_id_a)
    jb = _jobs.get(req.job_id_b)
    if not ja or not jb:
        raise HTTPException(404, "원본 또는 수정본 PDF를 찾을 수 없습니다.")

    max_pages = min(ja["page_count"], jb["page_count"])
    pages = req.pages if req.pages else list(range(1, max_pages + 1))

    compare_id = f"cmp_{req.job_id_a}_{req.job_id_b}"
    _compare_jobs[compare_id] = {
        "status": "COMPARING",
        "progress": 0,
        "results": [],
        "error": None,
    }

    background_tasks.add_task(_run_compare, compare_id, ja, jb, pages, req.custom_prompt)
    return {"compare_id": compare_id, "pages": pages}


def _run_compare(compare_id: str, ja: dict, jb: dict, pages: list[int], custom_prompt: str | None):
    cj = _compare_jobs[compare_id]

    try:
        with open(ja["pdf_path"], "rb") as f:
            pdf_a = f.read()
        with open(jb["pdf_path"], "rb") as f:
            pdf_b = f.read()

        results = []
        for idx, page_num in enumerate(pages):
            cj["progress"] = int((idx / len(pages)) * 100)

            try:
                img_a = pdf_to_images(pdf_a, dpi=200, pages=[page_num - 1])
                img_b = pdf_to_images(pdf_b, dpi=200, pages=[page_num - 1])

                if not img_a or not img_b:
                    results.append({"page": page_num, "status": "error", "detail": "이미지 변환 실패"})
                    continue

                user_msg = f"페이지 {page_num}: 첫 번째 이미지(원본)와 두 번째 이미지(수정본)를 비교해주세요."
                if custom_prompt:
                    user_msg += f"\n\n추가 지시: {custom_prompt}"

                result = call_vision_multi([img_a[0], img_b[0]], SYSTEM_PROMPT, user_msg)
                results.append({"page": page_num, "status": "done", "diff": result})

            except Exception as e:
                logger.exception("비교 오류 (page %d)", page_num)
                results.append({"page": page_num, "status": "error", "detail": str(e)[:80]})

        cj["results"] = results
        cj["status"] = "DONE"
        cj["progress"] = 100

    except Exception as e:
        logger.exception("비교 실패 (compare_id=%s)", compare_id)
        cj["status"] = "FAILED"
        cj["error"] = str(e)[:200]


@router.get("/stream/{compare_id}")
async def stream_compare(compare_id: str):
    if compare_id not in _compare_jobs:
        raise HTTPException(404, "Compare job not found")

    async def event_gen():
        while True:
            cj = _compare_jobs.get(compare_id)
            if not cj:
                break
            data = {"status": cj["status"], "progress": cj["progress"]}
            if cj["status"] == "DONE":
                data["results"] = cj["results"]
            if cj["status"] == "FAILED":
                data["error"] = cj["error"]
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            if cj["status"] in ("DONE", "FAILED"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/result/{compare_id}")
def get_compare_result(compare_id: str):
    cj = _compare_jobs.get(compare_id)
    if not cj:
        raise HTTPException(404, "Compare job not found")
    return cj
