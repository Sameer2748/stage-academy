import prisma from "./prisma";
import { analyseTranscript } from "./grok";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

interface DeepgramParagraph {
  sentences: { text: string; start: number; end: number }[];
  speaker?: number;
  num_words: number;
  start: number;
  end: number;
}

interface DeepgramSentiment {
  sentiment: "positive" | "negative" | "neutral";
  sentiment_score: number;
  text: string;
}

interface FillerWordBreakdown {
  [word: string]: number;
}

interface TranscriptionResult {
  fullText: string;
  fillerWordCount: FillerWordBreakdown;
  totalFillers: number;
  wordsPerMinute: number;
  sentimentScore: number;
  confidenceScore: number;
  paragraphs: DeepgramParagraph[];
  deepgramJson: Record<string, unknown>;
}

// ─── Filler Word Detection ───────────────────────────────────────────────────

const FILLER_PATTERNS = [
  "um",
  "uh",
  "er",
  "ah",
  "hmm",
  "like",
  "you know",
  "so",
  "basically",
  "actually",
  "literally",
  "right",
  "i mean",
  "sort of",
  "kind of",
];

function countFillerWords(words: DeepgramWord[]): {
  breakdown: FillerWordBreakdown;
  total: number;
} {
  const breakdown: FillerWordBreakdown = {};
  let total = 0;

  for (const w of words) {
    const lower = w.word.toLowerCase().replace(/[.,!?]/g, "");
    if (FILLER_PATTERNS.includes(lower)) {
      breakdown[lower] = (breakdown[lower] || 0) + 1;
      total++;
    }
  }

  return { breakdown, total };
}

// ─── Sentiment Calculation ───────────────────────────────────────────────────

function calculateSentiment(
  sentiments: DeepgramSentiment[] | undefined
): number {
  if (!sentiments || sentiments.length === 0) return 0;

  const sum = sentiments.reduce((acc, s) => acc + s.sentiment_score, 0);
  return Math.round((sum / sentiments.length) * 100) / 100;
}

// ─── WPM Calculation ─────────────────────────────────────────────────────────

function calculateWPM(words: DeepgramWord[]): number {
  if (words.length < 2) return 0;
  const durationMinutes =
    (words[words.length - 1].end - words[0].start) / 60;
  if (durationMinutes <= 0) return 0;
  return Math.round(words.length / durationMinutes);
}

// ─── Main Transcription Function ─────────────────────────────────────────────

/**
 * Send an audio URL to Deepgram for transcription, parse the result,
 * save the Transcript to the database, and trigger AI analysis.
 */
export async function transcribeFromS3(
  s3Url: string,
  sessionId: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set");
  }

  // Update session status to processing
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "PROCESSING" },
  });

  try {
    // Call Deepgram REST API
    const queryParams = new URLSearchParams({
      model: "nova-2",
      punctuate: "true",
      paragraphs: "true",
      utterances: "true",
      filler_words: "true",
      sentiment: "true",
      smart_format: "true",
    });

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?${queryParams.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: s3Url }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Deepgram API error ${response.status}: ${errorBody}`
      );
    }

    const deepgramJson = await response.json();

    // Extract data from response
    const channel = deepgramJson.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative) {
      throw new Error("No transcription results from Deepgram");
    }

    const fullText: string = alternative.transcript || "";
    const words: DeepgramWord[] = alternative.words || [];
    const paragraphsData: DeepgramParagraph[] =
      alternative.paragraphs?.paragraphs || [];
    const sentiments: DeepgramSentiment[] =
      deepgramJson.results?.sentiments?.segments || [];

    // Calculate metrics
    const { breakdown: fillerWordCount, total: totalFillers } =
      countFillerWords(words);
    const wordsPerMinute = calculateWPM(words);
    const sentimentScore = calculateSentiment(sentiments);

    // Average confidence across all words
    const confidenceScore =
      words.length > 0
        ? Math.round(
            (words.reduce((acc, w) => acc + w.confidence, 0) /
              words.length) *
              100
          ) / 100
        : 0;

    const result: TranscriptionResult = {
      fullText,
      fillerWordCount,
      totalFillers,
      wordsPerMinute,
      sentimentScore,
      confidenceScore,
      paragraphs: paragraphsData,
      deepgramJson,
    };

    // Save transcript to database
    await prisma.transcript.create({
      data: {
        sessionId,
        fullText,
        deepgramJson,
        fillerWordCount,
        totalFillers,
        wordsPerMinute,
        sentimentScore,
        confidenceScore,
        paragraphs: paragraphsData as any,
      },
    });

    // Update session status
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });

    // Trigger AI analysis (fire and forget, errors are logged)
    analyseTranscript(sessionId).catch((err) => {
      console.error(
        `[deepgram] AI analysis failed for session ${sessionId}:`,
        err
      );
    });

    return result;
  } catch (error) {
    // Mark session as failed
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "FAILED" },
    });

    throw error;
  }
}
