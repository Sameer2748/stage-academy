import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { text } = await req.json();

    if (!text || text.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a description of what to schedule" },
        { status: 400 }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

    const systemPrompt = `You are a smart daily planner assistant. The user will describe tasks they want to schedule in natural language. You must parse their input and return structured time blocks.

Today is ${dayOfWeek}, ${todayStr}.

RULES:
- Parse dates intelligently: "today" = ${todayStr}, "tomorrow" = next day, "yesterday" = previous day, specific dates like "25 march 2026" should be converted to YYYY-MM-DD format.
- Parse times: "6am" = "06:00", "6:30pm" = "18:30", "noon" = "12:00", "midnight" = "00:00". Use 24h HH:MM format.
- If no end time is given, assume 1 hour duration.
- If no date is given, assume today (${todayStr}).
- Categorize tasks: "running", "gym", "yoga", "workout" → "health"; "study", "read", "course", "learn" → "learning"; "meeting", "call", "code", "work", "office" → "work"; "movie", "friends", "family", "relax" → "personal"; anything else → "other".
- If user gives multiple tasks in one message, create multiple time blocks.
- If user says something vague like "plan my morning routine", create sensible blocks.

Return ONLY a JSON object (no other text):
{
  "blocks": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "short title",
      "description": "brief description if any",
      "category": "work" | "personal" | "learning" | "health" | "other"
    }
  ],
  "summary": "one-line summary of what was scheduled"
}`;

    const aiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ai-planner] Groq API error:", aiResponse.status, errorText);
      return NextResponse.json(
        { error: `AI service error: ${aiResponse.status}` },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : content;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[ai-planner] Failed to parse response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response. Try rephrasing." },
        { status: 502 }
      );
    }

    // Validate blocks
    if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      return NextResponse.json(
        { error: "Could not understand the schedule. Try being more specific, e.g. '6am to 7am running tomorrow'" },
        { status: 400 }
      );
    }

    const validCategories = ["work", "personal", "learning", "health", "other"];
    parsed.blocks = parsed.blocks.map((b: any) => ({
      date: b.date || todayStr,
      startTime: b.startTime || "09:00",
      endTime: b.endTime || "10:00",
      title: b.title || "Untitled",
      description: b.description || "",
      category: validCategories.includes(b.category) ? b.category : "other",
    }));

    return NextResponse.json({
      blocks: parsed.blocks,
      summary: parsed.summary || `Scheduled ${parsed.blocks.length} task(s)`,
    });
  } catch (error) {
    console.error("[ai-planner] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
