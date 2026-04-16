"""Azure SQL DB 연결 관리"""

import os
import pyodbc
import logging

logger = logging.getLogger(__name__)


def get_connection(env: str = "dev"):
    """Azure SQL Server 연결 반환"""
    if env == "prd":
        server = os.getenv("AZURE_PRD_SERVER")
        db = os.getenv("AZURE_PRD_DB")
        user = os.getenv("AZURE_PRD_USER")
        pw = os.getenv("AZURE_PRD_PASSWORD")
    else:
        server = os.getenv("AZURE_DEV_SERVER")
        db = os.getenv("AZURE_DEV_DB")
        user = os.getenv("AZURE_DEV_USER")
        pw = os.getenv("AZURE_DEV_PASSWORD")

    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={server};DATABASE={db};"
        f"UID={user};PWD={pw};"
        "Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str)


def execute_query(query: str, params=None, env: str = "dev"):
    """쿼리 실행 후 결과 반환 (SELECT)"""
    conn = get_connection(env)
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or [])
        columns = [col[0] for col in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        conn.close()


def execute_command(query: str, params=None, env: str = "dev"):
    """쿼리 실행 (INSERT/UPDATE/DELETE)"""
    conn = get_connection(env)
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or [])
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()
