import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWeeklySummaryEmail, type WeeklySummaryData } from "@/lib/resend";

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with email summaries enabled
    const users = await prisma.user.findMany({
      where: {
        settings: {
          emailSummaryEnabled: true,
        },
        courseProgress: {
          isCompleted: false,
        },
      },
      include: {
        courseProgress: true,
        settings: true,
      },
    });

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const weekNumber = user.courseProgress?.currentWeek || 1;
        const phase = user.courseProgress?.currentPhase || "VOLUME";

        // Get this week's sessions
        const sessions = await prisma.session.findMany({
          where: {
            userId: user.id,
            weekNumber,
            status: "COMPLETED",
          },
          include: { aiAnalysis: true },
        });

        if (sessions.length === 0) continue; // Skip if no sessions this week

        // Get previous week's sessions
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

        const latestAnalysis = sessions
          .filter((s) => s.aiAnalysis)
          .sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.aiAnalysis;

        const strengthsList = (latestAnalysis?.strengthsList as string[]) || [];
        const improvementsList = (latestAnalysis?.improvementsList as string[]) || [];

        const phaseWeek = ((weekNumber - 1) % 3) + 1;

        const summaryData: WeeklySummaryData = {
          userName: user.name || "Student",
          weekNumber,
          phase,
          sessionsCompleted: sessions.length,
          averageScore: Math.round(avgScore * 10) / 10,
          bestScore: Math.round(bestScore * 10) / 10,
          totalPracticeMinutes,
          topStrength: strengthsList[0] || "Keep practicing!",
          focusArea: improvementsList[0] || "Continue improving",
          scoreChange: Math.round((avgScore - prevAvgScore) * 10) / 10,
          streakDays: 0, // Simplified for cron
          phaseProgress: Math.round((phaseWeek / 3) * 100),
        };

        await sendWeeklySummaryEmail(user.email, summaryData);
        sentCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`User ${user.id}: ${message}`);
        console.error(`[cron/weekly-email] Error for user ${user.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      emailsSent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[cron/weekly-email] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
