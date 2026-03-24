# afterchat

A networking CRM for MBA students. After a coffee chat, hit record, speak a quick recap, and the app transcribes it, extracts structured contact info using Claude, saves it to Notion, and creates a Google Calendar follow-up reminder.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **AssemblyAI** — voice transcription
- **Claude (Anthropic)** — structured info extraction
- **Notion API** — contact database
- **Google Calendar API** — follow-up reminders

## Project Structure

```
app/
  page.tsx                        # Main contacts page
  layout.tsx                      # Root layout
  globals.css                     # Global styles + Google Fonts
  api/
    transcribe/route.ts           # POST: audio → AssemblyAI transcript
    extract/route.ts              # POST: transcript → Claude structured data
    save-contact/route.ts         # POST: contact data → Notion database
    create-calendar-event/route.ts # POST: follow-up → Google Calendar event
components/
  Sidebar.tsx                     # Navigation sidebar with stats
  ContactCard.tsx                 # Individual contact card
  RecorderModal.tsx               # Voice recorder + transcript modal
lib/
  types.ts                        # TypeScript types
  sample-data.ts                  # Hardcoded sample contacts
  utils.ts                        # Helper utilities
```

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd afterchat
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in your keys in `.env.local`:

| Variable | Where to get it |
|---|---|
| `ASSEMBLYAI_API_KEY` | [assemblyai.com/dashboard](https://www.assemblyai.com/dashboard) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `NOTION_API_KEY` | [notion.so/my-integrations](https://www.notion.so/my-integrations) |
| `NOTION_DATABASE_ID` | The ID in your Notion database URL |
| `GOOGLE_CALENDAR_ACCESS_TOKEN` | OAuth2 token from Google Cloud Console |
| `GOOGLE_CALENDAR_ID` | Defaults to `primary` |

### 3. Set up Notion Database

Create a Notion database with these properties:

| Property | Type |
|---|---|
| Name | Title |
| Company | Text |
| Role | Text |
| Topics | Multi-select |
| Follow-up Date | Date |
| Key Note | Text |

Share the database with your Notion integration.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Deploy

## API Routes

### `POST /api/transcribe`
Accepts `multipart/form-data` with an `audio` field (Blob). Uploads to AssemblyAI, polls for completion, and returns `{ transcript: string }`.

### `POST /api/extract`
Accepts `{ transcript: string }`. Sends to Claude and returns structured contact info: `{ name, company, role, topics, followUpDate, keyNote }`.

### `POST /api/save-contact`
Accepts contact data and saves a new page to your Notion database. Returns `{ notionPageId, url }`.

### `POST /api/create-calendar-event`
Accepts `{ name, company, followUpDate, keyNote }` and creates an all-day Google Calendar event. Returns `{ eventId, htmlLink }`.
