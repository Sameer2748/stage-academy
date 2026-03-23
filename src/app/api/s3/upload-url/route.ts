import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl, getS3Url } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType, folder } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 }
      );
    }

    const prefix = folder || "recordings";
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${prefix}/${timestamp}_${sanitized}`;

    const uploadUrl = await generatePresignedUploadUrl(key, contentType);
    const publicUrl = getS3Url(key);

    return NextResponse.json({ uploadUrl, key, publicUrl });
  } catch (error) {
    console.error("[s3/upload-url] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
