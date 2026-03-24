"use client";

import { Contact } from "@/lib/types";
import { getFollowUpUrgency, formatFollowUpDate, getInitials, getAvatarColor } from "@/lib/utils";
import { Calendar } from "lucide-react";

const urgencyStyles: Record<string, { badge: string; dot: string }> = {
  overdue: {
    badge: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-400",
  },
  soon: {
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    dot: "bg-amber-400",
  },
  upcoming: {
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    dot: "bg-emerald-400",
  },
};

export default function ContactCard({ contact }: { contact: Contact }) {
  const urgency = getFollowUpUrgency(contact.followUpDate);
  const styles = urgencyStyles[urgency];
  const initials = getInitials(contact.name);
  const avatarColor = getAvatarColor(contact.name);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-4 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor}`}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 leading-tight">{contact.name}</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {contact.role} · {contact.company}
            </p>
          </div>
        </div>

        {/* Follow-up badge */}
        <div
          className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border shrink-0 ${styles.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
          <Calendar size={11} />
          {formatFollowUpDate(contact.followUpDate)}
        </div>
      </div>

      {/* Topics */}
      <div className="flex flex-wrap gap-1.5">
        {contact.topics.map((topic) => (
          <span
            key={topic}
            className="text-xs text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md"
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Key note */}
      <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 border-t border-stone-100 pt-3">
        {contact.keyNote}
      </p>
    </div>
  );
}
