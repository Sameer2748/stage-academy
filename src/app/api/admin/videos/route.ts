import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();

    const videos = await prisma.courseVideo.findMany({
      orderBy: [{ moduleId: "asc" }, { sortOrder: "asc" }],
      include: {
        module: { select: { id: true, title: true, moduleNumber: true } },
      },
    });

    return NextResponse.json({ videos });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/videos] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const {
      moduleId,
      title,
      description,
      driveFileId,
      driveDirectUrl,
      duration,
      sortOrder,
      weekReference,
    } = body;

    if (!moduleId || !title || !driveFileId) {
      return NextResponse.json(
        { error: "Missing required fields: moduleId, title, driveFileId" },
        { status: 400 }
      );
    }

    // Verify module exists
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const video = await prisma.courseVideo.create({
      data: {
        moduleId,
        title,
        description: description || null,
        driveFileId,
        driveDirectUrl: driveDirectUrl || null,
        duration: duration || null,
        sortOrder: sortOrder || 0,
        weekReference: weekReference || null,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/videos] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
