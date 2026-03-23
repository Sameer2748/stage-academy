import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const module = await prisma.courseModule.findUnique({
      where: { id: params.id },
      include: {
        videos: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Get user's watch status for each video
    const watchSessions = await prisma.videoWatchSession.findMany({
      where: {
        userId: user.id,
        videoId: { in: module.videos.map((v) => v.id) },
      },
      orderBy: { createdAt: "desc" },
    });

    const watchMap = new Map<string, { completedAt: Date | null; completionPercent: number }>();
    for (const ws of watchSessions) {
      if (!watchMap.has(ws.videoId)) {
        watchMap.set(ws.videoId, {
          completedAt: ws.completedAt,
          completionPercent: ws.completionPercent,
        });
      }
    }

    const videosWithProgress = module.videos.map((video) => {
      const watchData = watchMap.get(video.id);
      return {
        ...video,
        isWatchedByUser: !!watchData?.completedAt,
        watchProgress: watchData?.completionPercent || 0,
      };
    });

    return NextResponse.json({
      ...module,
      videos: videosWithProgress,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[library/modules/[id]] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
