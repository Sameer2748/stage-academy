import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    // Get course progress
    const progress = await prisma.courseProgress.findUnique({
      where: { userId: user.id },
    });

    const currentWeek = progress?.currentWeek || 1;

    // Get today's daily plan
    const today = new Date().toISOString().split("T")[0];
    const dailyPlan = await prisma.dailyPlanEntry.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });

    // Get current week plan
    const weeklyPlan = await prisma.weeklyPlan.findUnique({
      where: { userId_weekNumber: { userId: user.id, weekNumber: currentWeek } },
    });

    // Count recordings
    const totalRecordings = await prisma.dayRecording.count({
      where: { userId: user.id },
    });

    // Count reviewed recordings
    const totalReviewed = await prisma.dayRecording.count({
      where: { userId: user.id, NOT: { aiReview: { equals: Prisma.DbNull } } },
    });

    // Get watched video IDs
    const watchSessions = await prisma.videoWatchSession.findMany({
      where: { userId: user.id },
      select: { video: { select: { driveFileId: true } } },
    });
    const watchedVideoIds = watchSessions.map((ws) => ws.video.driveFileId);

    // Count total sessions (full recordings)
    const totalSessions = await prisma.session.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      currentWeek,
      currentPhase: progress?.currentPhase || "VOLUME",
      currentDay: progress?.currentDay || 1,
      todayPlan: dailyPlan
        ? {
            blocks: dailyPlan.blocks,
            journalRecorded: dailyPlan.journalRecorded,
          }
        : null,
      weeklyPlan: weeklyPlan ? { days: weeklyPlan.days } : null,
      totalRecordings,
      totalReviewed,
      totalSessions,
      watchedVideoIds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[dashboard/summary] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
