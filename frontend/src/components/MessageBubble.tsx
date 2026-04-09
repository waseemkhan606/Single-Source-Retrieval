"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, Volume2, VolumeX, ChevronDown, ChevronUp, FileText, BookOpen, MessageSquare, Loader2, Square } from "lucide-react";
import type { Message } from "@/types";
import QuizCard from "@/components/QuizCard";

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,    "<em>$1</em>")
    .replace(/```[\w]*\n?([\s\S]+?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`(.+?)`/g,      "<code>$1</code>")
    .replace(/^- (.+)$/gm,   "<li>$1</li>")
    .replace(/\n\n/g,         "</p><p>")
    .replace(/^(?!<[huplo]|<\/)(.*\S.*)/gm, "<p>$1</p>");
}

interface Props {
  message: Message;
  onSpeak?: (t: string) => Promise<void>;
  onStopSpeaking?: () => void;
  isSpeaking?: boolean;
  isGenerating?: boolean;
  elapsedSeconds?: number;
}

export default function MessageBubble({ message, onSpeak, onStopSpeaking, isSpeaking, isGenerating, elapsedSeconds }: Props) {
  const [showSources, setShowSources] = useState(false);
  const [showQuiz,    setShowQuiz]    = useState(true);
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: 4, marginTop: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isUser ? "#FFD93D" : "#4D96FF",
        border: "3px solid #000",
        boxShadow: "2px 2px 0px 0px #000",
      }}>
        {isUser
          ? <User size={14} color="#000" />
          : <Bot  size={14} color="#fff" />}
      </div>

      {/* Bubble + actions */}
      <div className={`flex-1 space-y-2 flex flex-col ${isUser ? "items-end" : "items-start"}`} style={{ maxWidth: "82%" }}>
        {message.quizQuestions && !isUser ? (
          <div style={{ width: "100%" }}>
            {/* Toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => setShowQuiz(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11.5, fontWeight: 800, padding: "4px 10px",
                  borderRadius: 4, border: "2px solid #000", cursor: "pointer",
                  transition: "transform 0.1s, box-shadow 0.1s",
                  background: !showQuiz ? "#4D96FF" : "#FFFBF0",
                  color: !showQuiz ? "#fff" : "#000",
                  boxShadow: !showQuiz ? "2px 2px 0px 0px #000" : "2px 2px 0px 0px #000",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(1px,1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0px 0px #000"; }}
              >
                <MessageSquare size={11} /> Answer
              </button>
              <button
                onClick={() => setShowQuiz(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11.5, fontWeight: 800, padding: "4px 10px",
                  borderRadius: 4, border: "2px solid #000", cursor: "pointer",
                  transition: "transform 0.1s, box-shadow 0.1s",
                  background: showQuiz ? "#FFD93D" : "#FFFBF0",
                  color: "#000",
                  boxShadow: "2px 2px 0px 0px #000",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(1px,1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0px 0px #000"; }}
              >
                <BookOpen size={11} /> Quiz
              </button>
            </div>
            {showQuiz
              ? <QuizCard questions={message.quizQuestions} />
              : <div style={{ background: "#fff", borderRadius: 4, padding: "12px 16px", border: "3px solid #000", boxShadow: "4px 4px 0px 0px #000" }}>
                  <div className="prose" style={{ fontSize: "13.5px" }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                </div>
            }
          </div>
        ) : (
          <div style={{
            borderRadius: 4,
            padding: "12px 16px",
            background: isUser ? "#FFD93D" : "#FFFFFF",
            border: "3px solid #000",
            boxShadow: isUser ? "4px 4px 0px 0px #000" : "4px 4px 0px 0px #000",
          }}>
            {isUser
              ? <p style={{ fontSize: "13.5px", color: "#000", lineHeight: 1.6, fontWeight: 600 }}>{message.content}</p>
              : <div className="prose" style={{ fontSize: "13.5px" }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />}
          </div>
        )}

        {/* Actions row */}
        {!isUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 2 }}>
            {onSpeak && (
              isGenerating ? (
                <button
                  onClick={() => onStopSpeaking?.()}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11.5, fontWeight: 800,
                    background: "#FFD93D", border: "2px solid #000", cursor: "pointer",
                    padding: "3px 8px", borderRadius: 4, boxShadow: "2px 2px 0px 0px #000",
                    transition: "transform 0.1s, box-shadow 0.1s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(1px,1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0px 0px #000"; }}
                >
                  <Loader2 size={11} color="#000" className="animate-spin" />
                  <span style={{ color: "#000" }}>Generating{elapsedSeconds ? ` · ${elapsedSeconds}s` : "…"}</span>
                  <Square size={9} color="#000" />
                  <span style={{ color: "#000" }}>Cancel</span>
                </button>
              ) : isSpeaking ? (
                <button
                  onClick={() => onStopSpeaking?.()}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11.5, fontWeight: 800,
                    background: "#FF6B6B", border: "2px solid #000", cursor: "pointer",
                    padding: "3px 8px", borderRadius: 4, boxShadow: "2px 2px 0px 0px #000",
                    transition: "transform 0.1s, box-shadow 0.1s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(1px,1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0px 0px #000"; }}
                >
                  <VolumeX size={12} color="#fff" />
                  <span style={{ color: "#fff" }}>Stop</span>
                </button>
              ) : (
                <button
                  onClick={() => onSpeak?.(message.content)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11.5, fontWeight: 800,
                    background: "#FFFBF0", border: "2px solid #000", cursor: "pointer",
                    padding: "3px 8px", borderRadius: 4, boxShadow: "2px 2px 0px 0px #000",
                    transition: "transform 0.1s, box-shadow 0.1s",
                    color: "#000",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(1px,1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0px 0px #000"; }}
                >
                  <Volume2 size={12} color="#000" />
                  <span>Listen</span>
                </button>
              )
            )}
            {message.sources && message.sources.length > 0 && (
              <button
                onClick={() => setShowSources(s => !s)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11.5, fontWeight: 800,
                  background: "#FFFBF0", border: "2px solid #000", cursor: "pointer",
                  padding: "3px 8px", borderRadius: 4, boxShadow: "2px 2px 0px 0px #000",
                  transition: "transform 0.1s, box-shadow 0.1s",
                  color: "#000",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(1px,1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0px 0px #000"; }}
              >
                <FileText size={12} />
                {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
                {showSources ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>
        )}

        {/* Sources */}
        <AnimatePresence>
          {showSources && message.sources && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="w-full space-y-2 overflow-hidden"
            >
              {message.sources.map((src, i) => (
                <div key={i} style={{ background: "#FFFBF0", borderRadius: 4, padding: "10px 14px", border: "2px solid #000", boxShadow: "3px 3px 0px 0px #000" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#000" }}>
                      Source {i + 1}{src.page ? ` · Page ${src.page}` : ""}
                    </span>
                    {src.score != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#000",
                        background: "#FFD93D", border: "1.5px solid #000",
                        padding: "1px 6px", borderRadius: 4,
                      }}>
                        {(src.score * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontWeight: 500 }}>
                    {src.content}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <span style={{ fontSize: 10.5, color: "#888", paddingLeft: 2, fontWeight: 600 }}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}
