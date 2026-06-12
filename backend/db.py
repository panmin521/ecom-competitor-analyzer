import sqlite3
from datetime import datetime

DB_PATH = "usage.db"
FREE_LIMIT = 3


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS usage "
        "(session_id TEXT PRIMARY KEY, count INT, reset_date TEXT)"
    )
    return conn


def check_and_increment(session_id: str) -> tuple[bool, int]:
    now = datetime.now().strftime("%Y-%m")
    with _conn() as conn:
        row = conn.execute(
            "SELECT count, reset_date FROM usage WHERE session_id=?", (session_id,)
        ).fetchone()

        if row is None or row[1] != now:
            conn.execute(
                "INSERT OR REPLACE INTO usage VALUES (?, 1, ?)", (session_id, now)
            )
            return True, FREE_LIMIT - 1

        count = row[0]
        if count >= FREE_LIMIT:
            return False, 0

        conn.execute(
            "UPDATE usage SET count=? WHERE session_id=?", (count + 1, session_id)
        )
        return True, FREE_LIMIT - count - 1


def get_usage(session_id: str) -> dict:
    now = datetime.now().strftime("%Y-%m")
    with _conn() as conn:
        row = conn.execute(
            "SELECT count FROM usage WHERE session_id=? AND reset_date=?",
            (session_id, now),
        ).fetchone()
    used = row[0] if row else 0
    return {"used": used, "remaining": max(0, FREE_LIMIT - used), "limit": FREE_LIMIT}
