from datetime import datetime
import json
import os

# 免费额度设为很高，几乎等于无限
FREE_LIMIT = 999999
STORAGE_FILE = "usage_data.json"

# 简单的文件存储
def _load_storage():
    if os.path.exists(STORAGE_FILE):
        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}

def _save_storage(data):
    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)


def check_and_increment(session_id: str) -> tuple[bool, int]:
    now = datetime.now().strftime("%Y-%m")
    storage = _load_storage()
    
    if session_id not in storage or storage[session_id].get("reset_date") != now:
        storage[session_id] = {"count": 1, "reset_date": now}
        _save_storage(storage)
        return True, FREE_LIMIT - 1
    
    count = storage[session_id]["count"]
    if count >= FREE_LIMIT:
        return False, 0
    
    storage[session_id]["count"] = count + 1
    _save_storage(storage)
    return True, FREE_LIMIT - count - 1


def get_usage(session_id: str) -> dict:
    now = datetime.now().strftime("%Y-%m")
    storage = _load_storage()
    used = storage.get(session_id, {}).get("count", 0) if storage.get(session_id, {}).get("reset_date") == now else 0
    return {"used": used, "remaining": max(0, FREE_LIMIT - used), "limit": FREE_LIMIT}


def save_analysis(session_id: str, product: str, category: str, competitors: list, report: str):
    # 暂时不保存分析历史
    pass


def get_all_analyses(limit: int = 100) -> list:
    return []
