import { NextRequest } from "next/server";

/**
 * GET /api/transcribe/[id]
 *
 * Polls AssemblyAI for the status of a transcription job.
 * Returns: { status: "queued" | "processing" | "completed" | "error", transcript?: string }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "AssemblyAI API key not configured" }, { status: 500 });
    }

    const res = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    });

    if (!res.ok) {
      throw new Error(`AssemblyAI poll failed: ${res.statusText}`);
    }

    const data = await res.json();

    return Response.json({
      status: data.status,
      transcript: data.text ?? null,
      error: data.error ?? null,
    });
  } catch (err) {
    console.error("[/api/transcribe/[id]]", err);
    return Response.json({ error: "Polling failed" }, { status: 500 });
  }
}
