"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Search, SlidersHorizontal, RefreshCw } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ContactCard from "@/components/ContactCard";
import RecorderModal from "@/components/RecorderModal";
import { Contact } from "@/lib/types";

export default function HomePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "voice" | "granola">("all");

  const fetchContacts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleContactSaved = (contact: Contact) => {
    // Prepend new contact so it appears immediately without a full reload
    setContacts((prev) => [contact, ...prev]);
  };

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesSource =
      filterSource === "all" ||
      (filterSource === "granola" && c.source === "granola") ||
      (filterSource === "voice" && c.source !== "granola");

    return matchesSearch && matchesSource;
  });

  const granolaCount = contacts.filter((c) => c.source === "granola").length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F7F4]">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-serif text-2xl text-stone-900">Contacts</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {loading ? "Loading…" : `${contacts.length} people in your network`}
              {granolaCount > 0 && !loading && (
                <span className="ml-2 text-emerald-600">· {granolaCount} from Granola</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Source filter */}
            <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
              {(["all", "voice", "granola"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterSource(f)}
                  className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                    filterSource === f
                      ? "bg-white shadow-sm text-stone-800 font-medium"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-400 placeholder:text-stone-400 w-52 transition-colors"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchContacts(true)}
              disabled={refreshing}
              className="p-2 text-stone-400 hover:text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
              title="Refresh contacts"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>

            {/* Filter */}
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
              <SlidersHorizontal size={14} />
              Filter
            </button>

            {/* Record button */}
            <button
              onClick={() => setShowRecorder(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#D85A30" }}
            >
              <Mic size={14} />
              New Chat
            </button>
          </div>
        </header>

        {/* Contact grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
              <p className="text-sm text-stone-400">Loading your contacts from Notion…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "#FEF0EA" }}
              >
                {search ? (
                  <Search size={20} style={{ color: "#D85A30" }} />
                ) : (
                  <Mic size={20} style={{ color: "#D85A30" }} />
                )}
              </div>
              <p className="font-medium text-stone-700">
                {search ? "No contacts found" : "No contacts yet"}
              </p>
              <p className="text-sm text-stone-400 mt-1">
                {search
                  ? "Try a different search term"
                  : "Record your first coffee chat or sync from Granola"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </div>

        {/* Floating mic (mobile) */}
        <button
          onClick={() => setShowRecorder(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 md:hidden"
          style={{ backgroundColor: "#D85A30" }}
          aria-label="Record"
        >
          <Mic size={22} />
        </button>
      </main>

      {showRecorder && (
        <RecorderModal
          onClose={() => setShowRecorder(false)}
          onContactSaved={(c) => {
            handleContactSaved(c);
            setShowRecorder(false);
          }}
        />
      )}
    </div>
  );
}
