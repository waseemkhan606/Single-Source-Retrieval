# My Learning AI Assistant

> An advanced RAG-powered AI assistant with a cosmic glassmorphism UI.  
> Upload PDFs, ask questions with text or voice, get intelligent answers grounded in your documents.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, Tailwind CSS, Framer Motion, Web Speech API |
| Backend | Python 3.11, FastAPI, LangChain |
| LLM | Gemini 2.5 Flash via OpenRouter |
| Embeddings | Google `embedding-001` |
| Vector Store | FAISS (local, persisted to disk) |
| Re-ranking | `sentence-transformers` Cross-Encoder |
| Evaluation | RAGAS |
| Resilience | `tenacity` exponential backoff |
| DevOps | Docker, GitHub Actions |

---

## Quick Start

### 1. Clone & configure secrets

```bash
git clone <your-repo-url>
cd my-learning-ai-assistant

# Backend secrets
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

```env
OPENROUTER_API_KEY=<your OpenRouter key>   # https://openrouter.ai/keys
GOOGLE_API_KEY=<your Google AI key>        # https://aistudio.google.com/app/apikey
```

```bash
# Frontend (optional — only needed if you change the API URL)
cp frontend/.env.local.example frontend/.env.local
```

---

### 2. Run with Docker Compose (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

### 3. Run locally (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

---

## Usage

1. **Upload a PDF** — Drag and drop a PDF into the upload panel and add a short description.
2. **Ask a question** — Type in the chat box or click the **microphone** button to speak.
3. **Hear the answer** — The AI response is automatically read aloud via Text-to-Speech.
4. **Explore sources** — Click "N sources" on any AI message to see the retrieved chunks and page numbers.
5. **Try suggestion chips** — On the welcome screen, click any pre-defined query to get started instantly.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload PDF + description, returns `document_id` |
| `/api/query` | POST | RAG query, returns answer + sources |
| `/api/evaluate` | POST | RAGAS evaluation of an answer |
| `/health` | GET | Health check |
| `/docs` | GET | Swagger UI |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app + CORS + routers
│   │   ├── config.py               # Pydantic settings (env vars)
│   │   ├── models.py               # Request/response schemas
│   │   ├── routes/
│   │   │   ├── upload.py           # POST /api/upload
│   │   │   ├── query.py            # POST /api/query
│   │   │   └── evaluate.py         # POST /api/evaluate
│   │   ├── services/
│   │   │   ├── document_processor.py  # PDF → chunks → FAISS
│   │   │   ├── embeddings.py          # Google embedding-001 + retry
│   │   │   ├── rag_pipeline.py        # Full RAG orchestration
│   │   │   ├── reranker.py            # Cross-Encoder re-ranking
│   │   │   └── evaluator.py           # RAGAS metrics + JSONL logging
│   │   └── utils/retry.py          # Tenacity decorators
│   └── tests/test_api.py
├── frontend/
│   └── src/
│       ├── app/                    # Next.js App Router
│       ├── components/             # ChatInterface, UploadZone, etc.
│       ├── hooks/                  # useSpeechRecognition, useTextToSpeech
│       ├── lib/api.ts              # Typed API client
│       └── types/index.ts
├── .github/workflows/main.yml      # CI/CD pipeline
├── docker-compose.yml
└── README.md
```

---

## Evaluation Logs

RAGAS metrics are appended to `backend/logs/ragas_eval.jsonl` on each evaluation request.
Each line is a JSON record:

```json
{
  "timestamp": "2026-04-02T12:00:00Z",
  "question": "What is the main topic?",
  "answer_preview": "The main topic is...",
  "metrics": {
    "faithfulness": 0.92,
    "answer_relevancy": 0.88,
    "context_precision": 0.85,
    "context_recall": null
  }
}
```

---

## CI/CD

The GitHub Actions workflow (`.github/workflows/main.yml`) runs on every push:

1. **Backend** — Ruff lint + format check + pytest
2. **Frontend** — ESLint + TypeScript check + Next.js build
3. **Docker** — Build both images (cache via GitHub Actions cache)
4. **Deploy** — Placeholder step (wire up to your infrastructure)