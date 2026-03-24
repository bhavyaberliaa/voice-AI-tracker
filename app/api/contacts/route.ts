/**
 * GET /api/contacts
 *
 * Fetches all contacts from the Notion database, sorted newest first.
 * Maps Notion page properties to the Contact type.
 */
export async function GET() {
  try {
    const notionToken = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
      return Response.json({ error: "Notion credentials not configured" }, { status: 500 });
    }

    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        sorts: [{ timestamp: "created_time", direction: "descending" }],
        page_size: 100,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Notion query failed: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    const contacts = (data.results as NotionPage[]).map(mapPageToContact).filter(Boolean);

    return Response.json(contacts);
  } catch (err) {
    console.error("[/api/contacts]", err);
    return Response.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface NotionPage {
  id: string;
  created_time: string;
  properties: Record<string, NotionProperty>;
}

interface NotionProperty {
  type: string;
  title?: Array<{ text: { content: string } }>;
  rich_text?: Array<{ text: { content: string } }>;
  multi_select?: Array<{ name: string }>;
  date?: { start: string } | null;
  select?: { name: string } | null;
}

function getText(prop: NotionProperty | undefined): string {
  if (!prop) return "";
  if (prop.type === "title") return prop.title?.[0]?.text?.content ?? "";
  if (prop.type === "rich_text") return prop.rich_text?.[0]?.text?.content ?? "";
  if (prop.type === "select") return prop.select?.name ?? "";
  return "";
}

function mapPageToContact(page: NotionPage) {
  const p = page.properties;
  const name = getText(p["Name"]);
  if (!name) return null;

  // Follow-up date falls back to today if missing
  const followUpDate =
    p["Follow Up"]?.date?.start ?? new Date().toISOString().split("T")[0];

  // Role is stored as "Title at Company" — split for display
  const roleRaw = getText(p["Role"]);
  const atIndex = roleRaw.indexOf(" at ");
  const role = atIndex > -1 ? roleRaw.slice(0, atIndex) : roleRaw;
  const company = atIndex > -1 ? roleRaw.slice(atIndex + 4) : "";

  return {
    id: page.id,
    name,
    company,
    role,
    topics: p["Topics"]?.multi_select?.map((s) => s.name) ?? [],
    followUpDate,
    keyNote: getText(p["Key Note"]),
    source: "voice" as const,
    createdAt: page.created_time,
  };
}
