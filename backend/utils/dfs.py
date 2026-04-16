"""DFS (DRM File Server) 파일 읽기/쓰기 유틸리티"""

import os
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

DFS_LOCAL_ROOT = os.environ.get("DFS_LOCAL_ROOT", "/data2/axi")
APP_DFS_BASE = "/axyard/aidoc"

UPLOAD_DIR = f"{APP_DFS_BASE}/upload"
DOWNLOAD_DIR = f"{APP_DFS_BASE}/download"
FAILED_DIR = f"{APP_DFS_BASE}/failed"


def _safe_path(rel_path: str) -> str:
    """Path Traversal 방어: DFS_LOCAL_ROOT 밖으로 나가지 못하게 검증"""
    full = os.path.normpath(os.path.join(DFS_LOCAL_ROOT, rel_path.lstrip("/")))
    if not full.startswith(os.path.normpath(DFS_LOCAL_ROOT)):
        raise HTTPException(403, "잘못된 경로입니다.")
    return full


def read_file(rel_path: str) -> bytes:
    """DFS 로컬 마운트에서 파일 읽기"""
    path = _safe_path(rel_path)
    if not os.path.isfile(path):
        raise HTTPException(404, f"파일을 찾을 수 없습니다: {rel_path}")
    with open(path, "rb") as f:
        return f.read()


def write_file(rel_path: str, data: bytes) -> str:
    """DFS 로컬 마운트에 파일 쓰기, full_path 반환"""
    path = _safe_path(rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return rel_path


def mark_as_failed(rel_path: str):
    """실패한 파일을 failed 디렉토리로 이동"""
    import shutil
    src = _safe_path(rel_path)
    if not os.path.exists(src):
        return
    dst_dir = _safe_path(FAILED_DIR)
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, os.path.basename(src))
    shutil.move(src, dst)
    logger.info("파일 이동 (failed): %s → %s", src, dst)


def ensure_dirs():
    """앱 시작 시 필요한 DFS 디렉토리 생성"""
    for d in [UPLOAD_DIR, DOWNLOAD_DIR, FAILED_DIR]:
        path = _safe_path(d)
        os.makedirs(path, exist_ok=True)
