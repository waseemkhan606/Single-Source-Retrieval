"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Send, Loader2 } from "lucide-react";

import MessageBubble   from "@/components/MessageBubble";
import SuggestionChips from "@/components/SuggestionChips";
import AudioControls   from "@/components/AudioControls";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech }      from "@/hooks/useTextToSpeech";
import { queryDocuments, getSuggestions } from "@/lib/api";
import type { Message, DocumentState, SuggestionChip } from "@/types";

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseQuizMCQ(text: string) {
  type Q = { question: string; options: string[]; correctIndex: number };
  const questions: Q[] = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let cur: Q | null = null;

  const push = () => {
    if (cur && cur.options.length >= 2 && cur.correctIndex >= 0) questions.push(cur);
  };

  for (const line of lines) {
    const qMatch = line.match(/^\*{0,2}(\d+)[.)]\*{0,2}\s+\*{0,2}(.+?)\*{0,2}\s*\??$/);
    if (qMatch) { push(); cur = { question: qMatch[2].trim(), options: [], correctIndex: -1 }; continue; }

    if (!cur) continue;

    const optMatch = line.match(/^\*{0,2}([A-D])[.)]\*{0,2}\s+\*{0,2}(.+?)\*{0,2}\s*$/i);
    if (optMatch) { cur.options.push(optMatch[2].trim()); continue; }

    const correctMatch = line.match(/(?:correct(?:\s+answer)?|answer)[:\s]+\*{0,2}([A-D])\b/i);
    if (correctMatch) cur.correctIndex = ["A","B","C","D"].indexOf(correctMatch[1].toUpperCase());
  }
  push();

  return questions.length >= 2 ? questions : null;
}

interface Props {
  documentState: DocumentState;
  sendRef?: RefObject<((q: string) => void) | null>;
  resetRef?: RefObject<(() => void) | null>;
}

export default function ChatInterface({ documentState, sendRef, resetRef }: Props) {
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [speakingId,     setSpeakingId]     = useState<string | null>(null);
  const [dynamicChips,   setDynamicChips]   = useState<SuggestionChip[]>([]);
  const [loadingChips,   setLoadingChips]   = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { transcript, isListening, isSupported, startListening, stopListening, resetTranscript } =
    useSpeechRecognition();
  const { speak, stop: stopSpeech, isGenerating: ttsGenerating, isSpeaking, elapsedSeconds, voice, setVoice } = useTextToSpeech();

  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (!documentState.documentId) { setDynamicChips([]); return; }
    setLoadingChips(true);
    getSuggestions(documentState.documentId)
      .then(questions => {
        if (questions.length >= 2) {
          setDynamicChips(questions.map(q => ({
            label: q.slice(0, 28) + (q.length > 28 ? "…" : ""),
            query: q,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingChips(false));
  }, [documentState.documentId]);

  const hasDoc = !!documentState.documentId;

  useEffect(() => { if (sendRef) sendRef.current = (q: string) => send(q); });
  useEffect(() => { if (resetRef) resetRef.current = () => { stopSpeech(); setSpeakingId(null); setMessages([]); setInput(""); }; });

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    if (!hasDoc) return toast.error("Upload a document first.");

    stopSpeech(); setSpeakingId(null);
    const userMsg: Message = { id: uid(), role: "user", content: q, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput(""); resetTranscript(); setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await queryDocuments(q, documentState.documentId);
      const quizQuestions = parseQuizMCQ(res.answer);
      const aiMsg: Message = {
        id: uid(), role: "assistant", content: res.answer,
        sources: res.sources, rewritten_query: res.rewritten_query, timestamp: new Date(),
        quizQuestions: quizQuestions ?? undefined,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      toast.error((e as Error).message ?? "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18, minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {messages.length === 0 && !loading ? (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SuggestionChips
                onSelect={send} disabled={!hasDoc}
                dynamicChips={dynamicChips} loadingChips={loadingChips}
              />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id} message={msg}
                  onSpeak={msg.role === "assistant" ? async t => { setSpeakingId(msg.id); await speak(t); } : undefined}
                  onStopSpeaking={() => { stopSpeech(); setSpeakingId(null); }}
                  isSpeaking={isSpeaking && speakingId === msg.id}
                  isGenerating={ttsGenerating && speakingId === msg.id}
                  elapsedSeconds={speakingId === msg.id ? elapsedSeconds : 0}
                />
              ))}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ display: "flex", gap: 12 }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 4, marginTop: 2,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "#4D96FF", border: "3px solid #000", boxShadow: "2px 2px 0px 0px #000",
                      flexShrink: 0,
                    }}>
                      <Loader2 size={14} color="#fff" className="animate-spin" />
                    </div>
                    <div style={{ background: "#fff", borderRadius: 4, padding: "14px 18px", border: "3px solid #000", boxShadow: "4px 4px 0px 0px #000", display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="dot" /><span className="dot" /><span className="dot" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 16px 16px", flexShrink: 0, borderTop: "3px solid #000" }}>
        <div style={{
          background: "#FFFFFF",
          borderRadius: 4,
          border: "3px solid #000",
          boxShadow: "4px 4px 0px 0px #000",
          padding: "8px 8px 8px 12px",
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
        }}>
          <AudioControls
            isListening={isListening} isSupported={isSupported}
            onStart={startListening} onStop={stopListening} disabled={loading}
            voice={voice} onVoiceChange={setVoice}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={!hasDoc ? "Upload a document to start…" : isListening ? "Listening…" : "Ask a question…"}
            rows={1}
            disabled={loading || !hasDoc}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 13.5, fontWeight: 600, color: "#000", resize: "none",
              padding: "8px 4px", maxHeight: 128, overflowY: "auto", fontFamily: "inherit",
              opacity: loading || !hasDoc ? 0.4 : 1,
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading || !hasDoc}
            style={{
              width: 38, height: 38, borderRadius: 4, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid #000",
              background: input.trim() && !loading && hasDoc ? "#4D96FF" : "#F5F5F0",
              boxShadow: input.trim() && !loading && hasDoc ? "3px 3px 0px 0px #000" : "2px 2px 0px 0px #000",
              cursor: input.trim() && !loading && hasDoc ? "pointer" : "not-allowed",
              opacity: input.trim() && !loading && hasDoc ? 1 : 0.4,
              transition: "transform 0.1s, box-shadow 0.1s, background 0.15s",
            }}
            onMouseEnter={e => {
              if (input.trim() && !loading && hasDoc) {
                (e.currentTarget as HTMLElement).style.transform = "translate(2px, 2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = input.trim() && !loading && hasDoc ? "3px 3px 0px 0px #000" : "2px 2px 0px 0px #000";
            }}
          >
            {loading
              ? <Loader2 size={15} color="#fff" className="animate-spin" />
              : <Send size={15} color={input.trim() && !loading && hasDoc ? "#fff" : "#999"} />}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#888", marginTop: 8 }}>
          Shift + Enter for new line · Powered by Gemini 2.5 Flash
        </p>
      </div>
    </div>
  );
}
