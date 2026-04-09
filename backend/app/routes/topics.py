"""
POST /api/topics

Scans the document's chunks and asks the LLM to identify the main topics/sections.
Returns a list of { title, description } objects for the sidebar.
"""

import logging

from fastapi import APIRouter, HTTPException
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.services.document_processor import load_vector_store
from app.services.rag_pipeline import _get_llm

logger = logging.getLogger(__name__)
router = APIRouter()

_TOPICS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "You are a document analyst. Based on the document excerpts provided, "
            "identify 5-8 main topics or sections in the document. "
            "For each topic return exactly this format on its own line:\n"
            "TOPIC: <short title> | <one sentence description>\n"
            "Return nothing else."
        ),
    ),
    ("human", "Document excerpts:\n\n{context}"),
])


class TopicsRequest(BaseModel):
    document_id: str


class Topic(BaseModel):
    title: str
    description: str


class TopicsResponse(BaseModel):
    topics: list[Topic]


@router.post("/topics", response_model=TopicsResponse)
async def get_topics(payload: TopicsRequest) -> TopicsResponse:
    try:
        vector_store = load_vector_store()
        all_docs = list(vector_store.docstore._dict.values())
        chunks = [
            d for d in all_docs
            if getattr(d, "metadata", {}).get("document_id") == payload.document_id
        ]
    except Exception as exc:
        logger.warning("Vector store error: %s", exc)
        raise HTTPException(status_code=404, detail="Document not found.")

    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks for this document.")

    # Sample evenly across the document for broad coverage
    step = max(1, len(chunks) // 8)
    sampled = chunks[::step][:8]
    context = "\n\n---\n\n".join(c.page_content[:350] for c in sampled)

    llm = _get_llm()
    try:
        chain = _TOPICS_PROMPT | llm
        result = chain.invoke({"context": context})
        raw = result.content.strip()
    except Exception as exc:
        logger.error("LLM topics error: %s", exc)
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")

    topics: list[Topic] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("TOPIC:"):
            continue
        rest = line[len("TOPIC:"):].strip()
        if "|" in rest:
            title, desc = rest.split("|", 1)
            topics.append(Topic(title=title.strip(), description=desc.strip()))
        else:
            topics.append(Topic(title=rest.strip(), description=""))

    if not topics:
        raise HTTPException(status_code=502, detail="Could not extract topics.")

    return TopicsResponse(topics=topics)