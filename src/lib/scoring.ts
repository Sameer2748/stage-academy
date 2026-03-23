import { SCORE_WEIGHTS, SCORE_THRESHOLDS, SCORE_COLORS, SCORE_LABELS } from "./constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  volumeScore: number;
  tonalityScore: number;
  pauseScore: number;
  storytellingScore: number;
  confidenceScore: number;
  fillerPenalty?: number;
}

// ─── Filler Penalty ──────────────────────────────────────────────────────────

/**
 * Calculate the penalty for filler words.
 * 10 fillers = -1 point, 20 = -2, etc. Capped at -4.
 */
export function calculateFillerPenalty(totalFillers: number): number {
  if (totalFillers <= 0) return 0;
  const penalty = Math.floor(totalFillers / 10);
  return Math.min(penalty, 4);
}

// ─── Overall Score ───────────────────────────────────────────────────────────

/**
 * Calculate the weighted average score minus the filler penalty.
 * Returns a value between 0 and 100.
 */
export function calculateOverallScore(scores: ScoreBreakdown): number {
  const weightedSum =
    scores.volumeScore * SCORE_WEIGHTS.volume +
    scores.tonalityScore * SCORE_WEIGHTS.tonality +
    scores.pauseScore * SCORE_WEIGHTS.pause +
    scores.storytellingScore * SCORE_WEIGHTS.storytelling +
    scores.confidenceScore * SCORE_WEIGHTS.confidence;

  const penalty = scores.fillerPenalty ?? 0;
  const finalScore = Math.max(0, Math.min(100, weightedSum - penalty));

  return Math.round(finalScore * 10) / 10;
}

// ─── Score Color ─────────────────────────────────────────────────────────────

/**
 * Returns a hex color based on the score tier.
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return SCORE_COLORS.EXCELLENT;
  if (score >= SCORE_THRESHOLDS.GOOD) return SCORE_COLORS.GOOD;
  if (score >= SCORE_THRESHOLDS.FAIR) return SCORE_COLORS.FAIR;
  return SCORE_COLORS.NEEDS_WORK;
}

// ─── Score Label ─────────────────────────────────────────────────────────────

/**
 * Returns a human-readable label for the score tier.
 */
export function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return SCORE_LABELS.EXCELLENT;
  if (score >= SCORE_THRESHOLDS.GOOD) return SCORE_LABELS.GOOD;
  if (score >= SCORE_THRESHOLDS.FAIR) return SCORE_LABELS.FAIR;
  return SCORE_LABELS.NEEDS_WORK;
}

// ─── Score Formatting ────────────────────────────────────────────────────────

/**
 * Format a score to one decimal place with its label.
 */
export function formatScore(score: number): string {
  return `${score.toFixed(1)} - ${getScoreLabel(score)}`;
}

/**
 * Calculate percentage change between two scores.
 */
export function calculateScoreChange(
  current: number,
  previous: number
): { value: number; direction: "up" | "down" | "same" } {
  const diff = current - previous;
  const rounded = Math.round(diff * 10) / 10;
  return {
    value: Math.abs(rounded),
    direction: rounded > 0 ? "up" : rounded < 0 ? "down" : "same",
  };
}
