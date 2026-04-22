"""PDF 업로드 → 페이지별 이미지 변환"""

import os
import re
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
        # 디스크에서 복구 시도
        job_json = os.path.join(TMP_DIR, job_id, "job.json")
        if os.path.exists(job_json):
            try:
                with open(job_json, "r", encoding="utf-8") as f:
                    j = json.load(f)
                _jobs[job_id] = j
            except Exception:
                pass
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

    # fileItem이 있으면 DFS 우선 (DRM 복호화 완료 파일)
    if fi_json:
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

    # fileItem 없으면 직접 업로드 파일 사용 (일반 PDF)
    if not pdf_bytes and file:
        pdf_bytes = await file.read()
        filename = getattr(file, "filename", filename)

    if not pdf_bytes:
        raise HTTPException(400, "파일이 없습니다.")

    # Job 생성
    job_id = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + os.urandom(3).hex()
    job_dir = os.path.join(TMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    # 경로 조작 방지: 파일명에서 디렉토리 구성 요소 및 위험 문자 제거
    filename = os.path.basename(filename)
    filename = re.sub(r'[^\w\-_\. ]', '_', filename)
    if not filename or filename.startswith('.'):
        filename = "upload.pdf"

    # PDF 저장
    pdf_path = os.path.join(job_dir, filename)
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    try:
        page_count = pdf_page_count(pdf_bytes)
    except Exception:
        raise HTTPException(400, "유효한 PDF 파일이 아닙니다. DRM 암호화 파일은 AiDoc에 로그인 후 업로드해 주세요.")

    # 썸네일 생성
    thumbs = pdf_thumbnails(pdf_bytes, dpi=72)
    thumb_b64 = [base64.b64encode(t).decode() for t in thumbs]

    job_data = {
        "job_id": job_id,
        "status": "UPLOADED",
        "filename": filename,
        "page_count": page_count,
        "pdf_path": pdf_path,
        "job_dir": job_dir,
        "created_at": datetime.now().isoformat(),
    }
    set_job(job_id, job_data)

    # Job 메타데이터를 디스크에 저장 (세션 유지용)
    try:
        job_json = os.path.join(job_dir, "job.json")
        with open(job_json, "w", encoding="utf-8") as f:
            json.dump(job_data, f, ensure_ascii=False, indent=2)
    except Exception:
        logger.exception("job.json 저장 실패")

    log_file_action(job_dir, filename, "upload", size=len(pdf_bytes), request=request)

    return {
        "job_id": job_id,
        "filename": filename,
        "page_count": page_count,
        "thumbnails": thumb_b64,
    }


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, with_thumbnails: bool = False):
    j = get_job(job_id)
    result = {
        "status": j["status"],
        "filename": j.get("filename"),
        "page_count": j.get("page_count"),
    }
    if with_thumbnails:
        pdf_path = j.get("pdf_path", "")
        if pdf_path and os.path.exists(pdf_path):
            try:
                with open(pdf_path, "rb") as f:
                    pdf_bytes = f.read()
                thumbs = pdf_thumbnails(pdf_bytes, dpi=72)
                result["thumbnails"] = [base64.b64encode(t).decode() for t in thumbs]
            except Exception:
                logger.exception("썸네일 재생성 실패")
                result["thumbnails"] = []
        else:
            result["thumbnails"] = []
    return result
