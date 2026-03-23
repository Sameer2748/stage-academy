import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateDefaultPlan } from "@/lib/plan-generator";
import { PHASES, type PhaseKey, LIMITS } from "@/lib/constants";

const PHASE_ORDER: PhaseKey[] = ["VOLUME", "TONALITY", "PAUSE", "STORYTELLING"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { confirmText } = body;

    if (confirmText !== "ADVANCE") {
      return NextResponse.json(
        { error: "Please provide confirmText: 'ADVANCE' to confirm" },
        { status: 400 }
      );
    }

    const progress = await prisma.courseProgress.findUnique({
      where: { userId: user.id },
    });

    if (!progress) {
      return NextResponse.json({ error: "Course progress not found" }, { status: 404 });
    }

    if (progress.isCompleted) {
      return NextResponse.json(
        { error: "Course is already completed" },
        { status: 400 }
      );
    }

    const currentPhaseIndex = PHASE_ORDER.indexOf(progress.currentPhase as PhaseKey);
    const currentPhaseConfig = PHASES[progress.currentPhase as PhaseKey];
    const weeksInPhase = currentPhaseConfig?.weeks || LIMITS.WEEKS_PER_PHASE;

    let newWeek = progress.currentWeek + 1;
    let newPhase = progress.currentPhase;
    let newDay = 1;
    let isCompleted = false;

    // Check if we need to advance to next phase
    const weekInPhase = ((progress.currentWeek - 1) % weeksInPhase) + 1;
    if (weekInPhase >= weeksInPhase) {
      // Move to next phase
      if (currentPhaseIndex >= PHASE_ORDER.length - 1) {
        // Course completed
        isCompleted = true;
      } else {
        newPhase = PHASE_ORDER[currentPhaseIndex + 1];
      }
    }

    // Update course progress
    const updatedProgress = await prisma.courseProgress.update({
      where: { userId: user.id },
      data: {
        currentWeek: newWeek,
        currentDay: newDay,
        currentPhase: newPhase,
        isCompleted,
        ...(newPhase !== progress.currentPhase
          ? { phaseStartDate: new Date() }
          : {}),
      },
    });

    // Deactivate old plans
    await prisma.weeklyPlan.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    // Generate new weekly plan if not completed
    let newPlan = null;
    if (!isCompleted) {
      const defaultPlan = generateDefaultPlan(newWeek, newPhase as string, new Date());

      newPlan = await prisma.weeklyPlan.create({
        data: {
          userId: user.id,
          weekNumber: newWeek,
          phase: newPhase as any,
          days: defaultPlan.days as any,
          isAIGenerated: false,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      progress: updatedProgress,
      plan: newPlan,
      isCompleted,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[weekly-plan/advance] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
