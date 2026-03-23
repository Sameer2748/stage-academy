import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { textToSpeech } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text too long. Maximum 5000 characters." },
        { status: 400 }
      );
    }

    const audioBuffer = await textToSpeech(text);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[tts] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
