"use client";

import { useCallback, useRef, useState } from "react";

export const TTS_VOICES = [
  { id: "nova",    label: "Nova"    },
  { id: "shimmer", label: "Shimmer" },
  { id: "alloy",   label: "Alloy"   },
  { id: "echo",    label: "Echo"    },
  { id: "fable",   label: "Fable"   },
  { id: "onyx",    label: "Onyx"    },
] as const;

export type TTSVoice = (typeof TTS_VOICES)[number]["id"];

interface UseTextToSpeechReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isGenerating: boolean;
  isSpeaking: boolean;
  elapsedSeconds: number;
  voice: TTSVoice;
  setVoice: (v: TTSVoice) => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [isSpeaking,     setIsSpeaking]     = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [voice,          setVoice]          = useState<TTSVoice>("nova");

  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef  = useRef<string | null>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const _stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setElapsedSeconds(0);
  };

  const _cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const stop = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    _stopTimer();
    _cleanupAudio();
    setIsGenerating(false);
    setIsSpeaking(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Cancel any in-flight request or playback
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      _stopTimer();
      _cleanupAudio();
      setIsSpeaking(false);

      setIsGenerating(true);
      setElapsedSeconds(0);

      // Elapsed timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice }),
          signal: controller.signal,
        });

        _stopTimer();
        setIsGenerating(false);

        if (controller.signal.aborted) return;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.detail ?? `TTS request failed (${res.status})`);
        }

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        setIsSpeaking(true);

        audio.onended = () => { setIsSpeaking(false); _cleanupAudio(); };
        audio.onerror = () => { setIsSpeaking(false); _cleanupAudio(); };

        await audio.play();
      } catch (err: unknown) {
        _stopTimer();
        setIsGenerating(false);
        setIsSpeaking(false);
        _cleanupAudio();
        abortRef.current = null;
        if (err instanceof Error && err.name !== "AbortError") throw err;
      }
    },
    [voice] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { speak, stop, isGenerating, isSpeaking, elapsedSeconds, voice, setVoice };
}
