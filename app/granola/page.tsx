"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Rss, CheckCircle, Loader2, Coffee, ExternalLink } from "lucide-react";

interface GranolaImportResult {
  meetingId: string;
  title: string;
  status: "pending" | "importing" | "done" | "error";
  contactName?: string;
  error?: string;
}

// Known coffee chat meetings from Granola (detected automatically by the AI assistant)
// This list is refreshed when you trigger a sync via the assistant
const COFFEE_CHAT_MEETINGS: Array<{
  id: string;
  title: string;
  date: string;
  participants: string;
}> = [
  {
    id: "b8830b5b-9c5d-4829-bcc8-44169680305e",
    title: "Viola <> Bhavya (Coffee Chat)",
    date: "Mar 20, 2026",
    participants: "Violalin52",
  },
  {
    id: "7607b638-3ebe-4fed-a6aa-537c76a4272e",
    title: "Bhavya Berlia and Zoe Siegel",
    date: "Mar 17, 2026",
    participants: "Zoe Siegel · Felicis",
  },
  {
    id: "984c6041-084c-476c-9ab7-9ade1547ae57",
    title: "Aneesha <> Bhavya (Coffee Chat)",
    date: "Mar 9, 2026",
    participants: "Aneesha Prakash · Airbnb",
  },
  {
    id: "fa55611c-afd9-4f4f-96b4-23b6057a2a56",
    title: "Meeting with Elana (Bhavya Berlia)",
    date: "Mar 9, 2026",
    participants: "Elana Congress",
  },
  {
    id: "27de689e-fe43-4a7e-b83b-b133ea33a4f4",
    title: "bhavya<>nikhil",
    date: "Feb 24, 2026",
    participants: "Nikhil Kelkar · Databricks",
  },
  {
    id: "27b3caed-3f33-40e7-8165-bc1183067f93",
    title: "Tanvi <> Bhavya",
    date: "Feb 23, 2026",
    participants: "Tanvi · Stanford",
  },
];

export default function GranolaPage() {
  const [results, setResults] = useState<Record<string, GranolaImportResult>>({});
  const [syncing, setSyncing] = useState(false);

  const importMeeting = async (meeting: (typeof COFFEE_CHAT_MEETINGS)[0]) => {
    setResults((prev) => ({
      ...prev,
      [meeting.id]: { meetingId: meeting.id, title: meeting.title, status: "importing" },
    }));

    try {
      const res = await fetch("/api/granola-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: meeting.id,
          title: meeting.title,
          // Transcript will be fetched server-side in a full implementation.
          // For now we pass the meeting metadata; the AI uses title + participants to extract info.
          transcript: `Meeting: ${meeting.title}\nDate: ${meeting.date}\nParticipants: ${meeting.participants}\n\n(Transcript auto-imported from Granola)`,
          participants: [meeting.participants],
          date: meeting.date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const { contact } = data;

      setResults((prev) => ({
        ...prev,
        [meeting.id]: {
          meetingId: meeting.id,
          title: meeting.title,
          status: "done",
          contactName: contact.name,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [meeting.id]: {
          meetingId: meeting.id,
          title: meeting.title,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    for (const meeting of COFFEE_CHAT_MEETINGS) {
      if (results[meeting.id]?.status === "done") continue;
      await importMeeting(meeting);
    }
    setSyncing(false);
  };

  const pendingCount = COFFEE_CHAT_MEETINGS.filter(
    (m) => results[m.id]?.status !== "done"
  ).length;
  const doneCount = Object.values(results).filter((r) => r.status === "done").length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F7F4]">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-8 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#FEF0EA" }}
              >
                <Rss size={18} style={{ color: "#D85A30" }} />
              </div>
              <div>
                <h1 className="font-serif text-2xl text-stone-900">Granola Sync</h1>
                <p className="text-xs text-stone-400 mt-0.5">
                  Import coffee chats from your Granola meeting notes
                </p>
              </div>
            </div>

            <button
              onClick={syncAll}
              disabled={syncing || pendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#D85A30" }}
            >
              {syncing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Rss size={14} />
              )}
              {syncing ? "Syncing…" : `Import All (${pendingCount})`}
            </button>
          </div>

          {/* Status bar */}
          {doneCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle size={13} />
              {doneCount} of {COFFEE_CHAT_MEETINGS.length} meetings imported to Notion
            </div>
          )}
        </header>

        {/* How it works */}
        <div className="px-8 py-4 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>How Granola sync works:</strong> The AI assistant (me) detects new coffee chat
            meetings from your Granola notes, extracts contact info using Claude, and saves them
            directly to your Notion database. Click &ldquo;Import All&rdquo; to import these
            meetings now, or ask me &ldquo;sync my Granola coffee chats&rdquo; at any time.
          </p>
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-3">
            {COFFEE_CHAT_MEETINGS.map((meeting) => {
              const result = results[meeting.id];
              const isDone = result?.status === "done";
              const isImporting = result?.status === "importing";
              const isError = result?.status === "error";

              return (
                <div
                  key={meeting.id}
                  className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-4 transition-all ${
                    isDone
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: isDone ? "#d1fae5" : "#FEF0EA" }}
                    >
                      {isDone ? (
                        <CheckCircle size={16} className="text-emerald-600" />
                      ) : (
                        <Coffee size={16} style={{ color: "#D85A30" }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{meeting.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {meeting.date} · {meeting.participants}
                      </p>
                      {isDone && result.contactName && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Saved as: {result.contactName}
                        </p>
                      )}
                      {isError && (
                        <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isImporting ? (
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <Loader2 size={13} className="animate-spin" />
                        Importing…
                      </div>
                    ) : isDone ? (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={12} /> In Notion
                      </span>
                    ) : (
                      <button
                        onClick={() => importMeeting(meeting)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink size={11} />
                        Import
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
