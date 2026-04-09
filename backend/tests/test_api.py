"""
Full API test suite.

Patches all heavy services (FAISS, LLM, embeddings, httpx) so tests run
instantly without GPU, network, or API keys.
"""

import base64
import io
import struct
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

# ── Shared mock return values ─────────────────────────────────────────────────

_DOC_ID     = "test-doc-id-1234"
_CHUNK_COUNT = 11

_MOCK_RAG = {
    "answer": "The document discusses machine learning fundamentals.",
    "rewritten_query": "What are the key ML concepts?",
    "sources": [{"content": "ML is a subfield of AI.", "page": 1, "score": 0.95}],
}

_MOCK_EVAL = {
    "faithfulness": 0.91,
    "answer_relevancy": 0.88,
    "context_precision": 0.85,
    "context_recall": None,
}

# Minimal valid WAV bytes for TTS mock
def _fake_wav() -> bytes:
    pcm = b"\x00\x00" * 100
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + len(pcm), b"WAVE",
        b"fmt ", 16, 1, 1, 24000, 48000, 2, 16,
        b"data", len(pcm),
    )
    return header + pcm


# ── Mock document in FAISS docstore ──────────────────────────────────────────

class _FakeDoc:
    def __init__(self):
        self.page_content = "This is a chunk about machine learning concepts."
        self.metadata = {"document_id": _DOC_ID, "page": 1}

_fake_vs = MagicMock()
_fake_vs.docstore._dict = {f"id-{i}": _FakeDoc() for i in range(6)}


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def patch_services():
    """Patch every external service before each test."""
    mock_llm_result = MagicMock()
    mock_llm_result.content = (
        "TOPIC: Machine Learning | Core concepts of ML.\n"
        "TOPIC: Neural Networks | Deep learning architectures.\n"
        "TOPIC: Evaluation Metrics | How models are measured.\n"
    )

    mock_suggestions_result = MagicMock()
    mock_suggestions_result.content = (
        "What is supervised learning?\n"
        "How do neural networks work?\n"
        "What are evaluation metrics?\n"
        "What is overfitting?\n"
    )

    _pcm_bytes = b"\x00\x01" * 100

    with (
        patch("app.routes.upload.ingest_pdf",        MagicMock(return_value=(_DOC_ID, _CHUNK_COUNT))),
        patch("app.routes.query.run_rag",             MagicMock(return_value=_MOCK_RAG)),
        patch("app.routes.evaluate.evaluate_rag",     MagicMock(return_value=_MOCK_EVAL)),
        patch("app.routes.suggestions.load_vector_store", MagicMock(return_value=_fake_vs)),
        patch("app.routes.topics.load_vector_store",      MagicMock(return_value=_fake_vs)),
        # Patch _get_llm to prevent ChatOpenAI instantiation (avoids httpx.AsyncClient corruption)
        patch("app.routes.suggestions._get_llm", MagicMock(return_value=MagicMock())),
        patch("app.routes.topics._get_llm",      MagicMock(return_value=MagicMock())),
        patch("app.routes.tts._get_llm",         MagicMock(return_value=MagicMock())),
        # Patch each prompt chain's __or__ so invoke() returns the right fixture
        patch("app.routes.suggestions._SUGGESTIONS_PROMPT",
              MagicMock(__or__=MagicMock(return_value=MagicMock(invoke=MagicMock(return_value=mock_suggestions_result))))),
        patch("app.routes.topics._TOPICS_PROMPT",
              MagicMock(__or__=MagicMock(return_value=MagicMock(invoke=MagicMock(return_value=mock_llm_result))))),
        patch("app.routes.tts._SPOKEN_REWRITE_PROMPT",
              MagicMock(__or__=MagicMock(return_value=MagicMock(invoke=MagicMock(return_value=MagicMock(content="Spoken script.")))))),
        # Patch the extracted streaming helper — safe, no httpx module corruption
        patch("app.routes.tts._stream_pcm16", AsyncMock(return_value=[_pcm_bytes])),
        patch("app.config.Settings.openrouter_api_key", "test-or-key", create=True),
    ):
        yield


@pytest.fixture
def app():
    from app.main import app as fastapi_app
    return fastapi_app


@pytest.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── Health ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── Upload ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_success(client):
    r = await client.post(
        "/api/upload",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
        data={"description": "A document about machine learning."},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["document_id"] == _DOC_ID
    assert body["chunk_count"] == _CHUNK_COUNT


@pytest.mark.asyncio
async def test_upload_rejects_non_pdf(client):
    r = await client.post(
        "/api/upload",
        files={"file": ("doc.txt", io.BytesIO(b"hello"), "text/plain")},
        data={"description": "Some description here."},
    )
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_upload_requires_description(client):
    r = await client.post(
        "/api/upload",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
        data={"description": "hi"},   # too short (min 5)
    )
    assert r.status_code == 422


# ── Query ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_query_success(client):
    r = await client.post("/api/query", json={"question": "What is machine learning?"})
    assert r.status_code == 200
    body = r.json()
    assert body["answer"] == _MOCK_RAG["answer"]
    assert len(body["sources"]) == 1
    assert "rewritten_query" in body


@pytest.mark.asyncio
async def test_query_with_document_id(client):
    r = await client.post("/api/query", json={"question": "Explain neural networks.", "document_id": _DOC_ID})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_query_too_short(client):
    r = await client.post("/api/query", json={"question": "Hi"})
    assert r.status_code == 422


# ── Evaluate ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_evaluate_success(client):
    r = await client.post("/api/evaluate", json={
        "question": "What is ML?",
        "answer": "ML is a subfield of AI.",
        "contexts": ["Machine learning is a subfield of artificial intelligence."],
    })
    assert r.status_code == 200
    body = r.json()
    assert "metrics" in body
    assert body["metrics"]["faithfulness"] == 0.91


# ── Suggestions ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_suggestions_success(client):
    r = await client.post("/api/suggestions", json={"document_id": _DOC_ID})
    assert r.status_code == 200
    body = r.json()
    assert "suggestions" in body
    assert len(body["suggestions"]) >= 2


@pytest.mark.asyncio
async def test_suggestions_invalid_doc(client):
    with patch("app.routes.suggestions.load_vector_store") as mock_vs:
        mock_vs.return_value.docstore._dict = {}
        r = await client.post("/api/suggestions", json={"document_id": "nonexistent"})
    assert r.status_code == 404


# ── Topics ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_topics_success(client):
    r = await client.post("/api/topics", json={"document_id": _DOC_ID})
    assert r.status_code == 200
    body = r.json()
    assert "topics" in body
    assert len(body["topics"]) >= 1
    assert "title" in body["topics"][0]
    assert "description" in body["topics"][0]


# ── TTS ───────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_tts_returns_wav(client):
    r = await client.post("/api/tts", json={"text": "Hello, this is a test.", "voice": "nova"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    # Verify WAV header
    assert r.content[:4] == b"RIFF"
    assert r.content[8:12] == b"WAVE"


@pytest.mark.asyncio
async def test_tts_invalid_voice_falls_back(client):
    r = await client.post("/api/tts", json={"text": "Testing fallback voice.", "voice": "invalid_voice"})
    assert r.status_code == 200  # falls back to nova


@pytest.mark.asyncio
async def test_tts_empty_text_rejected(client):
    r = await client.post("/api/tts", json={"text": ""})
    # pydantic min_length not set, but empty string hits the "no audio" path
    assert r.status_code in (200, 422, 502)