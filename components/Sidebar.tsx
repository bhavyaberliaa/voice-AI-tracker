"use client";

import { usePathname, useRouter } from "next/navigation";
import { Users, Calendar, Rss, Settings } from "lucide-react";

const navItems = [
  { label: "Contacts", icon: Users, href: "/" },
  { label: "Follow-ups", icon: Calendar, href: "/follow-ups" },
  { label: "Granola Sync", icon: Rss, href: "/granola" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <button
              key={label}
              onClick={() => router.push(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "text-stone-900 bg-stone-100"
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
              }`}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2 : 1.5}
                style={isActive ? { color: "#D85A30" } : {}}
              />
              {label}
              {label === "Granola Sync" && (
                <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                  Live
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer branding */}
      <div className="px-5 py-4 border-t border-stone-100">
        <p className="text-xs text-stone-400">
          Powered by AssemblyAI · Claude · Notion
        </p>
      </div>
    </aside>
  );
}
