"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Contact } from "@/lib/types";

interface RecorderModalProps {
  onClose: () => void;
  onContactSaved?: (contact: Contact) => void;
}

type Stage =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "extracting"
  | "done"
  | "saving"
  | "saved"
  | "error";

interface ExtractedContact {
  name: string;
  company: string;
  role: string;
  topics: string[];
  followUpDate: string;
  keyNote: string;
}

export default function RecorderModal({ onClose, onContactSaved }: RecorderModalProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [extracted, setExtracted] = useState<ExtractedContact | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [timer, setTimer] = useState(0);
  const [waveValues, setWaveValues] = useState<number[]>(Array(32).fill(4));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) clearInterval(waveRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // -------------------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------------------

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setStage("recording");
      setTimer(0);

      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
      waveRef.current = setInterval(() => {
        setWaveValues(Array(32).fill(0).map(() => Math.random() * 28 + 4));
      }, 80);
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone permissions and try again.");
      setStage("error");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) clearInterval(waveRef.current);
    setWaveValues(Array(32).fill(4));

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    mediaRecorder.onstop = async () => {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      const mimeType = getSupportedMimeType();
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      await processAudio(audioBlob, mimeType);
    };

    mediaRecorder.stop();
    setStage("uploading");
  };

  // -------------------------------------------------------------------------
  // Processing pipeline: upload → transcribe → extract
  // -------------------------------------------------------------------------

  const processAudio = async (audioBlob: Blob, mimeType: string) => {
    try {
      // Step 1: Upload + submit transcription job
      const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
      const formData = new FormData();
      formData.append("audio", audioBlob, `recording.${ext}`);

      const submitRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!submitRes.ok) {
        const e = await submitRes.json();
        throw new Error(e.error ?? "Upload failed");
      }
      const { transcriptId } = await submitRes.json();

      // Step 2: Poll for completion
      setStage("transcribing");
      const text = await pollTranscript(transcriptId);
      setTranscript(text);

      // Step 3: Extract contact info with Claude
      setStage("extracting");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      if (!extractRes.ok) {
        const e = await extractRes.json();
        throw new Error(e.error ?? "Extraction failed");
      }
      const data = await extractRes.json();
      setExtracted(data);
      setStage("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStage("error");
    }
  };

  const pollTranscript = async (transcriptId: string): Promise<string> => {
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/transcribe/${transcriptId}`);
      const data = await res.json();

      if (data.status === "completed") return data.transcript ?? "";
      if (data.status === "error") throw new Error(`Transcription error: ${data.error}`);
      // status is "queued" or "processing" — keep polling
    }
    throw new Error("Transcription timed out. Please try again.");
  };

  // -------------------------------------------------------------------------
  // Save to Notion
  // -------------------------------------------------------------------------

  const saveContact = async () => {
    if (!extracted) return;
    setStage("saving");
    try {
      const res = await fetch("/api/save-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extracted, transcript }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Save failed");
      }
      const { notionPageId } = await res.json();

      onContactSaved?.({
        id: notionPageId,
        ...extracted,
        source: "voice",
        transcript,
        createdAt: new Date().toISOString(),
      });

      setStage("saved");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save to Notion.");
      setStage("error");
    }
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const stageLabel: Partial<Record<Stage, string>> = {
    uploading: "Uploading audio…",
    transcribing: "Transcribing with AssemblyAI…",
    extracting: "Extracting contact info…",
    saving: "Saving to Notion…",
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={stage === "idle" || stage === "saved" || stage === "error" ? onClose : undefined}
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
        <div className="px-6 py-6 space-y-5">
          {/* Waveform */}
          {(stage === "idle" || stage === "recording") && (
            <div className="bg-stone-50 rounded-xl h-20 flex items-center justify-center px-4 gap-0.5 overflow-hidden">
              {waveValues.map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${h}px`,
                    backgroundColor: stage === "recording" ? "#D85A30" : "#D6D3CE",
                  }}
                />
              ))}
            </div>
          )}

          {/* Timer */}
          {stage === "recording" && (
            <div className="text-center">
              <span className="font-mono text-2xl text-stone-700 tabular-nums">
                {formatTime(timer)}
              </span>
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#D85A30]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D85A30] animate-pulse" />
                Recording
              </span>
            </div>
          )}

          {/* Processing stages */}
          {(stage === "uploading" || stage === "transcribing" || stage === "extracting" || stage === "saving") && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 size={32} className="animate-spin text-[#D85A30]" />
              <p className="text-sm text-stone-600">{stageLabel[stage]}</p>
              {stage === "transcribing" && (
                <p className="text-xs text-stone-400">This usually takes 15–60 seconds</p>
              )}
            </div>
          )}

          {/* Error */}
          {stage === "error" && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* Saved */}
          {stage === "saved" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={36} className="text-emerald-500" />
              <div>
                <p className="font-medium text-stone-800">Contact saved!</p>
                <p className="text-xs text-stone-400 mt-1">
                  {extracted?.name} has been added to your Notion database
                </p>
              </div>
            </div>
          )}

          {/* Transcript */}
          {(stage === "extracting" || stage === "done") && transcript && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                Transcript
              </p>
              <div className="bg-stone-50 rounded-xl p-4 max-h-32 overflow-y-auto">
                <p className="font-mono text-xs text-stone-700 leading-relaxed">{transcript}</p>
              </div>
            </div>
          )}

          {/* Extracted info */}
          {stage === "done" && extracted && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                Extracted Info
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Name", value: extracted.name },
                  { label: "Company", value: extracted.company },
                  { label: "Role", value: extracted.role },
                  { label: "Topics", value: extracted.topics.slice(0, 3).join(", ") },
                  {
                    label: "Follow-up",
                    value: new Date(extracted.followUpDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-stone-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-stone-400">{label}</p>
                    <p className="text-xs font-medium text-stone-800 mt-0.5 truncate">{value || "—"}</p>
                  </div>
                ))}
              </div>
              {extracted.keyNote && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-700 leading-relaxed">{extracted.keyNote}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            {stage === "saved" ? "Close" : "Cancel"}
          </button>

          <div className="flex items-center gap-3">
            {stage === "idle" && (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#D85A30" }}
              >
                <Mic size={15} />
                Start Recording
              </button>
            )}

            {stage === "recording" && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
              >
                <Square size={13} fill="white" />
                Stop
              </button>
            )}

            {stage === "error" && (
              <button
                onClick={() => { setStage("idle"); setErrorMsg(""); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: "#D85A30" }}
              >
                Try Again
              </button>
            )}

            {stage === "done" && (
              <button
                onClick={saveContact}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#D85A30" }}
              >
                Save to Notion
              </button>
            )}

            {stage === "saved" && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle size={14} />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Pick the best supported audio format for the current browser
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}
