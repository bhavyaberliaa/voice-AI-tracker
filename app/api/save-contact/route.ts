import { NextRequest, NextResponse } from "next/server";
import { saveContactToNotion } from "@/lib/notion-save";

/**
 * POST /api/save-contact
 *
 * Saves an extracted contact to Notion. Only sends columns that actually
 * exist in the database schema — extra or missing columns are skipped
 * gracefully so Notion config changes don't break saves.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, company, role, topics, followUpDate, keyNote, transcript } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const notionToken = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
      return NextResponse.json({ error: "Notion credentials not configured" }, { status: 500 });
    }

    const transcriptBlocks = transcript
      ? [
          {
            object: "block",
            type: "heading_3",
            heading_3: { rich_text: [{ text: { content: "Voice Transcript" } }] },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ text: { content: transcript } }] },
          },
        ]
      : [];

    const page = await saveContactToNotion(notionToken, databaseId, {
      name,
      company,
      role,
      topics,
      followUpDate,
      keyNote,
      transcriptBlocks,
    });

    return NextResponse.json({ notionPageId: page.id, url: page.url });
  } catch (err) {
    console.error("[/api/save-contact]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
