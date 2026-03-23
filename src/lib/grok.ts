import prisma from "./prisma";
import { PROMPTS, LIMITS } from "./constants";
import {
  calculateFillerPenalty,
  calculateOverallScore,
  type ScoreBreakdown,
} from "./scoring";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GrokOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

interface GrokAnalysisResponse {
  volumeScore: number;
  tonalityScore: number;
  pauseScore: number;
  storytellingScore: number;
  confidenceScore: number;
  strengthsList: string[];
  improvementsList: string[];
  detailedFeedback: string;
  comparisonToPrevious: string;
  nextSessionTip: string;
}

interface WeeklyPlanDay {
  dayNumber: number;
  title: string;
  description: string;
  prompt: string;
  durationMinutes: number;
  focusArea: string;
  tips: string[];
}

interface SessionInsight {
  insight: string;
  focusArea: string;
  encouragement: string;
}

// ─── Core API Caller ─────────────────────────────────────────────────────────

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL = "grok-3";

/**
 * Call the Grok API with retry logic (3 retries, exponential backoff).
 */
export async function callGrok(
  messages: GrokMessage[],
  options: GrokOptions = {}
): Promise<Response> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set");
  }

  const { stream = false, temperature = 0.7, maxTokens } = options;

  const body: Record<string, unknown> = {
    model: GROK_MODEL,
    messages,
    temperature,
    stream,
  };

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < LIMITS.MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return response;
      }

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorBody = await response.text();
        throw new Error(
          `Grok API client error ${response.status}: ${errorBody}`
        );
      }

      const errorBody = await response.text();
      lastError = new Error(
        `Grok API error ${response.status}: ${errorBody}`
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If it's a non-retryable client error, throw immediately
      if (lastError.message.includes("client error")) {
        throw lastError;
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < LIMITS.MAX_RETRIES - 1) {
      const delay = LIMITS.RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Grok API call failed after retries");
}

// ─── Helper to extract JSON from Grok response ──────────────────────────────

function extractJson<T>(text: string): T {
  // Try to find JSON in markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim()) as T;
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as T;
  }

  throw new Error("No valid JSON found in Grok response");
}

// ─── Analyse Transcript ──────────────────────────────────────────────────────

/**
 * Load session + transcript from DB, send to Grok for scoring,
 * parse the response, and save AIAnalysis to the database.
 */
