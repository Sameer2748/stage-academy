import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createCalendarEvent, listUpcomingEvents, deleteCalendarEvent } from "@/lib/google-calendar";

export async function GET() {
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

    const events = await listUpcomingEvents(dbUser.googleAccessToken);

    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[calendar/events] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { title, scheduledAt, type, weekNumber, dayNumber } = body;

    if (!title || !scheduledAt || !type) {
      return NextResponse.json(
        { error: "Missing required fields: title, scheduledAt, type" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { googleAccessToken: true },
    });

    // Create local calendar event record
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title,
        scheduledAt: new Date(scheduledAt),
        type,
        weekNumber: weekNumber || null,
        dayNumber: dayNumber || null,
      },
    });

    // If Google Calendar is connected, create event there too
    if (dbUser?.googleAccessToken) {
      try {
        const startDate = new Date(scheduledAt);
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min duration

        const googleEvent = await createCalendarEvent(dbUser.googleAccessToken, {
          summary: title,
          description: `Stage Academy - ${type}`,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
        });

        await prisma.calendarEvent.update({
          where: { id: calendarEvent.id },
          data: { googleEventId: googleEvent.id },
        });
      } catch (err) {
        console.error("[calendar/events] Google Calendar create error:", err);
      }
    }

    return NextResponse.json(calendarEvent, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[calendar/events] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing required field: eventId" },
        { status: 400 }
      );
    }

    const calendarEvent = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId: user.id },
    });

    if (!calendarEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Delete from Google Calendar if connected
    if (calendarEvent.googleEventId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { googleAccessToken: true },
      });

      if (dbUser?.googleAccessToken) {
        try {
          await deleteCalendarEvent(dbUser.googleAccessToken, calendarEvent.googleEventId);
        } catch (err) {
          console.error("[calendar/events] Google Calendar delete error:", err);
        }
      }
    }

    await prisma.calendarEvent.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[calendar/events] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
