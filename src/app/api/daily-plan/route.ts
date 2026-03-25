import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const date = req.nextUrl.searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Missing date param" }, { status: 400 });
    }

    const plan = await prisma.dailyPlanEntry.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });

    if (!plan) {
      return NextResponse.json({
        date,
        blocks: [],
        references: [],
        journalRecorded: false,
        journalDuration: 0,
      });
    }

    return NextResponse.json({
      date: plan.date,
      blocks: plan.blocks,
      references: plan.references,
      journalRecorded: plan.journalRecorded,
      journalDuration: plan.journalDuration,
      journalUrl: plan.journalUrl,
      journalS3Key: plan.journalS3Key,
      journalType: plan.journalType,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[daily-plan] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { date, blocks, references, journalRecorded, journalDuration, journalUrl, journalS3Key, journalType } = body;

    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    const plan = await prisma.dailyPlanEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: {
        userId: user.id,
        date,
        blocks: blocks || [],
        references: references || [],
        journalRecorded: journalRecorded || false,
        journalDuration: journalDuration || 0,
        journalUrl: journalUrl || null,
        journalS3Key: journalS3Key || null,
        journalType: journalType || null,
      },
      update: {
        blocks: blocks || [],
        references: references || [],
        journalRecorded: journalRecorded || false,
        journalDuration: journalDuration || 0,
        journalUrl: journalUrl || null,
        journalS3Key: journalS3Key || null,
        journalType: journalType || null,
      },
    });

    return NextResponse.json({ success: true, date: plan.date });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[daily-plan] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
