"use client";

import { useState } from "react";
import { Mic, Search, SlidersHorizontal } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ContactCard from "@/components/ContactCard";
import RecorderModal from "@/components/RecorderModal";
import { sampleContacts } from "@/lib/sample-data";

export default function HomePage() {
  const [showRecorder, setShowRecorder] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = sampleContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F7F4]">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-serif text-2xl text-stone-900">Contacts</h1>
            <p className="text-xs text-stone-400 mt-0.5">{sampleContacts.length} people in your network</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-400 placeholder:text-stone-400 w-56 transition-colors"
              />
            </div>

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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "#FEF0EA" }}
              >
                <Search size={20} style={{ color: "#D85A30" }} />
              </div>
              <p className="font-medium text-stone-700">No contacts found</p>
              <p className="text-sm text-stone-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </div>

        {/* Floating record button (mobile) */}
        <button
          onClick={() => setShowRecorder(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 md:hidden"
          style={{ backgroundColor: "#D85A30" }}
          aria-label="Record"
        >
          <Mic size={22} />
        </button>
      </main>

      {showRecorder && <RecorderModal onClose={() => setShowRecorder(false)} />}
    </div>
  );
}
