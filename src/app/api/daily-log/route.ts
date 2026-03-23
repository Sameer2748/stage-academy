import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const week = searchParams.get("week");

    const where: Record<string, unknown> = { userId: user.id };
    if (week) {
      where.weekNumber = parseInt(week, 10);
    }

    const logs = await prisma.dailyLog.findMany({
      where,
      orderBy: { date: "desc" },
      include: { session: { select: { id: true, title: true, status: true } } },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[daily-log] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const {
      sessionId,
      date,
      weekNumber,
      dayNumber,
      mood,
      notes,
      volumeRating,
      energyRating,
    } = body;

    if (!date || !weekNumber || !dayNumber) {
      return NextResponse.json(
        { error: "Missing required fields: date, weekNumber, dayNumber" },
        { status: 400 }
      );
    }

    // Check if a log already exists for this user/date
    const existingLog = await prisma.dailyLog.findFirst({
      where: {
        userId: user.id,
        weekNumber,
        dayNumber,
      },
    });

    const data = {
      userId: user.id,
      sessionId: sessionId || null,
      date: new Date(date),
      weekNumber,
      dayNumber,
      mood: mood ?? null,
      notes: notes ?? null,
      volumeRating: volumeRating ?? null,
      energyRating: energyRating ?? null,
    };

    let log;
    if (existingLog) {
      log = await prisma.dailyLog.update({
        where: { id: existingLog.id },
        data,
      });
    } else {
      log = await prisma.dailyLog.create({ data });
    }

    return NextResponse.json(log, { status: existingLog ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[daily-log] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
