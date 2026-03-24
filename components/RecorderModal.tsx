"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Loader2 } from "lucide-react";

interface RecorderModalProps {
  onClose: () => void;
}

type RecordingState = "idle" | "recording" | "processing" | "done";

export default function RecorderModal({ onClose }: RecorderModalProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [timer, setTimer] = useState(0);
  const [waveValues, setWaveValues] = useState<number[]>(Array(32).fill(4));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) clearInterval(waveRef.current);
    };
  }, []);

  const startRecording = () => {
    setState("recording");
    setTimer(0);

    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);

    waveRef.current = setInterval(() => {
      setWaveValues(Array(32).fill(0).map(() => Math.random() * 28 + 4));
    }, 80);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) clearInterval(waveRef.current);
    setWaveValues(Array(32).fill(4));
    setState("processing");

    // Simulate transcription delay
    setTimeout(() => {
      setTranscript(
        "Just had a great coffee chat with Sarah Chen from Sequoia Capital. She's a Principal focused on early-stage SaaS and edtech. We talked about go-to-market strategy and the importance of showing early traction before Series A. She mentioned the Sequoia Arc program might be a fit. I should follow up in about a week with my metrics deck and a warm intro ask."
      );
      setState("done");
    }, 2000);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div>
            <h2 className="font-serif text-xl text-stone-900">Record Recap</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Speak freely — we&apos;ll extract the key details
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Waveform */}
          <div className="bg-stone-50 rounded-xl h-20 flex items-center justify-center px-4 gap-0.5 overflow-hidden">
            {waveValues.map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${h}px`,
                  backgroundColor:
                    state === "recording" ? "#D85A30" : "#D6D3CE",
                  opacity: state === "recording" ? 0.8 + Math.random() * 0.2 : 1,
                }}
              />
            ))}
          </div>

          {/* Timer */}
          {(state === "recording" || state === "processing") && (
            <div className="text-center">
              <span className="font-mono text-2xl text-stone-700 tabular-nums">
                {formatTime(timer)}
              </span>
              {state === "recording" && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#D85A30]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D85A30] animate-pulse" />
                  Recording
                </span>
              )}
            </div>
          )}

          {/* Transcript */}
          {(state === "processing" || state === "done") && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                Transcript
              </p>
              <div className="bg-stone-50 rounded-xl p-4 min-h-[80px] relative">
                {state === "processing" ? (
                  <div className="flex items-center gap-2 text-stone-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Transcribing…</span>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-stone-700 leading-relaxed">{transcript}</p>
                )}
              </div>
            </div>
          )}

          {/* Extracted info preview (done state) */}
          {state === "done" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                Extracted Info
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Name", value: "Sarah Chen" },
                  { label: "Company", value: "Sequoia Capital" },
                  { label: "Topics", value: "SaaS, Edtech, GTM" },
                  { label: "Follow-up", value: "Mar 31, 2026" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-stone-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-stone-400">{label}</p>
                    <p className="text-xs font-medium text-stone-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {state === "idle" && (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#D85A30" }}
              >
                <Mic size={15} />
                Start Recording
              </button>
            )}

            {state === "recording" && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
              >
                <Square size={13} fill="white" />
                Stop
              </button>
            )}

            {state === "processing" && (
              <button
                disabled
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-stone-100 text-stone-400 cursor-not-allowed"
              >
                <Loader2 size={14} className="animate-spin" />
                Processing…
              </button>
            )}

            {state === "done" && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#D85A30" }}
              >
                Save Contact
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
