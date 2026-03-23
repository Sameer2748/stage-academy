import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

interface AIReviewRequest {
  transcript: string;
  focusArea: string;
  taskDescription: string;
  taskTitle: string;
  duration: number;
}

interface AIReviewResponse {
  overallScore: number;
  volumeScore: number;
  tonalityScore: number;
  pauseScore: number;
  storytellingScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  focusAreaFeedback: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const body: AIReviewRequest = await req.json();
    const { transcript, focusArea, taskDescription, taskTitle, duration } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      );
    }

    // Reject error/placeholder transcripts
    const isInvalidTranscript =
      transcript.startsWith("[") ||
      transcript.trim().length < 10;

    if (isInvalidTranscript) {
      return NextResponse.json(
        { error: "Cannot review — no valid speech was detected in the recording. Please record again and speak clearly." },
        { status: 400 }
      );
    }

    const durationMinutes = Math.round((duration || 0) / 60);
    const wordCount = transcript.trim().split(/\s+/).length;

    const systemPrompt = `You are an expert voice and communication coach specializing in Vinh Giang's Stage Academy methodology. You analyze speech transcripts and provide detailed, constructive feedback.

CRITICAL RULES:
- ONLY score based on what is ACTUALLY in the transcript. Do NOT invent or assume anything.
- If the transcript is very short (under 20 words), give low scores and note that more speech is needed for a proper evaluation.
- Every strength and improvement MUST reference specific words/phrases from the transcript. No generic advice.
- Be brutally honest. A 5-second mumble should score 10-20, not 50-60.

You evaluate across these dimensions:
- **Volume**: Vocal projection, dynamic range, use of loud/soft for emphasis
- **Tonality**: Vocal variety, emotional expressiveness, pitch modulation
- **Pause**: Strategic use of silence, pacing, breathing room between ideas
- **Storytelling**: Structure, engagement, narrative flow, audience connection

Score each dimension from 0-100 where:
- 0-30: Needs significant work
- 31-50: Below average, clear areas for improvement
- 51-70: Average, solid foundation with room to grow
- 71-85: Good, shows skill and awareness
- 86-100: Excellent, demonstrates mastery

Be honest but encouraging. Provide specific, actionable feedback.`;

    const userPrompt = `Analyze this speech recording transcript and provide a detailed review.

**Task**: ${taskTitle}
**Description**: ${taskDescription}
**Focus Area**: ${focusArea}
**Duration**: ${durationMinutes} minute(s)
**Word Count**: ${wordCount} words

**Transcript**:
${transcript}

IMPORTANT: This transcript has ${wordCount} words. Score proportionally — a ${wordCount}-word transcript cannot demonstrate mastery. Be precise and reference ONLY what exists in the text above.

Return ONLY a JSON object (no other text) with exactly these keys:
{
  "overallScore": <number 0-100>,
  "volumeScore": <number 0-100>,
  "tonalityScore": <number 0-100>,
  "pauseScore": <number 0-100>,
  "storytellingScore": <number 0-100>,
  "strengths": [<array of 2-4 specific strength observations>],
  "improvements": [<array of 2-4 specific, actionable improvement suggestions>],
  "detailedFeedback": "<2-3 paragraphs of detailed analysis covering all dimensions>",
  "focusAreaFeedback": "<1-2 paragraphs specifically about their performance in the '${focusArea}' area, with concrete exercises or tips to improve>"
}

Important: The overallScore should be a weighted average, giving extra weight to the focus area (${focusArea}). Be specific — reference actual phrases or patterns from the transcript when possible.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ai-review] Groq API error:", aiResponse.status, errorText);
      return NextResponse.json(
        { error: `AI review service error: ${aiResponse.status}` },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (may be wrapped in markdown code blocks)
    let review: AIReviewResponse;
    try {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : content;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      review = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[ai-review] Failed to parse Grok response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI review response" },
        { status: 502 }
      );
    }

    // Validate and clamp scores
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));
    review.overallScore = clamp(review.overallScore);
    review.volumeScore = clamp(review.volumeScore);
    review.tonalityScore = clamp(review.tonalityScore);
    review.pauseScore = clamp(review.pauseScore);
    review.storytellingScore = clamp(review.storytellingScore);
    review.strengths = Array.isArray(review.strengths) ? review.strengths : [];
    review.improvements = Array.isArray(review.improvements) ? review.improvements : [];
    review.detailedFeedback = review.detailedFeedback || "";
    review.focusAreaFeedback = review.focusAreaFeedback || "";

    return NextResponse.json({ review });
  } catch (error) {
    console.error("[ai-review] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
