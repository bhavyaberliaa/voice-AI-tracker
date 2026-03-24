# /sync-granola

Sync recent coffee chat meetings from Granola into the Notion database.

## What to do

1. **Fetch recent meetings** — call `list_meetings` (or `get_meetings`) to get meetings from the last 30 days. Filter for meetings that look like coffee chats based on title keywords: "coffee", "chat", "1:1", "<>", "catch up", "intro", or any meeting title that includes two person names.

2. **Get transcripts** — for each candidate meeting, call `get_meeting_transcript` with the meeting id to retrieve the full transcript.

3. **Extract contact info** — using the transcript and meeting title/participants, extract:
   - `name` (the other person's full name — not the user's own name)
   - `company` (their company/organization)
   - `role` (their job title)
   - `topics` (array of 2–4 short topic strings discussed)
   - `followUpDate` (ISO date YYYY-MM-DD, 2 weeks from meeting date if no explicit date mentioned)
   - `keyNote` (one sentence summary of what to remember about this person)

4. **Deduplicate** — before creating each Notion page, call `notion-search` with the person's name. If a page with that name already exists in the database, skip it and note "already in Notion".

5. **Save to Notion** — for each new contact, call `notion-create-pages` to add a row to the Coffee Chats database (use the `NOTION_DATABASE_ID` from environment, or search for the database if not set). Map fields to Notion properties: Name (title), Role (rich_text), Key Note (rich_text), Follow Up (date), Topics/Next steps (rich_text).

6. **Report results** — output a summary like:
   ```
   Synced 3 meetings → Notion:
   ✅ Viola Chen (PM at Stripe) — saved
   ✅ Sarah Kim (Founder at Acme) — saved
   ⏭️  Nikhil Kelkar (Databricks) — already in Notion
   ```

## Notes

- Skip internal team meetings, standup calls, or meetings with no external person.
- If a transcript is empty or too short to extract info, skip with a note.
- Today's date is available via context; use it to compute follow-up dates.
- Be conservative: only save when you are reasonably confident it was a coffee chat with an external person.
