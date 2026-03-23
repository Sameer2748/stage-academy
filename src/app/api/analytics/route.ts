import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    // Fetch all completed sessions with their analyses and transcripts
    const sessions = await prisma.session.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      include: { aiAnalysis: true, transcript: true },
      orderBy: { date: "asc" },
    });

    const totalSessions = sessions.length;

    // Total hours from session durations
    const totalHours = sessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    ) / 3600;

    // Best score and lowest fillers
    let bestScore = 0;
    let lowestFillers = Infinity;

    for (const s of sessions) {
      if (s.aiAnalysis && s.aiAnalysis.overallScore > bestScore) {
        bestScore = s.aiAnalysis.overallScore;
      }
      if (s.transcript && s.transcript.totalFillers < lowestFillers) {
        lowestFillers = s.transcript.totalFillers;
      }
    }
    if (lowestFillers === Infinity) lowestFillers = 0;

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort by date for streak calculation
    const sortedByDate = [...sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current streak: count consecutive days from today backwards
    const sessionDates = new Set(
      sortedByDate.map((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    const checkDate = new Date(today);
    while (true) {
      if (sessionDates.has(checkDate.getTime())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (
        currentStreak === 0 &&
        checkDate.getTime() === today.getTime()
      ) {
        // Allow today to not have a session yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Longest streak
    const allDates = Array.from(sessionDates)
      .sort((a, b) => a - b);

    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = (allDates[i] - allDates[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Filler trend
    const fillerTrend = sessions
      .filter((s) => s.transcript)
      .map((s) => ({
        date: s.date.toISOString().split("T")[0],
        count: s.transcript!.totalFillers,
        breakdown: s.transcript!.fillerWordCount,
      }));

    // Score history
    const scoreHistory = sessions
      .filter((s) => s.aiAnalysis)
      .map((s) => ({
        date: s.date.toISOString().split("T")[0],
        overall: s.aiAnalysis!.overallScore,
        volume: s.aiAnalysis!.volumeScore,
        tonality: s.aiAnalysis!.tonalityScore,
        pause: s.aiAnalysis!.pauseScore,
        storytelling: s.aiAnalysis!.storytellingScore,
      }));

    // Weekly completion
    const weekMap = new Map<number, { completed: number; total: number }>();
    for (const s of sessions) {
      const current = weekMap.get(s.weekNumber) || { completed: 0, total: 7 };
      current.completed++;
      weekMap.set(s.weekNumber, current);
    }
    const weeklyCompletion = Array.from(weekMap.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week - b.week);

    // WPM history
    const wpmHistory = sessions
      .filter((s) => s.transcript)
      .map((s) => ({
        date: s.date.toISOString().split("T")[0],
        wpm: s.transcript!.wordsPerMinute,
      }));

    // Duration history
    const durationHistory = sessions
      .filter((s) => s.duration)
      .map((s) => ({
        date: s.date.toISOString().split("T")[0],
        duration: s.duration!,
      }));

    // Phase comparison
    const phaseMap = new Map<
      string,
      { scores: number[]; volume: number[]; tonality: number[]; pause: number[]; storytelling: number[] }
    >();

    for (const s of sessions) {
      if (!s.aiAnalysis) continue;
      const existing = phaseMap.get(s.phase) || {
        scores: [],
        volume: [],
        tonality: [],
        pause: [],
        storytelling: [],
      };
      existing.scores.push(s.aiAnalysis.overallScore);
      existing.volume.push(s.aiAnalysis.volumeScore);
      existing.tonality.push(s.aiAnalysis.tonalityScore);
      existing.pause.push(s.aiAnalysis.pauseScore);
      existing.storytelling.push(s.aiAnalysis.storytellingScore);
      phaseMap.set(s.phase, existing);
    }

    const phaseComparison = Array.from(phaseMap.entries()).map(([phase, data]) => {
      const avg = (arr: number[]) =>
        arr.length > 0
          ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
          : 0;
      return {
        phase,
        avgScores: {
          overall: avg(data.scores),
          volume: avg(data.volume),
          tonality: avg(data.tonality),
          pause: avg(data.pause),
          storytelling: avg(data.storytelling),
        },
      };
    });

    return NextResponse.json({
      totalSessions,
      totalHours: Math.round(totalHours * 10) / 10,
      bestScore,
      lowestFillers,
      currentStreak,
      longestStreak,
      fillerTrend,
      scoreHistory,
      weeklyCompletion,
      wpmHistory,
      durationHistory,
      phaseComparison,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[analytics] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
