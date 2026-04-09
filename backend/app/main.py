"""
FastAPI application entry point.

Registers all routers, configures CORS, and sets up structured logging.
Run with: uvicorn app.main:app --reload
"""

import logging
import sys

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes import evaluate, query, suggestions, topics, tts, upload

# ── Structured logging setup ─────────────────────────────────────────────────

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if sys.stderr.isatty()
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    stream=sys.stdout,
)

# ── Application ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="My Learning AI Assistant",
    description=(
        "Advanced RAG API powered by Gemini 2.5 Flash (OpenRouter), "
        "Google Embeddings, FAISS, and RAGAS evaluation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(upload.router,       prefix="/api", tags=["Documents"])
app.include_router(query.router,        prefix="/api", tags=["RAG"])
app.include_router(evaluate.router,     prefix="/api", tags=["Evaluation"])
app.include_router(tts.router,          prefix="/api", tags=["Audio"])
app.include_router(suggestions.router,  prefix="/api", tags=["Suggestions"])
app.include_router(topics.router,       prefix="/api", tags=["Topics"])


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "my-learning-ai-assistant"})


# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root() -> JSONResponse:
    return JSONResponse({
        "message": "My Learning AI Assistant API",
        "docs": "/docs",
    })