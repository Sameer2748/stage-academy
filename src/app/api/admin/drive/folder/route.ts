import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { listFolderContents } from "@/lib/google-drive";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");

    if (!folderId) {
      return NextResponse.json(
        { error: "Missing required query param: folderId" },
        { status: 400 }
      );
    }

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

    const files = await listFolderContents(folderId, dbUser.googleAccessToken);

    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/drive/folder] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
