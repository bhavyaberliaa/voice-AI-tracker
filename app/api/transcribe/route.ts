import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/transcribe
 *
 * Receives an audio file (multipart/form-data), uploads it to AssemblyAI,
 * polls for completion, and returns the transcript text.
 *
 * Expected body: FormData with field "audio" containing the audio Blob.
 *
 * Returns: { transcript: string }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AssemblyAI API key not configured" }, { status: 500 });
    }

    // 1. Upload audio to AssemblyAI
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/octet-stream",
      },
      body: audioFile,
    });

    if (!uploadRes.ok) {
      throw new Error(`AssemblyAI upload failed: ${uploadRes.statusText}`);
    }

    const { upload_url } = await uploadRes.json();

    // 2. Submit transcription request
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: upload_url }),
    });

    if (!transcriptRes.ok) {
      throw new Error(`AssemblyAI transcript request failed: ${transcriptRes.statusText}`);
    }

    const { id: transcriptId } = await transcriptRes.json();

    // 3. Poll for completion
    const pollingUrl = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
    let transcript = "";

    while (true) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(pollingUrl, {
        headers: { authorization: apiKey },
      });
      const poll = await pollRes.json();

      if (poll.status === "completed") {
        transcript = poll.text;
        break;
      }

      if (poll.status === "error") {
        throw new Error(`AssemblyAI transcription error: ${poll.error}`);
      }
    }

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[/api/transcribe]", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
