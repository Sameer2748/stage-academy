import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "DEEPGRAM_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Call Deepgram Nova-2 for transcription
    const dgResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true&filler_words=true&diarize=false",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": audioFile.type || "audio/webm",
        },
        body: audioBuffer,
      }
    );

    if (!dgResponse.ok) {
      const errorText = await dgResponse.text();
      console.error("[transcribe] Deepgram error:", dgResponse.status, errorText);
      return NextResponse.json(
        { error: `Deepgram API error: ${dgResponse.status}` },
        { status: 502 }
      );
    }

    const dgResult = await dgResponse.json();
    const transcript =
      dgResult.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("[transcribe] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
