import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generatePresignedDownloadUrl } from "@/lib/s3";
import { transcribeFromS3 } from "@/lib/deepgram";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required field: sessionId" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update session status to PROCESSING
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "PROCESSING" },
    });

    // Generate presigned download URL for the S3 file
    const downloadUrl = await generatePresignedDownloadUrl(session.s3Key);

    // Fire and forget - start transcription asynchronously
    transcribeFromS3(downloadUrl, sessionId).catch((err) => {
      console.error(`[upload/complete] Transcription failed for session ${sessionId}:`, err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[upload/complete] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
