import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { analyseTranscript } from "@/lib/grok";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const session = await prisma.session.findFirst({
      where: { id: params.id, userId: user.id },
      include: { aiAnalysis: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.aiAnalysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json(session.aiAnalysis);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[sessions/[id]/analysis] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const session = await prisma.session.findFirst({
      where: { id: params.id, userId: user.id },
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

    // Delete existing analysis if re-analysing
    await prisma.aIAnalysis.deleteMany({ where: { sessionId: params.id } });

    // Trigger re-analysis
    await analyseTranscript(params.id);

    const analysis = await prisma.aIAnalysis.findUnique({
      where: { sessionId: params.id },
    });

    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[sessions/[id]/analysis] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
