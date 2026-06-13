import asyncio
import json
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import run
from db import check_and_increment, get_usage, save_analysis, get_all_analyses

load_dotenv()

SORFTIME_KEY = os.getenv("SORFTIME_KEY", "")
SORFTIME_URL = f"https://mcp.sorftime.com?key={SORFTIME_KEY}"


async def _sorftime(tool: str, args: dict):
    hdrs = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(SORFTIME_URL, headers=hdrs, json={
            "jsonrpc": "2.0", "id": 0, "method": "initialize",
            "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "app", "version": "1.0"}}
        })
        sid = r.headers.get("mcp-session-id")
        if sid:
            hdrs["Mcp-Session-Id"] = sid
        r = await client.post(SORFTIME_URL, headers=hdrs, json={
            "jsonrpc": "2.0", "id": 1, "method": "tools/call",
            "params": {"name": tool, "arguments": args}
        })
        ct = r.headers.get("content-type", "")
        if "event-stream" in ct:
            for line in r.text.splitlines():
                if line.startswith("data:"):
                    try:
                        d = json.loads(line[5:].strip())
                        content = d.get("result", {}).get("content", [])
                        if content:
                            return json.loads(content[0]["text"])
                    except Exception:
                        pass
            return {}
        d = r.json()
        content = d.get("result", {}).get("content", [])
        return json.loads(content[0]["text"]) if content else {}

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "admin123")


class AnalyzeRequest(BaseModel):
    product: str
    category: str
    session_id: str


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    allowed, remaining = check_and_increment(req.session_id)
    if not allowed:
        raise HTTPException(status_code=402, detail="Free limit reached. Upgrade to continue.")

    result = await asyncio.to_thread(run, req.product, req.category)
    save_analysis(req.session_id, req.product, req.category, result["competitors"], result["report"])
    return {**result, "remaining": remaining}


@app.get("/usage/{session_id}")
def usage(session_id: str):
    return get_usage(session_id)


@app.get("/admin/analyses")
def admin_analyses(x_admin_token: str = Header(None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return get_all_analyses()


@app.get("/market-report")
async def market_report(product: str, site: str = "US"):
    if not SORFTIME_KEY:
        raise HTTPException(500, "SORFTIME_KEY not configured")
    cats = await _sorftime("category_search_from_product_name", {"productName": product, "amzSite": site})
    if not cats:
        raise HTTPException(404, "No category found for this product")
    cat = cats[0] if isinstance(cats, list) else cats
    report = await _sorftime("category_report", {"nodeId": cat["nodeid"], "amzSite": site})
    top100 = report.get("Top100产品", []) if isinstance(report, dict) else []
    return {
        "category": cat,
        "top100": top100[:20],
        "stats": report.get("类目统计报告", {}) if isinstance(report, dict) else {},
    }
