"""PDF AI Assistant — FastAPI Backend"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s %(message)s")

from routers import upload, extract_content, extract_table, summary, compare, translate, export, history

app = FastAPI(title="AiDoc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3020", "https://*.poscoenc.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router,          prefix="/api/pdf")
app.include_router(extract_content.router, prefix="/api/pdf/extract/content")
app.include_router(extract_table.router,   prefix="/api/pdf/extract/table")
app.include_router(summary.router,         prefix="/api/pdf/summary")
app.include_router(compare.router,         prefix="/api/pdf/compare")
app.include_router(translate.router,       prefix="/api/pdf/translate")
app.include_router(export.router,          prefix="/api/pdf/export")
app.include_router(history.router,         prefix="/api/admin")


@app.middleware("http")
async def visitor_middleware(request, call_next):
    response = await call_next(request)
    try:
        history.log_visitor(request)
    except Exception:
        pass
    return response


@app.get("/health")
def health():
    return {"status": "ok"}
