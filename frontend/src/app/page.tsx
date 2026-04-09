"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, FileSearch, Layers, BarChart2, RotateCcw } from "lucide-react";

import Background      from "@/components/ParticleBackground";
import UploadZone      from "@/components/UploadZone";
import ChatInterface   from "@/components/ChatInterface";
import TopicsSidebar   from "@/components/TopicsSidebar";
import { getTopics }   from "@/lib/api";
import type { DocumentState } from "@/types";

const EMPTY: DocumentState = { documentId: null, filename: null, description: null, chunkCount: null };

const PILL_COLORS = [
  { bg: "#FFD93D", text: "#000" },
  { bg: "#6BCB77", text: "#000" },
  { bg: "#4D96FF", text: "#fff" },
];

export default function Home() {
  const [doc,           setDoc]           = useState<DocumentState>(EMPTY);
  const [topics,        setTopics]        = useState<{ title: string; description: string }[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const sendRef  = useRef<((q: string) => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!doc.documentId) { setTopics([]); return; }
    setLoadingTopics(true);
    getTopics(doc.documentId)
      .then(t => setTopics(t))
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false));
  }, [doc.documentId]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <Background />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        background: "#FFFFFF",
        borderBottom: "3px solid #000",
        boxShadow: "0 3px 0px 0px #000",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 4,
              background: "#FFD93D",
              border: "3px solid #000",
              boxShadow: "3px 3px 0px 0px #000",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <BrainCircuit size={18} color="#000" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", color: "#000" }}>
              Learning Assistant
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { icon: FileSearch, label: "RAG Pipeline",  ...PILL_COLORS[0] },
              { icon: Layers,     label: "FAISS Index",   ...PILL_COLORS[1] },
              { icon: BarChart2,  label: "RAGAS Eval",    ...PILL_COLORS[2] },
            ].map(({ icon: Icon, label, bg, text }) => (
              <div key={label} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 4,
                fontSize: 11.5, fontWeight: 700,
                background: bg, color: text,
                border: "2px solid #000",
                boxShadow: "2px 2px 0px 0px #000",
              }}>
                <Icon size={11} color={text} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minHeight: 0, padding: "20px" }}>
        <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", display: "flex", gap: 20, height: "calc(100vh - 100px)", minHeight: 0 }}>

          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{ width: 288, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}
          >
            <UploadZone
              onUploadComplete={setDoc}
              documentState={doc}
              onReset={() => { setDoc(EMPTY); setTopics([]); }}
            />

            {doc.documentId ? (
              <TopicsSidebar
                topics={topics}
                loading={loadingTopics}
                onSelect={q => sendRef.current?.(q)}
              />
            ) : (
              <div className="clay" style={{ padding: 20, flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000", marginBottom: 16, borderBottom: "2px solid #000", paddingBottom: 8 }}>
                  How it works
                </p>
                <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { n: "1", bg: "#FFD93D", title: "Upload PDF",    body: "Chunked and embedded into a local FAISS vector index." },
                    { n: "2", bg: "#6BCB77", title: "Ask anything",  body: "Query is rewritten for retrieval, then matched semantically." },
                    { n: "3", bg: "#4D96FF", title: "Get an answer", body: "Top chunks re-ranked by a Cross-Encoder before Gemini responds." },
                  ].map(({ n, bg, title, body }) => (
                    <li key={n} style={{ display: "flex", gap: 12 }}>
                      <span style={{
                        flexShrink: 0, width: 24, height: 24, borderRadius: 4,
                        background: bg, border: "2px solid #000",
                        boxShadow: "2px 2px 0px 0px #000",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 900, color: "#000", marginTop: 1,
                      }}>{n}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#000", marginBottom: 2 }}>{title}</p>
                        <p style={{ fontSize: 12, color: "#444", lineHeight: 1.5, fontWeight: 500 }}>{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </motion.aside>

          {/* Chat panel */}
          <motion.section
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden",
              background: "#FFFFFF",
              border: "3px solid #000",
              borderRadius: 4,
              boxShadow: "6px 6px 0px 0px #000",
            }}
          >
            {/* Panel header */}
            <div style={{
              flexShrink: 0, padding: "0 20px", height: 52,
              borderBottom: "3px solid #000",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: doc.documentId ? "#FFD93D" : "#F5F5F0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 10, height: 10,
                  background: doc.documentId ? "#000" : "#999",
                  border: "2px solid #000",
                }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#000" }}>
                  {doc.documentId ? doc.filename : "No document loaded"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {doc.chunkCount && (
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: "#000",
                    background: "#fff", border: "2px solid #000",
                    padding: "2px 8px", borderRadius: 4,
                    boxShadow: "2px 2px 0px 0px #000",
                  }}>
                    {doc.chunkCount} chunks
                  </span>
                )}
                {doc.documentId && (
                  <button
                    onClick={() => resetRef.current?.()}
                    title="New chat"
                    className="btn btn-clay"
                    style={{ padding: "5px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <RotateCcw size={11} />
                    New chat
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <ChatInterface
                documentState={doc}
                sendRef={sendRef}
                resetRef={resetRef}
              />
            </div>
          </motion.section>

        </div>
      </main>
    </div>
  );
}
