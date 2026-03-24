import { NextRequest } from "next/server";

/**
 * POST /api/transcribe
 *
 * Uploads audio to AssemblyAI and submits a transcription request.
 * Returns a transcriptId immediately — client polls /api/transcribe/[id] for status.
 * Split into two steps so this request never exceeds Vercel's function timeout.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "AssemblyAI API key not configured" }, { status: 500 });
    }

    // 1. Upload audio
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

    // 2. Submit transcription request — returns immediately with an ID
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: upload_url }),
    });

    if (!transcriptRes.ok) {
      throw new Error(`AssemblyAI transcript submit failed: ${transcriptRes.statusText}`);
    }

    const { id: transcriptId } = await transcriptRes.json();

    return Response.json({ transcriptId });
  } catch (err) {
    console.error("[/api/transcribe]", err);
    return Response.json({ error: "Transcription failed" }, { status: 500 });
  }
}
