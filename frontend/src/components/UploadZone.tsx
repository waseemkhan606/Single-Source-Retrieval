"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FileText, UploadCloud, CheckCircle2, X, Loader2 } from "lucide-react";
import { uploadDocument } from "@/lib/api";
import type { DocumentState } from "@/types";

interface Props {
  onUploadComplete: (s: DocumentState) => void;
  documentState: DocumentState;
  onReset: () => void;
}

export default function UploadZone({ onUploadComplete, documentState, onReset }: Props) {
  const [file, setFile]         = useState<File | null>(null);
  const [desc, setDesc]         = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUp]      = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]?.type === "application/pdf") setFile(accepted[0]);
    else toast.error("PDF files only.");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [".pdf"] },
    multiple: false, disabled: uploading || !!documentState.documentId,
  });

  const handleUpload = async () => {
    if (!file)                return toast.error("Select a PDF first.");
    if (desc.trim().length < 5) return toast.error("Description too short.");
    setUp(true);
    try {
      const res = await uploadDocument(file, desc, setProgress);
      onUploadComplete({ documentId: res.document_id, filename: file.name, description: res.description, chunkCount: res.chunk_count });
      toast.success(`Indexed ${res.chunk_count} chunks.`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setUp(false); }
  };

  /* ── Uploaded state ──────────────────────────────────────────────────── */
  if (documentState.documentId) {
    return (
      <div className="clay" style={{ padding: 18, background: "#6BCB77" }}>
        <div className="flex items-center gap-3">
          <div style={{
            background: "#fff", borderRadius: 4, width: 38, height: 38,
            border: "2px solid #000", boxShadow: "2px 2px 0px 0px #000",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <CheckCircle2 size={18} color="#000" />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 800, color: "#000" }} className="truncate">
              {documentState.filename}
            </p>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "#000", opacity: 0.7 }}>
              {documentState.chunkCount} chunks indexed
            </p>
          </div>
          <button
            onClick={onReset}
            className="btn btn-clay"
            style={{ padding: "6px 8px", flexShrink: 0 }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Upload form ─────────────────────────────────────────────────────── */
  return (
    <div className="clay" style={{ padding: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000", marginBottom: 14, borderBottom: "2px solid #000", paddingBottom: 8 }}>
        Document
      </p>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          background: isDragActive ? "#FFD93D" : "#FFFBF0",
          borderRadius: 4,
          border: isDragActive ? "3px solid #000" : "3px dashed #000",
          padding: "20px 14px",
          textAlign: "center",
          cursor: uploading || !!documentState.documentId ? "not-allowed" : "pointer",
          transition: "background 0.15s",
          marginBottom: 12,
        }}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div style={{ background: "#4D96FF", border: "2px solid #000", borderRadius: 4, padding: "6px 8px", boxShadow: "2px 2px 0px 0px #000" }}>
              <FileText size={22} color="#fff" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#000" }} className="truncate max-w-full">{file.name}</p>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "#555" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud size={26} color="#000" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>
              {isDragActive ? "Drop it!" : "Drag & drop PDF or click"}
            </p>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "#555" }}>Max 50 MB</p>
          </div>
        )}
      </div>

      {/* Description */}
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Briefly describe this document…"
        rows={2}
        maxLength={1000}
        disabled={uploading}
        className="field resize-none"
        style={{ fontFamily: "inherit", marginBottom: 12 }}
      />

      {/* Progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>Processing…</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>{progress}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 0, background: "#F5F5F0", border: "2px solid #000", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: "#FFD93D", borderRight: "2px solid #000" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={handleUpload} disabled={!file || uploading} className="btn btn-yellow w-full">
        {uploading
          ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
          : <><UploadCloud size={15} /> Upload &amp; Index</>}
      </button>
    </div>
  );
}
