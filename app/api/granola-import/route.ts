import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * POST /api/granola-import
 *
 * Imports a Granola meeting as a contact.
 * Accepts meeting metadata + transcript, runs Claude extraction, saves to Notion.
 *
 * Body: {
 *   meetingId: string,
 *   title: string,
 *   transcript: string,
 *   participants: string[],   // ["Name <email>", ...]
 *   date: string              // ISO date string
 * }
 *
 * Returns: { contact: Contact }
 */
export async function POST(req: NextRequest) {
  try {
    const { meetingId, title, transcript, participants, date } = await req.json();

    if (!transcript || !title) {
      return Response.json({ error: "title and transcript are required" }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const notionToken = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!anthropicKey) return Response.json({ error: "Anthropic key not configured" }, { status: 500 });
    if (!notionToken || !databaseId) return Response.json({ error: "Notion not configured" }, { status: 500 });

    // Filter out the note-creator (Bhavya) from participants list
    const others = (participants as string[] ?? [])
      .filter((p) => !p.toLowerCase().includes("bhavya"))
      .join(", ");

    // Extract contact info with Claude
    const client = new Anthropic({ apiKey: anthropicKey });
    const today = new Date().toISOString().split("T")[0];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a networking assistant. Extract structured contact info from this Granola meeting transcript.

Meeting title: ${title}
Meeting date: ${date ?? today}
Other participants: ${others || "unknown"}
Today's date: ${today}

If a follow-up is mentioned (e.g. "in a week", "next month"), calculate the actual date from the meeting date.
If no follow-up is mentioned, default to 1 week from the meeting date.

Return ONLY valid JSON:
{
  "name": "Full Name",
  "company": "Company Name",
  "role": "Job Title",
  "topics": ["Topic 1", "Topic 2"],
  "followUpDate": "YYYY-MM-DD",
  "keyNote": "One to two sentence summary of the most important takeaway and next action."
}

Transcript:
"""
${transcript}
"""`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const extracted = JSON.parse(jsonStr);

    // Save to Notion
    // Role includes company inline: "Title at Company"
    const roleValue = extracted.role && extracted.company
      ? `${extracted.role} at ${extracted.company}`
      : extracted.role || extracted.company || "";

    const notionBody: Record<string, unknown> = {
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: extracted.name } }] },
        Role: { rich_text: [{ text: { content: roleValue } }] },
        "Follow Up": { date: { start: extracted.followUpDate } },
        "Key Note": { rich_text: [{ text: { content: extracted.keyNote || "" } }] },
        "Next steps": { rich_text: [{ text: { content: (extracted.topics || []).join(", ") } }] },
      },
      children: [
        {
          object: "block",
          type: "heading_3",
          heading_3: { rich_text: [{ text: { content: "Granola Meeting Transcript" } }] },
        },
        {
          object: "block",
          type: "callout",
          callout: {
            rich_text: [{ text: { content: `Meeting: ${title}\nDate: ${date ?? today}\nMeeting ID: ${meetingId ?? "n/a"}` } }],
            icon: { emoji: "☕" },
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ text: { content: transcript.slice(0, 2000) } }] },
        },
      ],
    };

    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(notionBody),
    });

    if (!notionRes.ok) {
      const notionErr = await notionRes.json();
      throw new Error(`Notion error: ${JSON.stringify(notionErr)}`);
    }

    const notionPage = await notionRes.json();

    const contact = {
      id: (notionPage as { id: string }).id,
      ...extracted,
      source: "granola",
      transcript: transcript.slice(0, 500),
      createdAt: new Date().toISOString(),
    };

    return Response.json({ contact });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/granola-import]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
