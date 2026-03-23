import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const video = await prisma.courseVideo.findUnique({
      where: { id: params.id },
      include: {
        module: { select: { id: true, title: true, moduleNumber: true } },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Get user's watch session for this video
    const watchSession = await prisma.videoWatchSession.findFirst({
      where: { userId: user.id, videoId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ...video,
      isWatchedByUser: !!watchSession?.completedAt,
      watchProgress: watchSession?.completionPercent || 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[library/videos/[id]] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await req.json();
    const { notes } = body;

    const video = await prisma.courseVideo.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const updated = await prisma.courseVideo.update({
      where: { id: params.id },
      data: { notes: notes ?? null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[library/videos/[id]] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
