import { NextResponse } from "next/server";

/**
 * GET /api/notion-test
 *
 * Checks whether NOTION_API_KEY and NOTION_DATABASE_ID are configured
 * and can successfully reach the Notion database.
 * Returns { ok, title?, columns?, error? } — never exposes the raw token.
 */
export async function GET() {
  const notionToken = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !databaseId) {
    return NextResponse.json(
      { ok: false, error: "NOTION_API_KEY or NOTION_DATABASE_ID env var is missing" },
      { status: 500 }
    );
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    return NextResponse.json(
      { ok: false, error: err.message ?? JSON.stringify(err) },
      { status: res.status }
    );
  }

  const db = await res.json();
  const title =
    db.title?.[0]?.plain_text ?? db.title?.[0]?.text?.content ?? "Untitled";
  const columns = Object.keys(db.properties ?? {});

  return NextResponse.json({ ok: true, title, columns });
}