export async function analyseTranscript(sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      transcript: true,
      user: {
        include: {
          sessions: {
            where: {
              id: { not: sessionId },
              status: "COMPLETED",
            },
            include: { aiAnalysis: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (!session.transcript) {
    throw new Error(`No transcript found for session ${sessionId}`);
  }

  const transcript = session.transcript;
  const previousSession = session.user.sessions[0];
  const previousAnalysis = previousSession?.aiAnalysis;

  // Build the prompt
  const contextParts: string[] = [
    `Phase: ${session.phase}`,
    `Week: ${session.weekNumber}, Day: ${session.dayNumber}`,
    `Recording Prompt: ${session.recordingPrompt}`,
    `Words Per Minute: ${transcript.wordsPerMinute}`,
    `Total Filler Words: ${transcript.totalFillers}`,
    `Filler Breakdown: ${JSON.stringify(transcript.fillerWordCount)}`,
    `Confidence (Deepgram): ${transcript.confidenceScore}`,
    `Sentiment Score: ${transcript.sentimentScore}`,
  ];

  if (previousAnalysis) {
    contextParts.push(
      `\nPrevious Session Scores:`,
      `  Overall: ${previousAnalysis.overallScore}`,
      `  Volume: ${previousAnalysis.volumeScore}`,
      `  Tonality: ${previousAnalysis.tonalityScore}`,
      `  Pause: ${previousAnalysis.pauseScore}`,
      `  Storytelling: ${previousAnalysis.storytellingScore}`,
      `  Confidence: ${previousAnalysis.confidenceScore}`
    );
  }

  const messages: GrokMessage[] = [
    { role: "system", content: PROMPTS.SCORING_SYSTEM },
    {
      role: "user",
      content: `Context:\n${contextParts.join("\n")}\n\nTranscript:\n${transcript.fullText}\n\nProvide your analysis as a JSON object with these exact keys: volumeScore, tonalityScore, pauseScore, storytellingScore, confidenceScore, strengthsList, improvementsList, detailedFeedback, comparisonToPrevious, nextSessionTip`,
    },
  ];

  const response = await callGrok(messages, { temperature: 0.4 });
  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content || "";

  const analysis = extractJson<GrokAnalysisResponse>(content);

  // Calculate filler penalty and overall score
  const fillerPenalty = calculateFillerPenalty(transcript.totalFillers);
  const scores: ScoreBreakdown = {
    volumeScore: analysis.volumeScore,
    tonalityScore: analysis.tonalityScore,
    pauseScore: analysis.pauseScore,
    storytellingScore: analysis.storytellingScore,
    confidenceScore: analysis.confidenceScore,
    fillerPenalty,
  };
  const overallScore = calculateOverallScore(scores);

  // Save to database
  await prisma.aIAnalysis.create({
    data: {
      sessionId,
      overallScore,
      volumeScore: analysis.volumeScore,
      tonalityScore: analysis.tonalityScore,
      pauseScore: analysis.pauseScore,
      storytellingScore: analysis.storytellingScore,
      confidenceScore: analysis.confidenceScore,
      fillerPenalty,
      strengthsList: analysis.strengthsList,
      improvementsList: analysis.improvementsList,
      detailedFeedback: analysis.detailedFeedback,
      comparisonToPrevious:
        analysis.comparisonToPrevious || "First session",
      nextSessionTip: analysis.nextSessionTip || "",
    },
  });
}

// ─── Generate Weekly Plan ────────────────────────────────────────────────────

/**
 * Generate a weekly practice plan using Grok.
 */
export async function generateWeeklyPlan(
  userId: string,
  weekNumber: number,
  phase: string
): Promise<WeeklyPlanDay[]> {
  // Get recent session data for context
  const recentSessions = await prisma.session.findMany({
    where: { userId, status: "COMPLETED" },
    include: { aiAnalysis: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const sessionContext =
    recentSessions.length > 0
      ? recentSessions
          .map(
            (s) =>
              `Session (Week ${s.weekNumber} Day ${s.dayNumber}): Overall ${s.aiAnalysis?.overallScore ?? "N/A"}`
          )
          .join("\n")
      : "No previous sessions yet.";

  const messages: GrokMessage[] = [
    { role: "system", content: PROMPTS.WEEKLY_PLAN_SYSTEM },
    {
      role: "user",
      content: `Generate a 7-day practice plan for Week ${weekNumber} of the ${phase} phase.

Recent performance:
${sessionContext}

Return a JSON array of 7 objects, each with these keys:
- dayNumber (1-7)
- title (short title for the day)
- description (1-2 sentences about the day's focus)
- prompt (the specific speaking prompt/exercise)
- durationMinutes (suggested practice duration, 3-10 minutes)
- focusArea (primary skill focus)
- tips (array of 2-3 practical tips)`,
    },
  ];

  const response = await callGrok(messages, { temperature: 0.6 });
  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content || "";

  const days = extractJson<WeeklyPlanDay[]>(content);

  // Ensure we have exactly 7 days
  if (!Array.isArray(days) || days.length !== 7) {
    throw new Error("Grok did not return exactly 7 days for the plan");
  }

  return days;
}

// ─── Chat with Coach ─────────────────────────────────────────────────────────

/**
 * Stream a chat response from the AI coach.
 * Returns a ReadableStream for SSE streaming.
 */
export async function chatWithCoach(
  messages: GrokMessage[],
  context: string
): Promise<ReadableStream<Uint8Array>> {
  const systemMessage: GrokMessage = {
    role: "system",
    content: `${PROMPTS.SYSTEM_COACH}\n\nContext about the student:\n${context}`,
  };

  const response = await callGrok([systemMessage, ...messages], {
    stream: true,
    temperature: 0.7,
  });

  if (!response.body) {
    throw new Error("No response body from Grok streaming");
  }

  return response.body;
}

// ─── Generate Insight ────────────────────────────────────────────────────────

/**
 * Generate a daily insight based on session data.
 */
export async function generateInsight(sessionData: {
  phase: string;
  weekNumber: number;
  dayNumber: number;
  overallScore?: number;
  strengths?: string[];
  improvements?: string[];
}): Promise<SessionInsight> {
  const messages: GrokMessage[] = [
    { role: "system", content: PROMPTS.INSIGHT_SYSTEM },
    {
      role: "user",
      content: `Generate a brief daily insight for a student in the ${sessionData.phase} phase, Week ${sessionData.weekNumber}, Day ${sessionData.dayNumber}.
${sessionData.overallScore ? `Their latest score: ${sessionData.overallScore}` : ""}
${sessionData.strengths ? `Strengths: ${sessionData.strengths.join(", ")}` : ""}
${sessionData.improvements ? `Areas to improve: ${sessionData.improvements.join(", ")}` : ""}

Return a JSON object with: insight (1-2 sentences), focusArea (single word/phrase), encouragement (1 sentence)`,
    },
  ];

  const response = await callGrok(messages, { temperature: 0.8 });
  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content || "";

  return extractJson<SessionInsight>(content);
}
