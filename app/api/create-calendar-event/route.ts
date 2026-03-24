import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/create-calendar-event
 *
 * Creates a Google Calendar follow-up reminder using a service account
 * or OAuth2 access token.
 *
 * Expected body:
 * {
 *   name: string,           // Contact's name
 *   company: string,
 *   followUpDate: string,   // YYYY-MM-DD
 *   keyNote: string
 * }
 *
 * Returns: { eventId: string, htmlLink: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { name, company, followUpDate, keyNote } = await req.json();

    if (!name || !followUpDate) {
      return NextResponse.json(
        { error: "name and followUpDate are required" },
        { status: 400 }
      );
    }

    const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Calendar access token not configured" },
        { status: 500 }
      );
    }

    const event = {
      summary: `Follow up with ${name} (${company})`,
      description: `afterchat reminder\n\n${keyNote || ""}`,
      start: {
        date: followUpDate,
        timeZone: "UTC",
      },
      end: {
        date: followUpDate,
        timeZone: "UTC",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Google Calendar API error: ${JSON.stringify(error)}`);
    }

    const created = await res.json();
    return NextResponse.json({ eventId: created.id, htmlLink: created.htmlLink });
  } catch (err) {
    console.error("[/api/create-calendar-event]", err);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
