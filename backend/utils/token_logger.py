"""토큰 사용량 로그"""
import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Log")
os.makedirs(LOG_DIR, exist_ok=True)


def log_tokens(user_id: str, job_id: str, menu: str, filename: str, page: int,
               input_tokens: int, output_tokens: int, user_name: str = ""):
    entry = {
        "timestamp": datetime.now().isoformat(),
        "user_id": user_id,
        "user_name": user_name,
        "job_id": job_id,
        "menu": menu,
        "filename": filename,
        "page": page,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(LOG_DIR, f"tokens_{today}.jsonl")
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        logger.exception("토큰 로그 기록 실패")
