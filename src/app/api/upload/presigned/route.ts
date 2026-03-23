import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generatePresignedUploadUrl, getS3Key, getS3Url } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { filename, contentType, weekNumber, dayNumber } = body;

    if (!filename || !contentType || !weekNumber || !dayNumber) {
      return NextResponse.json(
        { error: "Missing required fields: filename, contentType, weekNumber, dayNumber" },
        { status: 400 }
      );
    }

    // Get user's current phase
    const progress = await prisma.courseProgress.findUnique({
      where: { userId: user.id },
    });

    const phase = progress?.currentPhase || "VOLUME";

    // Generate S3 key and presigned URL
    const s3Key = getS3Key(user.id, filename);
    const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType);
    const s3Url = getS3Url(s3Key);

    // Create session record with PENDING status
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        title: `Week ${weekNumber} Day ${dayNumber} Recording`,
        weekNumber,
        dayNumber,
        phase,
        recordingPrompt: "",
        date: new Date(),
        s3Key,
        s3Url,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      uploadUrl,
      s3Key,
      sessionId: session.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[upload/presigned] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
