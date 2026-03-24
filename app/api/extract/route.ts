import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * POST /api/extract
 *
 * Sends a coffee chat transcript to Claude and extracts structured contact info.
 *
 * Expected body: { transcript: string }
 *
 * Returns:
 * {
 *   name: string,
 *   company: string,
 *   role: string,
 *   topics: string[],
 *   followUpDate: string,   // ISO date string (YYYY-MM-DD)
 *   keyNote: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const today = new Date().toISOString().split("T")[0];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a networking assistant for MBA students. Extract structured information from this coffee chat recap.

Today's date is ${today}. If a follow-up timeline is mentioned (e.g. "in a week", "next month"), calculate the actual date.

Return ONLY valid JSON with this exact shape:
{
  "name": "Full Name",
  "company": "Company Name",
  "role": "Job Title",
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "followUpDate": "YYYY-MM-DD",
  "keyNote": "One to two sentence summary of the most important takeaway and action item."
}

Transcript:
"""
${transcript}
"""`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const extracted = JSON.parse(jsonStr);

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[/api/extract]", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
