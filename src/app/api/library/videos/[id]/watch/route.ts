import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const video = await prisma.courseVideo.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Create or update watch session
    const existingWatch = await prisma.videoWatchSession.findFirst({
      where: { userId: user.id, videoId: params.id },
      orderBy: { createdAt: "desc" },
    });

    let watchSession;
    if (existingWatch && !existingWatch.completedAt) {
      // Update existing incomplete watch session
      watchSession = await prisma.videoWatchSession.update({
        where: { id: existingWatch.id },
        data: {
          completedAt: new Date(),
          completionPercent: 100,
          watchDurationSeconds: video.duration || 0,
        },
      });
    } else {
      // Create new watch session
      watchSession = await prisma.videoWatchSession.create({
        data: {
          userId: user.id,
          videoId: params.id,
          completedAt: new Date(),
          completionPercent: 100,
          watchDurationSeconds: video.duration || 0,
        },
      });
    }

    // Update the video's watched status
    await prisma.courseVideo.update({
      where: { id: params.id },
      data: { isWatched: true, watchedAt: new Date() },
    });

    return NextResponse.json({ success: true, watchSession });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[library/videos/[id]/watch] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
