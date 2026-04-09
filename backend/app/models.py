"""
Pydantic request / response models shared across routes.
"""

from pydantic import BaseModel, Field


# ── Upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    message: str
    document_id: str
    chunk_count: int
    description: str


# ── Query ─────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    document_id: str | None = Field(
        default=None,
        description="If provided, restrict retrieval to this document's chunks.",
    )
    stream: bool = False


class SourceChunk(BaseModel):
    content: str
    page: int | None = None
    score: float | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    rewritten_query: str
    document_id: str | None = None


# ── Evaluation ────────────────────────────────────────────────────────────────

class EvalRequest(BaseModel):
    question: str
    answer: str
    contexts: list[str]
    ground_truth: str | None = None


class EvalMetrics(BaseModel):
    faithfulness: float | None = None
    answer_relevancy: float | None = None
    context_precision: float | None = None
    context_recall: float | None = None


class EvalResponse(BaseModel):
    metrics: EvalMetrics
    logged: bool