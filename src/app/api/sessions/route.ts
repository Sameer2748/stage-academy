import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Phase } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    const phase = searchParams.get("phase") as Phase | null;
    const week = searchParams.get("week");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: user.id };

    if (phase) where.phase = phase;
    if (week) where.weekNumber = parseInt(week, 10);
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: { transcript: true, aiAnalysis: true },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.session.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[sessions] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { title, weekNumber, dayNumber, phase, recordingPrompt } = body;

    if (!title || !weekNumber || !dayNumber || !phase || !recordingPrompt) {
      return NextResponse.json(
        { error: "Missing required fields: title, weekNumber, dayNumber, phase, recordingPrompt" },
        { status: 400 }
      );
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        title,
        weekNumber,
        dayNumber,
        phase,
        recordingPrompt,
        date: new Date(),
        s3Key: "",
        s3Url: "",
        status: "PENDING",
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[sessions] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
