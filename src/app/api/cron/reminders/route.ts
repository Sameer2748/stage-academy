import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { UI_TEXT } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDay = now.getUTCDay(); // 0=Sun, 1=Mon...

    // Find users whose reminder time matches current time (within 5 min window)
    const settings = await prisma.settings.findMany({
      where: {
        user: {
          courseProgress: {
            isCompleted: false,
          },
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    let sentCount = 0;

    for (const setting of settings) {
      // Parse reminder time (e.g. "09:00")
      const [reminderHour, reminderMinute] = setting.reminderTime.split(":").map(Number);

      // Check if current time matches (within 5 min)
      if (
        Math.abs(currentHour - reminderHour) === 0 &&
        Math.abs(currentMinute - reminderMinute) <= 5
      ) {
        // Check if today is a reminder day
        const reminderDays = setting.reminderDaysOfWeek as number[];
        if (!reminderDays.includes(currentDay)) continue;

        // Check if user already practiced today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const todaySession = await prisma.session.findFirst({
          where: {
            userId: setting.user.id,
            date: { gte: todayStart, lte: todayEnd },
            status: "COMPLETED",
          },
        });

        if (todaySession) continue; // Already practiced today

        // Send reminder notification
        await createNotification(
          setting.user.id,
          UI_TEXT.NOTIFICATION_REMINDER_TITLE,
          UI_TEXT.NOTIFICATION_REMINDER_BODY,
          "reminder"
        );

        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      remindersChecked: settings.length,
      remindersSent: sentCount,
    });
  } catch (error) {
    console.error("[cron/reminders] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
