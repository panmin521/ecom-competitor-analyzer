import asyncio
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import run
from db import check_and_increment, get_usage, save_analysis, get_all_analyses

load_dotenv()

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
