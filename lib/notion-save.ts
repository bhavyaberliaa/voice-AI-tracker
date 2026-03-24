/**
 * Dynamically saves a contact to a Notion database.
 *
 * It first fetches the database schema, then only sends properties
 * that exist in the schema with the correct type — so mismatches
 * between code and Notion columns are silently skipped rather than
 * causing a hard failure.
 */
export interface ContactPayload {
  name: string;
  company?: string;
  role?: string;
  topics?: string[];
  followUpDate?: string;
  keyNote?: string;
  transcriptBlocks?: object[];
}

export async function saveContactToNotion(
  notionToken: string,
  databaseId: string,
  payload: ContactPayload
): Promise<{ id: string; url: string }> {
  // 1. Fetch database schema to know which columns exist and their types
  const schemaRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
    },
  });

  if (!schemaRes.ok) {
    const err = await schemaRes.json();
    throw new Error(`Failed to fetch Notion schema: ${JSON.stringify(err)}`);
  }

  const schema = await schemaRes.json();
  const dbProps = schema.properties as Record<string, { type: string }>;

  const has = (colName: string, type: string) =>
    colName in dbProps && dbProps[colName].type === type;

  // 2. Build the role string — "Title at Company" if both present
  const { name, company, role, topics, followUpDate, keyNote, transcriptBlocks } = payload;
  const roleValue =
    role && company ? `${role} at ${company}` : role || company || "";

  // 3. Build properties object — only include columns that exist in Notion
  const properties: Record<string, unknown> = {
    // Title is always required; find whichever column is type "title"
    [Object.keys(dbProps).find((k) => dbProps[k].type === "title") ?? "Name"]: {
      title: [{ text: { content: name } }],
    },
  };

  if (has("Role", "rich_text") && roleValue)
    properties["Role"] = { rich_text: [{ text: { content: roleValue } }] };

  if (has("Follow Up", "date") && followUpDate)
    properties["Follow Up"] = { date: { start: followUpDate } };

  if (has("Key Note", "rich_text") && keyNote)
    properties["Key Note"] = { rich_text: [{ text: { content: keyNote } }] };

  // Topics stored as comma-separated text in whichever text column is available
  const topicsText = (topics || []).join(", ");
  if (topicsText) {
    if (has("Next steps", "rich_text"))
      properties["Next steps"] = { rich_text: [{ text: { content: topicsText } }] };
    else if (has("Topics", "rich_text"))
      properties["Topics"] = { rich_text: [{ text: { content: topicsText } }] };
    // If Topics is multi_select, only use it when options are already defined
    else if (has("Topics", "multi_select")) {
      const topicsProp = dbProps["Topics"] as unknown as { options?: Array<{ name: string }> };
      if (topicsProp.options?.length) {
        const validOptions = topicsProp.options.map((o) => o.name);
        const filtered = (topics || []).filter((t) => validOptions.includes(t));
        if (filtered.length)
          properties["Topics"] = { multi_select: filtered.map((t) => ({ name: t })) };
      }
    }
  }

  // 4. Create the Notion page
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
      ...(transcriptBlocks?.length ? { children: transcriptBlocks } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Notion create page failed: ${JSON.stringify(err)}`);
  }

  const page = await res.json();
  return { id: page.id, url: page.url };
}
