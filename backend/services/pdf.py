"""PDF 처리 서비스 — PyMuPDF 기반"""

import fitz  # PyMuPDF


def pdf_to_images(pdf_bytes: bytes, dpi: int = 200, pages: list[int] | None = None) -> list[bytes]:
    """PDF → 페이지별 PNG 바이트 리스트. pages는 0-based 인덱스 리스트."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    target_pages = pages if pages is not None else range(len(doc))
    for i in target_pages:
        if 0 <= i < len(doc):
            pix = doc[i].get_pixmap(dpi=dpi)
            images.append(pix.tobytes("png"))
    doc.close()
    return images


def pdf_page_count(pdf_bytes: bytes) -> int:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    count = len(doc)
    doc.close()
    return count


def pdf_thumbnails(pdf_bytes: bytes, dpi: int = 72) -> list[bytes]:
    """저해상도 썸네일 생성"""
    return pdf_to_images(pdf_bytes, dpi=dpi)
