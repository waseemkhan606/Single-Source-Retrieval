"""
PDF ingestion, intelligent chunking, and FAISS index management.

Extraction pipeline (each stage feeds the next as fallback)
------------------------------------------------------------
Stage 1 — pdfplumber  : best for complex layouts and tables
Stage 2 — pypdf       : fast, handles most standard digital PDFs
Stage 3 — pymupdf     : robust fallback for compressed / legacy PDFs
Stage 4 — OCR         : pytesseract + pdf2image for fully scanned PDFs

Every page is attempted through all four stages; the first stage that
yields non-empty text for a given page wins. This means a hybrid PDF
(some text pages, some scanned pages) is handled correctly.
"""

import io
import logging
import uuid
from pathlib import Path

from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings
from app.services.embeddings import get_embeddings

logger = logging.getLogger(__name__)


# ── Stage 1: pdfplumber ───────────────────────────────────────────────────────

def _extract_with_pdfplumber(pdf_bytes: bytes) -> dict[int, str]:
    import pdfplumber
    result: dict[int, str] = {}
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                result[page_num] = text
    return result


# ── Stage 2: pypdf ────────────────────────────────────────────────────────────

def _extract_with_pypdf(pdf_bytes: bytes) -> dict[int, str]:
    from pypdf import PdfReader
    result: dict[int, str] = {}
    reader = PdfReader(io.BytesIO(pdf_bytes))
    for page_num, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text(extraction_mode="layout") or ""
        except TypeError:
            text = page.extract_text() or ""
        text = text.strip()
        if text:
            result[page_num] = text
    return result


# ── Stage 3: pymupdf ──────────────────────────────────────────────────────────

def _extract_with_pymupdf(pdf_bytes: bytes) -> dict[int, str]:
    import fitz  # pymupdf
    result: dict[int, str] = {}
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                result[page_num] = text
    return result


# ── Stage 4: OCR via pytesseract + pdf2image ──────────────────────────────────

def _extract_with_ocr(pdf_bytes: bytes, missing_pages: set[int]) -> dict[int, str]:
    """
    Convert only the pages that all text-based engines failed on to images,
    then run Tesseract OCR on them. Requires:
      - tesseract  (brew install tesseract)
      - poppler    (brew install poppler)
    """
    import pytesseract
    from pdf2image import convert_from_bytes

    result: dict[int, str] = {}

    # Convert only the missing pages (1-indexed) to avoid processing the whole doc
    for page_num in sorted(missing_pages):
        try:
            images = convert_from_bytes(
                pdf_bytes,
                dpi=300,
                first_page=page_num,
                last_page=page_num,
            )
            if not images:
                continue
            text = pytesseract.image_to_string(images[0], lang="eng").strip()
            if text:
                result[page_num] = text
                logger.info("OCR extracted text from page %d", page_num)
            else:
                logger.warning("OCR returned no text for page %d", page_num)
        except Exception as exc:
            logger.warning("OCR failed on page %d: %s", page_num, exc)

    return result


# ── Multi-engine coordinator ──────────────────────────────────────────────────

def _get_total_pages(pdf_bytes: bytes) -> int:
    """Quick page count without full parsing."""
    try:
        import fitz
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            return len(doc)
    except Exception:
        from pypdf import PdfReader
        return len(PdfReader(io.BytesIO(pdf_bytes)).pages)


def _extract_text_from_pdf(pdf_bytes: bytes) -> list[tuple[str, int]]:
    """
    Run all extraction stages and return a merged (text, page_num) list,
    sorted by page number.
    """
    total_pages = _get_total_pages(pdf_bytes)
    all_page_nums = set(range(1, total_pages + 1))
    page_map: dict[int, str] = {}

    text_stages = [
        ("pdfplumber", _extract_with_pdfplumber),
        ("pypdf",      _extract_with_pypdf),
        ("pymupdf",    _extract_with_pymupdf),
    ]

    for name, extractor in text_stages:
        missing = all_page_nums - page_map.keys()
        if not missing:
            break
        try:
            found = extractor(pdf_bytes)
            for page_num, text in found.items():
                if page_num not in page_map:
                    page_map[page_num] = text
            logger.debug("%s: captured %d page(s)", name, len(found))
        except Exception as exc:
            logger.warning("Extractor '%s' failed: %s", name, exc)

    # OCR pass for any pages still missing text
    missing_after_text = all_page_nums - page_map.keys()
    if missing_after_text:
        logger.info(
            "Falling back to OCR for %d page(s): %s",
            len(missing_after_text),
            sorted(missing_after_text),
        )
        try:
            ocr_results = _extract_with_ocr(pdf_bytes, missing_after_text)
            page_map.update(ocr_results)
        except Exception as exc:
            logger.warning("OCR stage failed: %s", exc)

    return [(text, num) for num, text in sorted(page_map.items())]


# ── Document builder ──────────────────────────────────────────────────────────

def _build_documents(
    pages: list[tuple[str, int]],
    description: str,
    document_id: str,
    filename: str,
) -> list[Document]:
    return [
        Document(
            page_content=text,
            metadata={
                "page": page_num,
                "document_id": document_id,
                "filename": filename,
                "description": description,
            },
        )
        for text, page_num in pages
    ]


# ── Public API ────────────────────────────────────────────────────────────────

def ingest_pdf(
    pdf_bytes: bytes,
    filename: str,
    description: str,
) -> tuple[str, int]:
    """
    Full ingestion pipeline: extract → chunk → embed → persist FAISS.
    Returns (document_id, total_chunks).
    """
    settings = get_settings()
    embeddings = get_embeddings()

    document_id = str(uuid.uuid4())
    logger.info("Starting ingestion for '%s' (id=%s)", filename, document_id)

    pages = _extract_text_from_pdf(pdf_bytes)

    if not pages:
        raise ValueError(
            "Could not extract text from any page of this PDF, even with OCR. "
            "The document may be corrupt, password-protected, or contain only graphics."
        )

    logger.info("Extracted text from %d/%d page(s) of '%s'",
                len(pages), _get_total_pages(pdf_bytes), filename)

    raw_docs = _build_documents(pages, description, document_id, filename)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )
    chunks = splitter.split_documents(raw_docs)

    for chunk in chunks:
        chunk.metadata["document_id"] = document_id

    logger.info("Split into %d chunks for document_id=%s", len(chunks), document_id)

    index_path = Path(settings.faiss_index_path)
    index_path.mkdir(parents=True, exist_ok=True)

    # Always rebuild the index from scratch so stale chunks from previous
    # uploads never accumulate.
    logger.info("Building fresh FAISS index.")
    vector_store = FAISS.from_documents(chunks, embeddings)

    vector_store.save_local(str(index_path))
    logger.info("FAISS index persisted to %s", index_path)

    return document_id, len(chunks)


def load_vector_store() -> FAISS:
    """Load the persisted FAISS index from disk."""
    settings = get_settings()
    index_path = Path(settings.faiss_index_path)
    if not (index_path / "index.faiss").exists():
        raise FileNotFoundError(
            "No FAISS index found. Please upload a document first."
        )
    return FAISS.load_local(
        str(index_path), get_embeddings(), allow_dangerous_deserialization=True,
    )