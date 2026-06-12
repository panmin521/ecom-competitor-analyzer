import asyncio
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import run
from db import check_and_increment, get_usage

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


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
    return {**result, "remaining": remaining}


@app.get("/usage/{session_id}")
def usage(session_id: str):
    return get_usage(session_id)
