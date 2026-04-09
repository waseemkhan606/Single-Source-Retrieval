"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { SuggestionChip } from "@/types";

const STATIC_START: SuggestionChip[] = [
  { label: "Summarise", query: "Give me a concise summary of this document." },
];

const STATIC_END: SuggestionChip[] = [
  { label: "Quiz me", query: "Give me 5 multiple choice questions to test my understanding of this document. For each question provide exactly 4 options labeled A), B), C), D) on separate lines, then end with 'Correct: [letter]' on its own line." },
];

const FALLBACK_DYNAMIC: SuggestionChip[] = [
  { label: "Key concepts",     query: "What are the most important concepts in this document?" },
  { label: "Main conclusions", query: "What are the main conclusions or findings?" },
  { label: "Explain simply",   query: "Explain the most complex part in simple terms." },
  { label: "Practical uses",   query: "What are the real-world applications of this content?" },
];

// Loud flat chip colors cycling
const CHIP_COLORS = ["#FFD93D", "#6BCB77", "#4D96FF", "#FF6B6B", "#C77DFF", "#FF9A3C"];

interface Props {
  onSelect: (q: string) => void;
  disabled?: boolean;
  dynamicChips?: SuggestionChip[];
  loadingChips?: boolean;
}

export default function SuggestionChips({ onSelect, disabled, dynamicChips, loadingChips }: Props) {
  const middle = dynamicChips && dynamicChips.length > 0 ? dynamicChips : FALLBACK_DYNAMIC;
  const chips  = [...STATIC_START, ...middle, ...STATIC_END];

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-2">
      <div className="text-center space-y-2">
        <h2 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#000" }}>
          What would you like to know?
        </h2>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>
          {disabled
            ? "Upload a document above to begin."
            : loadingChips
              ? "Generating suggestions from your document…"
              : "Select a prompt or type your own question below."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {chips.map((chip, i) => {
          const bg = CHIP_COLORS[i % CHIP_COLORS.length];
          return (
            <motion.button
              key={chip.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => !disabled && !loadingChips && onSelect(chip.query)}
              disabled={disabled || loadingChips}
              style={{
                background: bg,
                borderRadius: 4,
                border: "3px solid #000",
                boxShadow: "4px 4px 0px 0px #000",
                padding: "14px",
                textAlign: "left",
                cursor: disabled || loadingChips ? "not-allowed" : "pointer",
                opacity: disabled || loadingChips ? 0.4 : 1,
                transition: "transform 0.1s, box-shadow 0.1s",
              }}
              whileHover={disabled || loadingChips ? {} : { x: 2, y: 2, boxShadow: "2px 2px 0px 0px #000" }}
              whileTap={disabled || loadingChips ? {} : { x: 4, y: 4, boxShadow: "0px 0px 0px 0px #000" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {loadingChips && i >= 1 && i < chips.length - 1 && (
                  <Loader2 size={10} color="#000" className="animate-spin" />
                )}
                <p style={{ fontSize: "13.5px", fontWeight: 900, color: "#000" }}>
                  {chip.label}
                </p>
              </div>
              <p style={{ fontSize: "11.5px", fontWeight: 600, color: "rgba(0,0,0,0.65)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {chip.query.length > 80 ? chip.query.slice(0, 80) + "…" : chip.query}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
