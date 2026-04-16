"""엑셀/워드 Export 라우터"""

import os
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.excel import tables_to_excel
from services.docx_builder import markdown_to_docx
from utils.dfs import write_file, DOWNLOAD_DIR
from utils.file_logger import log_file_action

logger = logging.getLogger(__name__)
router = APIRouter()

from routers.upload import get_job


class ExcelExportRequest(BaseModel):
    job_id: str
    tables: Optional[List] = None  # 편집된 테이블 (없으면 원본 사용)


class DocxExportRequest(BaseModel):
    job_id: str
    content: Optional[str] = None  # 편집된 마크다운 (없으면 원본 사용)
    title: str = ""


@router.post("/excel")
def export_excel(req: ExcelExportRequest, request: Request = None):
    """테이블 → 엑셀 → DFS 저장 → fileItem 반환"""
    tables = req.tables
    if not tables:
        j = get_job(req.job_id)
        tables = j.get("tables", [])
    if not tables:
        raise HTTPException(400, "추출된 표 데이터가 없습니다.")

    excel_bytes = tables_to_excel(tables)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"PDF_표추출_{timestamp}.xlsx"

    rel_path = f"{DOWNLOAD_DIR}/{filename}"
    write_file(rel_path, excel_bytes)
    file_size = len(excel_bytes)

    if request:
        log_file_action(DOWNLOAD_DIR, filename, "download", size=file_size, request=request)

    return {"fileItem": {
        "fileName": filename,
        "realFileName": filename,
        "fullPath": rel_path,
        "fileSize": file_size,
    }}


@router.post("/docx")
def export_docx(req: DocxExportRequest, request: Request = None):
    """마크다운 → 워드 → DFS 저장 → fileItem 반환"""
    content = req.content
    if not content:
        j = get_job(req.job_id)
        # 내용 추출 결과를 합치기
        pages = j.get("content_pages", {})
        if not pages:
            # 번역 결과
            pages = j.get("translate_pages", {})
        if not pages:
            # 요약 결과
            summary = j.get("summary_result", "")
            if summary:
                content = summary
        if not content and pages:
            sorted_keys = sorted(pages.keys(), key=lambda x: int(x))
            content = "\n\n---\n\n".join(f"## 페이지 {k}\n\n{pages[k]}" for k in sorted_keys)

    if not content:
        raise HTTPException(400, "추출된 내용이 없습니다.")

    docx_bytes = markdown_to_docx(content, title=req.title)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"PDF_내용추출_{timestamp}.docx"

    rel_path = f"{DOWNLOAD_DIR}/{filename}"
    write_file(rel_path, docx_bytes)
    file_size = len(docx_bytes)

    if request:
        log_file_action(DOWNLOAD_DIR, filename, "download", size=file_size, request=request)

    return {"fileItem": {
        "fileName": filename,
        "realFileName": filename,
        "fullPath": rel_path,
        "fileSize": file_size,
    }}
