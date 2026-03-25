import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateWeeklyPlan } from "@/lib/grok";
import { generateDefaultPlan } from "@/lib/plan-generator";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const weekParam = req.nextUrl.searchParams.get("week");

    // Get user's current progress
    const progress = await prisma.courseProgress.findUnique({
      where: { userId: user.id },
    });

    const weekNumber = weekParam ? parseInt(weekParam) : (progress?.currentWeek || 1);

    const plan = await prisma.weeklyPlan.findUnique({
      where: { userId_weekNumber: { userId: user.id, weekNumber } },
    });

    if (!plan) {
      return NextResponse.json({ plan: null, weekNumber });
    }

    // Get session completion data for this week
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        weekNumber: plan.weekNumber,
        status: "COMPLETED",
      },
      select: { dayNumber: true, id: true },
    });

    const completedDays = sessions.map((s: any) => s.dayNumber);

    return NextResponse.json({ plan, completedDays, weekNumber });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[weekly-plan] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { weekNumber, phase, forceRegenerate } = body;

    if (!weekNumber || !phase) {
      return NextResponse.json(
        { error: "Missing required fields: weekNumber, phase" },
        { status: 400 }
      );
    }

    // Check if plan already exists
    const existingPlan = await prisma.weeklyPlan.findUnique({
      where: { userId_weekNumber: { userId: user.id, weekNumber } },
    });

    if (existingPlan && !forceRegenerate) {
      return NextResponse.json(existingPlan);
    }

    let days;
    let isAIGenerated = false;

    try {
      // Try AI generation first
      if (forceRegenerate || !existingPlan) {
        days = await generateWeeklyPlan(user.id, weekNumber, phase);
        isAIGenerated = true;
      }
    } catch (err) {
      console.error("[weekly-plan] AI generation failed, using defaults:", err);
    }

    // Fallback to default plan
    if (!days) {
      const defaultPlan = generateDefaultPlan(weekNumber, phase, new Date());
      days = defaultPlan.days;
    }

    // Deactivate previous plans
    await prisma.weeklyPlan.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    // Upsert the plan
    const plan = await prisma.weeklyPlan.upsert({
      where: { userId_weekNumber: { userId: user.id, weekNumber } },
      update: {
        phase,
        days: days as any,
        isAIGenerated,
        isActive: true,
        generatedAt: new Date(),
      },
      create: {
        userId: user.id,
        weekNumber,
        phase,
        days: days as any,
        isAIGenerated,
        isActive: true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[weekly-plan] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { weekNumber, days } = body;

    if (!weekNumber || !days) {
      return NextResponse.json(
        { error: "Missing required fields: weekNumber, days" },
        { status: 400 }
      );
    }

    const plan = await prisma.weeklyPlan.update({
      where: { userId_weekNumber: { userId: user.id, weekNumber } },
      data: { days: days as any, wasAdjusted: true },
    });

    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[weekly-plan] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
