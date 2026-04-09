"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, BookMarked } from "lucide-react";

interface Topic { title: string; description: string; }

interface Props {
  topics: Topic[];
  loading: boolean;
  onSelect: (topic: string) => void;
}

export default function TopicsSidebar({ topics, loading, onSelect }: Props) {
  return (
    <div className="clay" style={{ padding: 18, flex: 1, minHeight: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, borderBottom: "2px solid #000", paddingBottom: 10 }}>
        <div style={{ background: "#4D96FF", border: "2px solid #000", borderRadius: 4, padding: "3px 5px", boxShadow: "2px 2px 0px 0px #000" }}>
          <BookMarked size={10} color="#fff" />
        </div>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>
          Topics
        </p>
        {loading && <Loader2 size={11} color="#000" className="animate-spin" style={{ marginLeft: "auto" }} />}
      </div>

      <AnimatePresence mode="wait">
        {loading && topics.length === 0 ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[80, 65, 90, 55, 75].map((w, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ height: 11, borderRadius: 0, background: "#e0e0e0", width: `${w}%`, marginBottom: 4, border: "1px solid #ccc" }} />
                <div style={{ height: 9, borderRadius: 0, background: "#F5F5F0", width: `${w - 15}%`, border: "1px solid #ccc" }} />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="topics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topics.map((topic, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelect(`Tell me about "${topic.title}" from this document.`)}
                style={{
                  background: "#FFFBF0", border: "2px solid #000",
                  borderRadius: 4, textAlign: "left",
                  padding: "8px 10px", cursor: "pointer",
                  boxShadow: "2px 2px 0px 0px #000",
                  transition: "transform 0.1s, box-shadow 0.1s",
                }}
                whileHover={{ x: 2, y: 2, boxShadow: "0px 0px 0px 0px #000" }}
                whileTap={{ x: 3, y: 3, boxShadow: "none" }}
              >
                <p style={{ fontSize: 12.5, fontWeight: 800, color: "#000", marginBottom: 2, lineHeight: 1.35 }}>
                  {topic.title}
                </p>
                {topic.description && (
                  <p style={{ fontSize: 11, fontWeight: 500, color: "#555", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {topic.description}
                  </p>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
