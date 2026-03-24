import { FollowUpUrgency } from "./types";

export function getFollowUpUrgency(dateStr: string): FollowUpUrgency {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(dateStr);
  followUp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((followUp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 5) return "soon";
  return "upcoming";
}

export function formatFollowUpDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  const colors = [
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
