import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/save-contact
 *
 * Saves an extracted contact to a Notion database.
 *
 * Expected body:
 * {
 *   name: string,
 *   company: string,
 *   role: string,
 *   topics: string[],
 *   followUpDate: string,   // YYYY-MM-DD
 *   keyNote: string,
 *   transcript?: string
 * }
 *
 * Returns: { notionPageId: string, url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, company, role, topics, followUpDate, keyNote, transcript } = body;

    if (!name || !company) {
      return NextResponse.json({ error: "name and company are required" }, { status: 400 });
    }

    const notionToken = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
      return NextResponse.json(
        { error: "Notion credentials not configured" },
        { status: 500 }
      );
    }

    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: name } }],
      },
      Company: {
        rich_text: [{ text: { content: company } }],
      },
      Role: {
        rich_text: [{ text: { content: role || "" } }],
      },
      Topics: {
        multi_select: (topics || []).map((t: string) => ({ name: t })),
      },
      "Follow-up Date": {
        date: { start: followUpDate },
      },
      "Key Note": {
        rich_text: [{ text: { content: keyNote || "" } }],
      },
    };

    const children = transcript
      ? [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [{ text: { content: "Voice Transcript" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ text: { content: transcript } }],
            },
          },
        ]
      : [];

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
        children,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Notion API error: ${JSON.stringify(error)}`);
    }

    const page = await res.json();
    return NextResponse.json({ notionPageId: page.id, url: page.url });
  } catch (err) {
    console.error("[/api/save-contact]", err);
    return NextResponse.json({ error: "Failed to save contact to Notion" }, { status: 500 });
  }
}
