"""PDF 업로드 → 페이지별 이미지 변환"""

import os
import json
import base64
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from services.pdf import pdf_to_images, pdf_page_count, pdf_thumbnails
from utils.file_logger import log_file_action

logger = logging.getLogger(__name__)
router = APIRouter()

TMP_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Input", "pdf_tmp")
os.makedirs(TMP_DIR, exist_ok=True)

# 인메모리 Job 저장소
_jobs: dict = {}


def get_job(job_id: str) -> dict:
    j = _jobs.get(job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    return j


def set_job(job_id: str, data: dict):
    _jobs[job_id] = data


@router.post("/upload")
async def upload_pdf(request: Request):
    """PDF 업로드 (직접 업로드 또는 DRM 복호화 파일)"""
    form = await request.form()
    file = form.get("file")
    fi_json = form.get("fileItem")

    pdf_bytes = None
    filename = "upload.pdf"

    # 직접 업로드 파일 우선 (DRM 암호화 우회)
    if file:
        pdf_bytes = await file.read()
        filename = getattr(file, "filename", filename)

    # 직접 업로드 없을 때만 DFS에서 읽기
    if not pdf_bytes and fi_json:
        from utils.dfs import read_file as dfs_read_file, mark_as_failed
        full_path = ""
        try:
            fi = json.loads(fi_json) if isinstance(fi_json, str) else fi_json
            full_path = fi.get("fullPath", "")
            pdf_bytes = dfs_read_file(full_path)
            filename = fi.get("fileName", filename)
        except HTTPException:
            if full_path:
                try: mark_as_failed(full_path)
                except Exception: pass
            raise
        except Exception:
            logger.exception("DFS 파일 읽기 실패")
            if full_path:
                try: mark_as_failed(full_path)
                except Exception: pass
            raise HTTPException(400, "DFS 파일을 읽을 수 없습니다.")

    if not pdf_bytes:
        raise HTTPException(400, "파일이 없습니다.")

    # Job 생성
    job_id = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + os.urandom(3).hex()
    job_dir = os.path.join(TMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    # PDF 저장
    pdf_path = os.path.join(job_dir, filename)
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    logger.info("pdf_bytes 크기: %d, 앞 4바이트: %s", len(pdf_bytes), pdf_bytes[:4])
    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(400, f"유효한 PDF 파일이 아닙니다. 앞 4바이트: {pdf_bytes[:4]}")
    page_count = pdf_page_count(pdf_bytes)

    # 썸네일 생성
    thumbs = pdf_thumbnails(pdf_bytes, dpi=72)
    thumb_b64 = [base64.b64encode(t).decode() for t in thumbs]

    set_job(job_id, {
        "status": "UPLOADED",
        "filename": filename,
        "page_count": page_count,
        "job_dir": job_dir,
        "pdf_path": pdf_path,
    })

    log_file_action(job_dir, filename, "upload", size=len(pdf_bytes), request=request)

    return {
        "job_id": job_id,
        "filename": filename,
        "page_count": page_count,
        "thumbnails": thumb_b64,
    }


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    j = get_job(job_id)
    return {
        "status": j["status"],
        "filename": j.get("filename"),
        "page_count": j.get("page_count"),
    }
