import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { saveContactToNotion } from "@/lib/notion-save";

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

    // Save to Notion — schema is fetched dynamically so unknown columns are skipped
    const transcriptBlocks = [
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
    ];

    const notionPage = await saveContactToNotion(notionToken, databaseId, {
      name: extracted.name,
      company: extracted.company,
      role: extracted.role,
      topics: extracted.topics,
      followUpDate: extracted.followUpDate,
      keyNote: extracted.keyNote,
      transcriptBlocks,
    });

    const contact = {
      id: notionPage.id,
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
