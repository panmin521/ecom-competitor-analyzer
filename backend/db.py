import os
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

FREE_LIMIT = 3


def _conn():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS usage (
                session_id TEXT PRIMARY KEY,
                count INT NOT NULL DEFAULT 0,
                reset_date TEXT NOT NULL
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                product TEXT NOT NULL,
                category TEXT NOT NULL,
                competitors TEXT[],
                report TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
    conn.commit()
    return conn


def check_and_increment(session_id: str) -> tuple[bool, int]:
    now = datetime.now().strftime("%Y-%m")
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count, reset_date FROM usage WHERE session_id=%s", (session_id,))
            row = cur.fetchone()

            if row is None or row[1] != now:
                cur.execute(
                    "INSERT INTO usage (session_id, count, reset_date) VALUES (%s, 1, %s) "
                    "ON CONFLICT (session_id) DO UPDATE SET count=1, reset_date=%s",
                    (session_id, now, now)
                )
                conn.commit()
                return True, FREE_LIMIT - 1

            count = row[0]
            if count >= FREE_LIMIT:
                return False, 0

            cur.execute("UPDATE usage SET count=%s WHERE session_id=%s", (count + 1, session_id))
            conn.commit()
            return True, FREE_LIMIT - count - 1


def get_usage(session_id: str) -> dict:
    now = datetime.now().strftime("%Y-%m")
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count FROM usage WHERE session_id=%s AND reset_date=%s",
                (session_id, now)
            )
            row = cur.fetchone()
    used = row[0] if row else 0
    return {"used": used, "remaining": max(0, FREE_LIMIT - used), "limit": FREE_LIMIT}


def save_analysis(session_id: str, product: str, category: str, competitors: list, report: str):
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO analyses (session_id, product, category, competitors, report) "
                "VALUES (%s, %s, %s, %s, %s)",
                (session_id, product, category, competitors, report)
            )
        conn.commit()


def get_all_analyses(limit: int = 100) -> list:
    with _conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, session_id, product, category, competitors, created_at "
                "FROM analyses ORDER BY created_at DESC LIMIT %s",
                (limit,)
            )
            return [dict(r) for r in cur.fetchall()]
