"""파일 작업 로깅"""

import os
import json
import logging
from datetime import datetime
from fastapi import Request

logger = logging.getLogger(__name__)

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Log")
os.makedirs(LOG_DIR, exist_ok=True)


def log_file_action(
    directory: str,
    filename: str,
    action: str,
    size: int = 0,
    request: Request = None,
):
    """파일 업로드/다운로드 로그 기록"""
    user_id = ""
    if request:
        user_id = request.cookies.get("AXI-USER-ID", "")

    entry = {
        "timestamp": datetime.now().isoformat(),
        "user_id": user_id,
        "action": action,
        "directory": directory,
        "filename": filename,
        "size": size,
    }

    log_file = os.path.join(LOG_DIR, f"file_{datetime.now().strftime('%Y-%m-%d')}.log")
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        logger.exception("파일 로그 기록 실패")
