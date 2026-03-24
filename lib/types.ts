export type FollowUpUrgency = "overdue" | "soon" | "upcoming";

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  topics: string[];
  followUpDate: string; // ISO date string
  keyNote: string;
  transcript?: string;
  createdAt: string;
}
