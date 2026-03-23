import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { analyseTranscript } from "@/lib/grok";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required field: sessionId" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: user.id },
      include: { transcript: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.transcript) {
      return NextResponse.json(
        { error: "No transcript available for analysis" },
        { status: 400 }
      );
    }

    // Delete existing analysis if present
    await prisma.aIAnalysis.deleteMany({ where: { sessionId } });

    // Run analysis
    await analyseTranscript(sessionId);

    const analysis = await prisma.aIAnalysis.findUnique({
      where: { sessionId },
    });

    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[analyse] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
