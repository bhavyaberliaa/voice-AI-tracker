"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Rss, CheckCircle, AlertCircle, Loader2, Terminal } from "lucide-react";

type NotionStatus =
  | { state: "loading" }
  | { state: "ok"; title: string; columns: string[] }
  | { state: "error"; error: string };

export default function GranolaPage() {
  const [notion, setNotion] = useState<NotionStatus>({ state: "loading" });

  useEffect(() => {
    fetch("/api/notion-test")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setNotion({ state: "ok", title: data.title, columns: data.columns });
        } else {
          setNotion({ state: "error", error: data.error ?? "Unknown error" });
        }
      })
      .catch((err) => setNotion({ state: "error", error: String(err) }));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F7F4]">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-8 py-4 shrink-0">
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
                Import coffee chats from Granola via Claude Code
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Notion connection status */}
          <div
            className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${
              notion.state === "loading"
                ? "border-stone-200 bg-white"
                : notion.state === "ok"
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            {notion.state === "loading" && (
              <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-stone-400" />
            )}
            {notion.state === "ok" && (
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            )}
            {notion.state === "error" && (
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
            )}
            <div className="text-sm">
              {notion.state === "loading" && (
                <p className="text-stone-500">Checking Notion connection…</p>
              )}
              {notion.state === "ok" && (
                <>
                  <p className="font-medium text-emerald-700">
                    Connected to &ldquo;{notion.title}&rdquo;
                  </p>
                  <p className="text-emerald-600 mt-0.5 text-xs">
                    {notion.columns.length} columns: {notion.columns.join(", ")}
                  </p>
                </>
              )}
              {notion.state === "error" && (
                <>
                  <p className="font-medium text-red-700">Notion connection failed</p>
                  <p className="text-red-600 mt-0.5 text-xs font-mono">{notion.error}</p>
                </>
              )}
            </div>
          </div>

          {/* How Granola sync works */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={16} className="text-stone-500" />
              <h2 className="font-medium text-stone-800">How Granola sync works</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-4">
              Granola sync runs directly inside <strong>Claude Code</strong> — not from the web
              app. This is because reading Granola meeting transcripts requires MCP tool access
              that only Claude Code has.
            </p>
            <ol className="text-sm text-stone-600 space-y-2 list-decimal list-inside">
              <li>Open Claude Code in your terminal in this project directory.</li>
              <li>
                Type <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 font-mono text-xs">/sync-granola</code> and press Enter.
              </li>
              <li>
                Claude will fetch recent meetings from Granola, extract contact info with AI,
                check for duplicates, and write each new contact to Notion.
              </li>
              <li>Come back here to see the saved contacts on the dashboard.</li>
            </ol>
          </div>

          {/* Voice note reminder */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Tip:</strong> You can also add contacts directly from voice notes using the
              microphone button on any page — no Granola required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
