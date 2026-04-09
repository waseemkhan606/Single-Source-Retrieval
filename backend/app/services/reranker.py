"""
Cross-Encoder re-ranker using sentence-transformers.

After FAISS retrieves `retrieval_top_k` candidates, this module scores
each (query, chunk) pair and returns the top `reranker_top_k` by relevance.
"""

import logging
from functools import lru_cache

from langchain_core.documents import Document
from sentence_transformers import CrossEncoder

from app.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_cross_encoder() -> CrossEncoder:
    settings = get_settings()
    logger.info("Loading CrossEncoder model: %s", settings.reranker_model)
    return CrossEncoder(settings.reranker_model)


def rerank(query: str, documents: list[Document]) -> list[Document]:
    """
    Score every (query, document) pair and return the top-k documents
    sorted by descending cross-encoder score.

    Parameters
    ----------
    query     : The (possibly rewritten) user question.
    documents : Candidate chunks from initial FAISS retrieval.

    Returns
    -------
    Reranked list of Documents (length ≤ reranker_top_k), each annotated
    with a `rerank_score` metadata field.
    """
    settings = get_settings()

    if not documents:
        return []

    encoder = _get_cross_encoder()

    # Build (query, passage) pairs for batch scoring
    pairs = [(query, doc.page_content) for doc in documents]
    scores: list[float] = encoder.predict(pairs).tolist()

    # Annotate and sort
    for doc, score in zip(documents, scores):
        doc.metadata["rerank_score"] = round(float(score), 4)

    ranked = sorted(documents, key=lambda d: d.metadata["rerank_score"], reverse=True)
    top_k = ranked[: settings.reranker_top_k]

    logger.debug(
        "Re-ranked %d → %d documents. Top score=%.4f",
        len(documents),
        len(top_k),
        top_k[0].metadata["rerank_score"] if top_k else 0.0,
    )
    return top_k