import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { chatWithCoach } from "@/lib/grok";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    let whereClause: any = { userId: user.id };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    console.error("[chat] GET error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { messages, sessionId, contextType } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing required field: messages" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build context based on contextType
    let context = "";

    if (contextType === "session" && sessionId) {
      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId: user.id },
        include: { transcript: true, aiAnalysis: true },
      });
      if (session) {
        context = `Current session: Week ${session.weekNumber} Day ${session.dayNumber}, Phase: ${session.phase}`;
        if (session.transcript) {
          context += `\nTranscript: ${session.transcript.fullText.substring(0, 1000)}`;
          context += `\nWPM: ${session.transcript.wordsPerMinute}, Fillers: ${session.transcript.totalFillers}`;
        }
        if (session.aiAnalysis) {
          context += `\nOverall Score: ${session.aiAnalysis.overallScore}`;
          context += `\nFeedback: ${session.aiAnalysis.detailedFeedback.substring(0, 500)}`;
        }
      }
    } else if (contextType === "week") {
      const progress = await prisma.courseProgress.findUnique({
        where: { userId: user.id },
      });
      const weekSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          weekNumber: progress?.currentWeek || 1,
          status: "COMPLETED",
        },
        include: { aiAnalysis: true },
        orderBy: { dayNumber: "asc" },
      });
      context = `Current Phase: ${progress?.currentPhase || "VOLUME"}, Week: ${progress?.currentWeek || 1}`;
      context += `\nCompleted ${weekSessions.length} sessions this week.`;
      for (const s of weekSessions) {
        if (s.aiAnalysis) {
          context += `\nDay ${s.dayNumber}: Score ${s.aiAnalysis.overallScore}`;
        }
      }
    } else if (contextType === "all") {
      const progress = await prisma.courseProgress.findUnique({
        where: { userId: user.id },
      });
      const recentSessions = await prisma.session.findMany({
        where: { userId: user.id, status: "COMPLETED" },
        include: { aiAnalysis: true },
        orderBy: { date: "desc" },
        take: 10,
      });
      context = `Phase: ${progress?.currentPhase || "VOLUME"}, Week: ${progress?.currentWeek || 1}`;
      context += `\nTotal completed sessions: ${recentSessions.length}+`;
      const avgScore =
        recentSessions.length > 0
          ? recentSessions.reduce((sum: number, s: any) => sum + (s.aiAnalysis?.overallScore || 0), 0) /
            recentSessions.length
          : 0;
      context += `\nAverage recent score: ${avgScore.toFixed(1)}`;
    }

    // Save user message to DB
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === "user") {
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          sessionId: sessionId || null,
          role: "USER",
          content: lastUserMessage.content,
        },
      });
    }

    // Format messages for Grok
    const grokMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Get streaming response
    const stream = await chatWithCoach(grokMessages, context);

    // Create a transform stream to capture the full response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    // Process stream in background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          await writer.write(value);

          // Accumulate response text for DB save
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }

        // Save assistant response to DB
        if (fullResponse) {
          await prisma.chatMessage.create({
            data: {
              userId: user.id,
              sessionId: sessionId || null,
              role: "ASSISTANT",
              content: fullResponse,
            },
          });
        }
      } catch (err) {
        console.error("[chat] Stream processing error:", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("[chat] POST error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
