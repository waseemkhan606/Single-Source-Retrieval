// ── API shapes ────────────────────────────────────────────────────────────────

export interface UploadResponse {
  message: string;
  document_id: string;
  chunk_count: number;
  description: string;
}

export interface SourceChunk {
  content: string;
  page: number | null;
  score: number | null;
}

export interface QueryResponse {
  answer: string;
  sources: SourceChunk[];
  rewritten_query: string;
  document_id: string | null;
}

export interface EvalMetrics {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  context_recall: number | null;
}

export interface EvalResponse {
  metrics: EvalMetrics;
  logged: boolean;
}

// ── UI shapes ─────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex?: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sources?: SourceChunk[];
  rewritten_query?: string;
  timestamp: Date;
  quizQuestions?: QuizQuestion[];
}

export interface DocumentState {
  documentId: string | null;
  filename: string | null;
  description: string | null;
  chunkCount: number | null;
}

export interface SuggestionChip {
  label: string;
  query: string;
}