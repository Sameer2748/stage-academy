import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sendWeeklySummaryEmail, type WeeklySummaryData } from "@/lib/resend";

export async function POST() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        courseProgress: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const weekNumber = dbUser.courseProgress?.currentWeek || 1;
    const phase = dbUser.courseProgress?.currentPhase || "VOLUME";

    // Get this week's sessions
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        weekNumber,
        status: "COMPLETED",
      },
      include: { aiAnalysis: true },
    });

    // Get previous week's sessions for score change
    const prevSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        weekNumber: weekNumber - 1,
        status: "COMPLETED",
      },
      include: { aiAnalysis: true },
    });

    const scores = sessions
      .filter((s) => s.aiAnalysis)
      .map((s) => s.aiAnalysis!.overallScore);

    const prevScores = prevSessions
      .filter((s) => s.aiAnalysis)
      .map((s) => s.aiAnalysis!.overallScore);

    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    const prevAvgScore =
      prevScores.length > 0
        ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
        : 0;

    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    const totalPracticeMinutes = sessions.reduce(
      (sum, s) => sum + Math.round((s.duration || 0) / 60),
      0
    );

    // Get strengths/improvements from latest analysis
    const latestAnalysis = sessions
      .filter((s) => s.aiAnalysis)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.aiAnalysis;

    const strengthsList = (latestAnalysis?.strengthsList as string[]) || [];
    const improvementsList = (latestAnalysis?.improvementsList as string[]) || [];

    // Calculate streak (simplified)
    const allSessions = await prisma.session.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      select: { date: true },
      orderBy: { date: "desc" },
    });

    let streakDays = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const sessionDates = new Set(
      allSessions.map((s) => s.date.toISOString().split("T")[0])
    );

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (sessionDates.has(dateStr)) {
        streakDays++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate phase progress
    const phaseWeek = ((weekNumber - 1) % 3) + 1;
    const phaseProgress = Math.round((phaseWeek / 3) * 100);

    const summaryData: WeeklySummaryData = {
      userName: dbUser.name || "Student",
      weekNumber,
      phase,
      sessionsCompleted: sessions.length,
      averageScore: Math.round(avgScore * 10) / 10,
      bestScore: Math.round(bestScore * 10) / 10,
      totalPracticeMinutes,
      topStrength: strengthsList[0] || "Keep practicing!",
      focusArea: improvementsList[0] || "Continue improving",
      scoreChange: Math.round((avgScore - prevAvgScore) * 10) / 10,
      streakDays,
      phaseProgress,
    };

    const result = await sendWeeklySummaryEmail(dbUser.email, summaryData);

    return NextResponse.json({ success: true, emailId: result.id });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[email/weekly-summary] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
