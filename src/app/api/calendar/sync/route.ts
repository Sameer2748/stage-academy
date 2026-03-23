import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createCalendarEvent } from "@/lib/google-calendar";
import { PlanDay } from "@/lib/plan-generator";

export async function POST() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { googleAccessToken: true },
    });

    if (!dbUser?.googleAccessToken) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      );
    }

    // Get active weekly plan
    const plan = await prisma.weeklyPlan.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!plan) {
      return NextResponse.json({ error: "No active weekly plan" }, { status: 404 });
    }

    const days = plan.days as unknown as PlanDay[];
    const createdEvents: string[] = [];

    for (const day of days) {
      if (day.isRestDay) continue;

      const dayDate = day.date ? new Date(day.date) : new Date();
      dayDate.setHours(9, 0, 0, 0); // Default to 9 AM

      const endDate = new Date(dayDate.getTime() + day.durationMinutes * 60 * 1000);

      try {
        const googleEvent = await createCalendarEvent(dbUser.googleAccessToken, {
          summary: `Stage Academy: ${day.title}`,
          description: `${day.description}\n\nPrompt: ${day.prompt}\n\nTips:\n${day.tips?.join("\n") || ""}`,
          startDateTime: dayDate.toISOString(),
          endDateTime: endDate.toISOString(),
        });

        // Save to local DB
        await prisma.calendarEvent.create({
          data: {
            userId: user.id,
            googleEventId: googleEvent.id,
            title: `Stage Academy: ${day.title}`,
            scheduledAt: dayDate,
            type: "RECORDING_REMINDER",
            weekNumber: plan.weekNumber,
            dayNumber: day.dayNumber,
          },
        });

        createdEvents.push(googleEvent.id);
      } catch (err) {
        console.error(`[calendar/sync] Failed to create event for day ${day.dayNumber}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      eventsCreated: createdEvents.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[calendar/sync] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
