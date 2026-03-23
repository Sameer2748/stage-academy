import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { weekNumber, adjustments } = body;

    if (!weekNumber || !adjustments || !Array.isArray(adjustments)) {
      return NextResponse.json(
        { error: "Missing required fields: weekNumber, adjustments (DayPlan[])" },
        { status: 400 }
      );
    }

    const plan = await prisma.weeklyPlan.findUnique({
      where: { userId_weekNumber: { userId: user.id, weekNumber } },
    });

    if (!plan) {
      return NextResponse.json({ error: "Weekly plan not found" }, { status: 404 });
    }

    const updatedPlan = await prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: {
        days: adjustments,
        wasAdjusted: true,
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[weekly-plan/adjust] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
