"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { blobToWavBase64, pickRecorderMimeType } from "@/lib/audio";
import { toast } from "@/components/Toaster";

export type ParsedExpense = {
  amount: number;
  category: string;
  item: string;
  description: string;
  transcript: string;
};

type State = "idle" | "recording" | "processing";

export function VoiceRecorder({
  onParsed,
}: {
  onParsed: (parsed: ParsedExpense) => void;
}) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleStop;

      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error(err);
      toast(
        "Couldn't access the microphone. Check permissions and try again.",
        "error"
      );
      cleanupStream();
    }
  }

  function stopRecording() {
    if (state !== "recording") return;
    stopTimer();
    setState("processing");
    recorderRef.current?.stop();
  }

  async function handleStop() {
    cleanupStream();
    try {
      const blob = new Blob(chunksRef.current, {
        type: recorderRef.current?.mimeType || "audio/webm",
      });
      if (blob.size === 0) {
        toast("No audio captured. Please try again.", "error");
        setState("idle");
        return;
      }

      const audioBase64 = await blobToWavBase64(blob);

      const res = await fetch("/api/parse-expense", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audioBase64, mimeType: "audio/wav" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Failed to parse expense.", "error");
        setState("idle");
        return;
      }

      onParsed(data as ParsedExpense);
      setState("idle");
    } catch (err) {
      console.error(err);
      toast("Something went wrong processing the audio.", "error");
      setState("idle");
    }
  }

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-70 ${
          isRecording
            ? "bg-red-600"
            : isProcessing
            ? "bg-slate-700"
            : "bg-indigo-600 hover:bg-indigo-500"
        }`}
        aria-label={isRecording ? "Stop recording" : "Record expense"}
      >
        {isRecording && (
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
        )}
        {isProcessing ? (
          <Loader2 className="h-10 w-10 animate-spin" />
        ) : isRecording ? (
          <Square className="h-9 w-9 fill-current" />
        ) : (
          <Mic className="h-12 w-12" />
        )}
      </button>

      <p className="h-5 text-sm text-slate-400">
        {isRecording
          ? `Listening… ${seconds}s · tap to stop`
          : isProcessing
          ? "Analyzing your expense…"
          : "Tap and say your expense"}
      </p>
    </div>
  );
}
