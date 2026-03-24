"use client";

import { useState } from "react";
import { Users, Calendar, Rss, Settings, BarChart2 } from "lucide-react";
import { sampleContacts } from "@/lib/sample-data";

const navItems = [
  { label: "Contacts", icon: Users, active: true },
  { label: "Follow-ups", icon: Calendar, active: false },
  { label: "Granola Sync", icon: Rss, active: false },
  { label: "Settings", icon: Settings, active: false },
];

export default function Sidebar() {
  const [activeNav, setActiveNav] = useState("Contacts");

  const totalContacts = sampleContacts.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUpsDue = sampleContacts.filter((c) => {
    const d = new Date(c.followUpDate);
    d.setHours(0, 0, 0, 0);
    return d <= new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
  }).length;

  const thisWeek = sampleContacts.filter((c) => {
    const created = new Date(c.createdAt);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return created >= weekAgo;
  }).length;

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-stone-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-stone-100">
        <span className="font-serif text-2xl tracking-tight text-stone-900">
          afterchat<span style={{ color: "#D85A30" }}>.</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setActiveNav(label)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeNav === label
                ? "text-stone-900 bg-stone-100"
                : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
            }`}
          >
            <Icon
              size={16}
              strokeWidth={activeNav === label ? 2 : 1.5}
              style={activeNav === label ? { color: "#D85A30" } : {}}
            />
            {label}
          </button>
        ))}
      </nav>

      {/* Stats */}
      <div className="px-4 py-5 border-t border-stone-100 space-y-3">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider px-1">Overview</p>
        <StatRow label="Total contacts" value={totalContacts} />
        <StatRow label="Follow-ups due" value={followUpsDue} highlight />
        <StatRow label="Chats this week" value={thisWeek} />
      </div>
    </aside>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-xs text-stone-500">{label}</span>
      <span
        className={`text-xs font-semibold tabular-nums ${
          highlight ? "text-[#D85A30]" : "text-stone-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
