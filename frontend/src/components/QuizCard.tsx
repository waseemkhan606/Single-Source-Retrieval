"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Trophy } from "lucide-react";
import type { QuizQuestion } from "@/types";

const LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS = ["#FFD93D", "#6BCB77", "#4D96FF", "#C77DFF"];

interface Props {
  questions: QuizQuestion[];
}

export default function QuizCard({ questions }: Props) {
  const [current,   setCurrent]   = useState(0);
  const [selected,  setSelected]  = useState<number[]>(Array(questions.length).fill(-1));
  const [done,      setDone]      = useState(false);

  const q        = questions[current];
  const choice   = selected[current];
  const answered = choice !== -1;
  const score    = selected.filter((s, i) => s === questions[i].correctIndex).length;

  const pick = (idx: number) => {
    if (answered) return;
    setSelected(prev => { const c = [...prev]; c[current] = idx; return c; });
  };

  const next = () => {
    if (current < questions.length - 1) setCurrent(c => c + 1);
    else setDone(true);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const resultBg = pct >= 80 ? "#6BCB77" : pct >= 50 ? "#FFD93D" : "#FF6B6B";
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: "#FFFFFF", borderRadius: 4, padding: "20px 18px", border: "3px solid #000", boxShadow: "5px 5px 0px 0px #000" }}
      >
        {/* Score */}
        <div style={{
          textAlign: "center", marginBottom: 20,
          background: resultBg, border: "3px solid #000", borderRadius: 4,
          padding: "16px", boxShadow: "4px 4px 0px 0px #000",
        }}>
          <Trophy size={30} color="#000" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: 16, fontWeight: 900, color: "#000" }}>Quiz Complete!</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#000", marginTop: 4 }}>
            {score} / {questions.length} correct &nbsp;({pct}%)
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions.map((qu, i) => {
            const s       = selected[i];
            const correct = s === qu.correctIndex;
            return (
              <div key={i} style={{
                background: correct ? "#6BCB77" : "#FF6B6B",
                borderRadius: 4, padding: "10px 14px",
                border: "2px solid #000", boxShadow: "3px 3px 0px 0px #000",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {correct
                    ? <CheckCircle2 size={14} color="#000" style={{ marginTop: 2, flexShrink: 0 }} />
                    : <XCircle     size={14} color="#000" style={{ marginTop: 2, flexShrink: 0 }} />}
                  <div>
                    <p style={{ fontSize: 12.5, fontWeight: 800, color: "#000", marginBottom: 4 }}>
                      Q{i + 1}. {qu.question}
                    </p>
                    {!correct && s !== -1 && (
                      <p style={{ fontSize: 11.5, fontWeight: 700, color: "#000", opacity: 0.75 }}>
                        Your answer: {LABELS[s]}) {qu.options[s]}
                      </p>
                    )}
                    <p style={{ fontSize: 11.5, fontWeight: 800, color: "#000" }}>
                      ✓ {LABELS[qu.correctIndex]}) {qu.options[qu.correctIndex]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 4, padding: "18px 16px", border: "3px solid #000", boxShadow: "5px 5px 0px 0px #000" }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{
          fontSize: 11.5, fontWeight: 800, color: "#000",
          background: "#4D96FF", border: "2px solid #000", borderRadius: 4,
          padding: "2px 8px", boxShadow: "2px 2px 0px 0px #000",
        }}>
          {current + 1} / {questions.length}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {questions.map((_, i) => {
            const s = selected[i];
            const bg = i < current
              ? (s === questions[i].correctIndex ? "#6BCB77" : "#FF6B6B")
              : i === current ? "#FFD93D" : "#e0e0e0";
            return (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: 0,
                background: bg, border: "2px solid #000",
              }} />
            );
          })}
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.p
          key={current}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          style={{ fontSize: 14, fontWeight: 800, color: "#000", marginBottom: 14, lineHeight: 1.55 }}
        >
          {q.question}
        </motion.p>
      </AnimatePresence>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt, idx) => {
          const isSelected = choice === idx;
          const isCorrect  = idx === q.correctIndex;

          let bg = "#FFFBF0";
          let textColor = "#000";

          if (answered) {
            if (isCorrect)         { bg = "#6BCB77"; }
            else if (isSelected)   { bg = "#FF6B6B"; }
            else                   { bg = "#F5F5F0"; }
          } else if (isSelected) {
            bg = OPTION_COLORS[idx];
          }

          return (
            <button
              key={idx}
              onClick={() => pick(idx)}
              disabled={answered}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: bg, border: "2px solid #000", borderRadius: 4,
                padding: "10px 14px", textAlign: "left",
                cursor: answered ? "default" : "pointer",
                boxShadow: answered ? "none" : "3px 3px 0px 0px #000",
                transition: "transform 0.1s, box-shadow 0.1s",
              }}
              onMouseEnter={e => {
                if (!answered) {
                  (e.currentTarget as HTMLElement).style.transform = "translate(2px, 2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = answered ? "none" : "3px 3px 0px 0px #000";
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11.5, fontWeight: 900,
                background: answered && isCorrect ? "#000"
                  : answered && isSelected ? "#000"
                  : "#fff",
                color: answered && (isCorrect || isSelected) ? "#fff" : "#000",
                border: "2px solid #000",
              }}>
                {LABELS[idx]}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1.45, flex: 1 }}>{opt}</span>
              {answered && isCorrect  && <CheckCircle2 size={14} color="#000" style={{ flexShrink: 0 }} />}
              {answered && isSelected && !isCorrect && <XCircle size={14} color="#000" style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}
          >
            <button
              onClick={next}
              className="btn btn-blue"
              style={{ padding: "8px 18px", fontSize: 13 }}
            >
              {current < questions.length - 1 ? "Next →" : "See Results →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
