import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const week = req.nextUrl.searchParams.get("week");
    const day = req.nextUrl.searchParams.get("day");

    if (!week || !day) {
      return NextResponse.json({ error: "Missing week or day param" }, { status: 400 });
    }

    const recordings = await prisma.dayRecording.findMany({
      where: {
        userId: user.id,
        weekNumber: parseInt(week),
        dayNumber: parseInt(day),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      recordings: recordings.map((r) => ({
        id: r.id,
        taskId: r.taskId,
        s3Url: r.s3Url,
        s3Key: r.s3Key,
        duration: r.duration,
        timestamp: Number(r.timestamp),
        transcript: r.transcript,
        aiReview: r.aiReview,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[day-recordings] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { weekNumber, dayNumber, taskId, s3Url, s3Key, duration, timestamp, transcript, aiReview } = body;

    if (!weekNumber || !dayNumber || !taskId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const recording = await prisma.dayRecording.create({
      data: {
        userId: user.id,
        weekNumber,
        dayNumber,
        taskId,
        s3Url: s3Url || null,
        s3Key: s3Key || null,
        duration: duration || 0,
        timestamp: BigInt(timestamp || Date.now()),
        transcript: transcript || null,
        aiReview: aiReview || null,
      },
    });

    return NextResponse.json({
      id: recording.id,
      taskId: recording.taskId,
      s3Url: recording.s3Url,
      duration: recording.duration,
      timestamp: Number(recording.timestamp),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[day-recordings] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { id, transcript, aiReview } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing recording id" }, { status: 400 });
    }

    const recording = await prisma.dayRecording.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(transcript !== undefined && { transcript }),
        ...(aiReview !== undefined && { aiReview }),
      },
    });

    return NextResponse.json({ success: true, updated: recording.count });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[day-recordings] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
