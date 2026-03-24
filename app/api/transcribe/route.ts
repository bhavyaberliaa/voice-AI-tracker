import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/transcribe
 *
 * Transcribes audio using OpenAI Whisper.
 * Returns { transcript } directly — no polling needed.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const whisperForm = new FormData();
    // Whisper needs a filename with an extension it recognises
    const fileName = (formData.get("filename") as string | null) ?? "recording.webm";
    whisperForm.append("file", audioFile, fileName);
    whisperForm.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Whisper transcription failed: ${err.error?.message ?? res.statusText}`
      );
    }

    const { text } = await res.json();
    return NextResponse.json({ transcript: text });
  } catch (err) {
    console.error("[/api/transcribe]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
