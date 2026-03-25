import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const watchSessions = await prisma.videoWatchSession.findMany({
      where: { userId: user.id },
      select: { video: { select: { driveFileId: true } } },
    });

    const watchedIds = watchSessions.map((ws) => ws.video.driveFileId);

    return NextResponse.json({ watchedIds });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[library/watched] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { driveFileId } = await req.json();

    if (!driveFileId) {
      return NextResponse.json({ error: "Missing driveFileId" }, { status: 400 });
    }

    // Find the course video
    const video = await prisma.courseVideo.findUnique({
      where: { driveFileId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Check if already watched
    const existing = await prisma.videoWatchSession.findFirst({
      where: { userId: user.id, videoId: video.id },
    });

    if (existing) {
      // Un-watch: delete the session
      await prisma.videoWatchSession.delete({ where: { id: existing.id } });
      return NextResponse.json({ watched: false, driveFileId });
    } else {
      // Watch: create a session
      await prisma.videoWatchSession.create({
        data: {
          userId: user.id,
          videoId: video.id,
          completedAt: new Date(),
          completionPercent: 100,
        },
      });
      return NextResponse.json({ watched: true, driveFileId });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[library/watched] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
