"use client";

import { Mic, MicOff } from "lucide-react";
import { TTS_VOICES, type TTSVoice } from "@/hooks/useTextToSpeech";

interface Props {
  isListening: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  voice: TTSVoice;
  onVoiceChange: (v: TTSVoice) => void;
}

export default function AudioControls({
  isListening, isSupported, onStart, onStop, disabled, voice, onVoiceChange,
}: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      {/* Voice picker */}
      <select
        value={voice}
        onChange={e => onVoiceChange(e.target.value as TTSVoice)}
        disabled={disabled}
        title="TTS voice"
        style={{
          fontSize: 11.5, fontWeight: 700,
          color: "#000", background: "#FFFBF0",
          border: "2px solid #000", borderRadius: 4,
          padding: "5px 7px",
          boxShadow: "2px 2px 0px 0px #000",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none", fontFamily: "inherit",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {TTS_VOICES.map(v => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>

      {/* Mic button */}
      <button
        onClick={isListening ? onStop : onStart}
        disabled={!isSupported || (disabled && !isListening)}
        title={!isSupported ? "Speech recognition not supported" : isListening ? "Stop listening" : "Voice input"}
        className={isListening ? "mic-active" : ""}
        style={{
          width: 38, height: 38, borderRadius: 4, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "3px solid #000",
          cursor: !isSupported || (disabled && !isListening) ? "not-allowed" : "pointer",
          background: isListening ? "#FF6B6B" : "#FFFBF0",
          boxShadow: isListening ? "4px 4px 0px 0px #000" : "3px 3px 0px 0px #000",
          transition: "transform 0.1s, box-shadow 0.1s, background 0.15s",
          opacity: !isSupported || (disabled && !isListening) ? 0.45 : 1,
        }}
        onMouseEnter={e => {
          if (!(!isSupported || (disabled && !isListening))) {
            (e.currentTarget as HTMLElement).style.transform = "translate(2px, 2px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "1px 1px 0px 0px #000";
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = "";
          (e.currentTarget as HTMLElement).style.boxShadow = isListening ? "4px 4px 0px 0px #000" : "3px 3px 0px 0px #000";
        }}
      >
        {isListening
          ? <MicOff size={15} color="#fff" />
          : <Mic    size={15} color="#000" />}
      </button>
    </div>
  );
}
