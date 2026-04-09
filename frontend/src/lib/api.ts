/**
 * Typed API client that talks to the FastAPI backend.
 * All endpoints use Next.js rewrites (/api/*) so no CORS issue in dev.
 */

import type {
  EvalResponse,
  QueryResponse,
  UploadResponse,
} from "@/types";

const BASE = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Upload a PDF ──────────────────────────────────────────────────────────────

export async function uploadDocument(
  file: File,
  description: string,
  onProgress?: (pct: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", description);

  // Use XMLHttpRequest so we can track upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new Error("Invalid response from server."));
        }
      } else {
        let body: { detail?: string } = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        reject(new Error(body?.detail ?? `Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

// ── Query the RAG pipeline ────────────────────────────────────────────────────

export async function queryDocuments(
  question: string,
  documentId?: string | null
): Promise<QueryResponse> {
  const res = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      document_id: documentId ?? null,
    }),
  });
  return handleResponse<QueryResponse>(res);
}

// ── Get document topics for sidebar ──────────────────────────────────────────

export async function getTopics(documentId: string): Promise<{ title: string; description: string }[]> {
  const res = await fetch(`${BASE}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.topics ?? [];
}

// ── Get document-specific suggestion chips ────────────────────────────────────

export async function getSuggestions(documentId: string): Promise<string[]> {
  const res = await fetch(`${BASE}/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions ?? [];
}

// ── Trigger RAGAS evaluation ──────────────────────────────────────────────────

export async function evaluateResponse(
  question: string,
  answer: string,
  contexts: string[],
  groundTruth?: string
): Promise<EvalResponse> {
  const res = await fetch(`${BASE}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      answer,
      contexts,
      ground_truth: groundTruth ?? null,
    }),
  });
  return handleResponse<EvalResponse>(res);
}