import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { listFolderContents, getDriveEmbedUrl } from "@/lib/google-drive";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { folderId, moduleId } = body;

    if (!folderId || !moduleId) {
      return NextResponse.json(
        { error: "Missing required fields: folderId, moduleId" },
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

    // Get user's Google access token
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { googleAccessToken: true },
    });

    if (!dbUser?.googleAccessToken) {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect your Google account." },
        { status: 400 }
      );
    }

    // List files in the Drive folder
    const files = await listFolderContents(folderId, dbUser.googleAccessToken);

    // Filter for video files
    const videoFiles = files.filter(
      (f) =>
        f.mimeType.startsWith("video/") ||
        f.mimeType === "application/vnd.google-apps.video"
    );

    if (videoFiles.length === 0) {
      return NextResponse.json(
        { error: "No video files found in the specified folder" },
        { status: 404 }
      );
    }

    // Get existing video driveFileIds to avoid duplicates
    const existingVideos = await prisma.courseVideo.findMany({
      where: { moduleId },
      select: { driveFileId: true },
    });
    const existingIds = new Set(existingVideos.map((v) => v.driveFileId));

    // Get max sortOrder in module
    const maxSort = await prisma.courseVideo.findFirst({
      where: { moduleId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    let nextSort = (maxSort?.sortOrder || 0) + 1;

    const imported: string[] = [];
    const skipped: string[] = [];

    for (const file of videoFiles) {
      if (existingIds.has(file.id)) {
        skipped.push(file.name);
        continue;
      }

      await prisma.courseVideo.create({
        data: {
          moduleId,
          title: file.name.replace(/\.[^.]+$/, ""), // Remove file extension
          driveFileId: file.id,
          driveDirectUrl: getDriveEmbedUrl(file.id),
          duration: null,
          sortOrder: nextSort++,
        },
      });

      imported.push(file.name);
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      importedFiles: imported,
      skippedFiles: skipped,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/videos/bulk-import] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
