"""
POST /api/suggestions

Generates 4 document-specific question suggestions using the LLM + a sample
of document chunks. Returns a clean JSON list — no full RAG pipeline needed.
"""

import logging

from fastapi import APIRouter, HTTPException
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.services.document_processor import load_vector_store
from app.services.rag_pipeline import _get_llm

logger = logging.getLogger(__name__)
router = APIRouter()

_SUGGESTIONS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "You are a helpful learning assistant. Based on the document excerpts provided, "
            "generate exactly 4 specific, insightful questions a student would genuinely want to ask. "
            "Each question must be unique, targeting a different concept or section. "
            "Return ONLY the 4 questions, one per line, no numbering, no bullets, no extra text."
        ),
    ),
    ("human", "Document excerpts:\n\n{context}"),
])


class SuggestionsRequest(BaseModel):
    document_id: str


class SuggestionsResponse(BaseModel):
    suggestions: list[str]


@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(payload: SuggestionsRequest) -> SuggestionsResponse:
    try:
        vector_store = load_vector_store()
        # Scan docstore directly — avoids FAISS filter k-cutoff issues
        all_docs = list(vector_store.docstore._dict.values())
        docs = [
            d for d in all_docs
            if getattr(d, "metadata", {}).get("document_id") == payload.document_id
        ][:6]
    except Exception as exc:
        logger.warning("Vector store lookup failed: %s", exc)
        raise HTTPException(status_code=404, detail="Document not found in index.")

    if not docs:
        raise HTTPException(status_code=404, detail="No chunks found for this document.")

    context = "\n\n---\n\n".join(doc.page_content[:400] for doc in docs)

    llm = _get_llm()
    try:
        chain = _SUGGESTIONS_PROMPT | llm
        result = chain.invoke({"context": context})
        raw = result.content.strip()
    except Exception as exc:
        logger.error("LLM suggestions error: %s", exc)
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")

    suggestions = [
        line.strip()
        for line in raw.splitlines()
        if line.strip() and len(line.strip()) > 10
    ][:4]

    if len(suggestions) < 2:
        raise HTTPException(status_code=502, detail="Could not generate suggestions.")

    return SuggestionsResponse(suggestions=suggestions)