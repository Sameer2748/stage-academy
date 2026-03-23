import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const modules = await prisma.courseModule.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        videos: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            driveFileId: true,
            driveDirectUrl: true,
            duration: true,
            sortOrder: true,
            weekReference: true,
            isWatched: true,
            notes: true,
          },
        },
        _count: {
          select: { videos: true },
        },
      },
    });

    // Get user's watch progress
    const watchSessions = await prisma.videoWatchSession.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      select: { videoId: true },
    });

    const watchedVideoIds = new Set(watchSessions.map((ws) => ws.videoId));

    const modulesWithProgress = modules.map((mod) => {
      const totalVideos = mod.videos.length;
      const watchedCount = mod.videos.filter((v) =>
        watchedVideoIds.has(v.id) || v.isWatched
      ).length;

      const videosWithWatchStatus = mod.videos.map((v) => ({
        ...v,
        isWatched: v.isWatched || watchedVideoIds.has(v.id),
      }));

      return {
        id: mod.id,
        moduleNumber: mod.moduleNumber,
        title: mod.title,
        subtitle: mod.subtitle,
        description: mod.description,
        phase: mod.phase,
        sortOrder: mod.sortOrder,
        isUnlocked: mod.isUnlocked,
        videos: videosWithWatchStatus,
        _count: mod._count,
        watchedCount,
        totalVideos,
        progress: totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0,
      };
    });

    return NextResponse.json({ modules: modulesWithProgress });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[library/modules] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
