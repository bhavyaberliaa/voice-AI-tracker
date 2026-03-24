import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/transcribe
 *
 * Uploads audio to AssemblyAI and returns a transcriptId for polling.
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
      const body = await uploadRes.text();
      throw new Error(`AssemblyAI upload failed (${uploadRes.status}): ${body}`);
    }

    const uploadData = await uploadRes.json();
    console.log("[/api/transcribe] upload response:", JSON.stringify(uploadData));

    const upload_url = uploadData.upload_url;
    if (!upload_url) {
      throw new Error(`AssemblyAI upload returned no upload_url. Full response: ${JSON.stringify(uploadData)}`);
    }

    // 2. Submit transcription request
    const transcriptBody = { audio_url: upload_url };
    console.log("[/api/transcribe] submitting transcript with body:", JSON.stringify(transcriptBody));

    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(transcriptBody),
    });

    if (!transcriptRes.ok) {
      const body = await transcriptRes.text();
      throw new Error(`AssemblyAI transcript submit failed (${transcriptRes.status}): ${body}`);
    }

    const { id: transcriptId } = await transcriptRes.json();
    return NextResponse.json({ transcriptId });
  } catch (err) {
    console.error("[/api/transcribe]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
