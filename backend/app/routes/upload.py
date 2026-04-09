"""
POST /api/upload

Accepts a PDF file + a text description, triggers document ingestion,
and returns the assigned document_id and chunk count.
"""

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.models import UploadResponse
from app.services.document_processor import ingest_pdf

logger = logging.getLogger(__name__)
router = APIRouter()

_MAX_PDF_SIZE_MB = 50
_MAX_PDF_BYTES = _MAX_PDF_SIZE_MB * 1024 * 1024


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF document for RAG ingestion",
)
async def upload_document(
    file: UploadFile = File(..., description="PDF document to ingest"),
    description: str = Form(..., min_length=5, max_length=1000),
) -> UploadResponse:
    """
    Upload a PDF alongside a descriptive context string.

    The backend will:
    1. Extract and chunk the PDF text.
    2. Generate embeddings via Google embedding-001.
    3. Persist chunks to the local FAISS index.

    Returns a `document_id` you can pass to `/api/query` to restrict
    retrieval to this document.
    """
    # Validate content type
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are accepted.",
        )

    pdf_bytes = await file.read()

    if len(pdf_bytes) > _MAX_PDF_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF exceeds the {_MAX_PDF_SIZE_MB} MB size limit.",
        )

    if len(pdf_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        document_id, chunk_count = ingest_pdf(
            pdf_bytes=pdf_bytes,
            filename=file.filename or "document.pdf",
            description=description,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        logger.exception("Ingestion failed for file '%s'", file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion error: {exc}",
        )

    return UploadResponse(
        message="Document ingested successfully.",
        document_id=document_id,
        chunk_count=chunk_count,
        description=description,
    )