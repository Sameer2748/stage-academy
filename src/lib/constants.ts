// ─── Phase Configuration ─────────────────────────────────────────────────────

export const PHASES = {
  VOLUME: {
    label: "Volume",
    description: "Master projection and vocal power",
    color: "#FF6B35",
    bgColor: "rgba(255, 107, 53, 0.1)",
    borderColor: "rgba(255, 107, 53, 0.3)",
    icon: "volume-2",
    weeks: 3,
  },
  TONALITY: {
    label: "Tonality",
    description: "Develop vocal variety and emotional range",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    icon: "music",
    weeks: 3,
  },
  PAUSE: {
    label: "Pause",
    description: "Master the art of strategic silence",
    color: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    icon: "pause-circle",
    weeks: 3,
  },
  STORYTELLING: {
    label: "Storytelling",
    description: "Craft and deliver compelling narratives",
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    icon: "book-open",
    weeks: 3,
  },
} as const;

export type PhaseKey = keyof typeof PHASES;

// ─── Score Thresholds ────────────────────────────────────────────────────────

export const SCORE_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  FAIR: 55,
  NEEDS_WORK: 0,
} as const;

export const SCORE_COLORS = {
  EXCELLENT: "#10B981",
  GOOD: "#3B82F6",
  FAIR: "#F59E0B",
  NEEDS_WORK: "#EF4444",
} as const;

export const SCORE_LABELS = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  NEEDS_WORK: "Needs Work",
} as const;

// ─── Score Weights ───────────────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  volume: 0.2,
  tonality: 0.2,
  pause: 0.15,
  storytelling: 0.2,
  confidence: 0.25,
} as const;

// ─── Filler Words ────────────────────────────────────────────────────────────

export const FILLER_WORDS = [
  "um",
  "uh",
  "er",
  "ah",
  "like",
  "you know",
  "so",
  "basically",
  "actually",
  "literally",
  "right",
  "I mean",
  "sort of",
  "kind of",
] as const;

// ─── Days of Week ────────────────────────────────────────────────────────────

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAYS_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

// ─── UI Text ─────────────────────────────────────────────────────────────────

export const UI_TEXT = {
  APP_NAME: "Stage Academy",
  APP_TAGLINE: "Master the Art of Public Speaking",
  APP_DESCRIPTION:
    "A 12-week AI-powered public speaking improvement program with daily practice sessions, personalized feedback, and progress tracking.",

  // Dashboard
  DASHBOARD_TITLE: "Dashboard",
  DASHBOARD_WELCOME: "Welcome back",
  DASHBOARD_NO_SESSIONS: "No practice sessions yet. Start your first recording!",

  // Recording
  RECORDING_START: "Start Recording",
  RECORDING_STOP: "Stop Recording",
  RECORDING_PROCESSING: "Processing your recording...",
  RECORDING_COMPLETE: "Recording complete! Analyzing...",
  RECORDING_ERROR: "An error occurred during recording. Please try again.",
  RECORDING_PERMISSION_DENIED: "Microphone access is required to record.",
  RECORDING_MAX_DURATION: "Maximum recording duration reached.",

  // Analysis
  ANALYSIS_LOADING: "Analyzing your performance...",
  ANALYSIS_COMPLETE: "Analysis complete!",
  ANALYSIS_ERROR: "Analysis failed. Please try again.",

  // Chat
  CHAT_PLACEHOLDER: "Ask your AI coach anything...",
  CHAT_WELCOME:
    "Hi! I'm your AI speaking coach. Ask me about your performance, techniques, or anything related to public speaking.",

  // Plan
  PLAN_GENERATING: "Generating your weekly plan...",
  PLAN_EMPTY: "No plan generated yet for this week.",

  // Notifications
  NOTIFICATION_REMINDER_TITLE: "Time to Practice!",
  NOTIFICATION_REMINDER_BODY:
    "Your daily speaking practice is waiting. Just 5 minutes can make a difference!",
  NOTIFICATION_WEEKLY_REVIEW_TITLE: "Weekly Review Available",
  NOTIFICATION_WEEKLY_REVIEW_BODY:
    "Your weekly performance summary is ready. Check your progress!",
  NOTIFICATION_PHASE_COMPLETE_TITLE: "Phase Complete! 🎉",
  NOTIFICATION_PHASE_COMPLETE_BODY:
    "Congratulations on completing this phase! Time to level up.",

  // Errors
  ERROR_GENERIC: "Something went wrong. Please try again.",
  ERROR_UNAUTHORIZED: "Please sign in to continue.",
  ERROR_NOT_FOUND: "The requested resource was not found.",
  ERROR_RATE_LIMIT: "Too many requests. Please wait a moment.",
} as const;

// ─── API Limits ──────────────────────────────────────────────────────────────

export const LIMITS = {
  MAX_RECORDING_DURATION_SECONDS: 600, // 10 minutes
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  MAX_CHAT_MESSAGES_PER_SESSION: 50,
  PRESIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 1000,
  WEEKS_PER_PHASE: 3,
  DAYS_PER_WEEK: 7,
  TOTAL_WEEKS: 12,
} as const;

// ─── Grok Prompt Templates ──────────────────────────────────────────────────

export const PROMPTS = {
  SYSTEM_COACH: `You are an expert public speaking coach for the Stage Academy program. You analyze speech recordings and provide constructive, specific feedback. You are encouraging but honest. You focus on actionable improvements.`,

  SCORING_SYSTEM: `You are a speech analysis AI. Analyze the following transcript and provide scores and feedback in JSON format. Be precise and constructive.

Score each category from 0-100:
- volumeScore: Assess projection, vocal power, and volume variation
- tonalityScore: Assess vocal variety, pitch range, and emotional expressiveness
- pauseScore: Assess strategic use of pauses, pacing, and rhythm
- storytellingScore: Assess narrative structure, engagement, and coherence
- confidenceScore: Assess overall confidence, authority, and presence

Also provide:
- strengthsList: Array of 3-5 specific strengths observed
- improvementsList: Array of 3-5 specific areas for improvement
- detailedFeedback: 2-3 paragraph detailed analysis
- comparisonToPrevious: Brief note on progress (or "First session" if no previous data)
- nextSessionTip: One specific, actionable tip for next practice`,

  WEEKLY_PLAN_SYSTEM: `You are an AI curriculum designer for a public speaking improvement program. Generate a structured 7-day practice plan based on the current phase and week.`,

  INSIGHT_SYSTEM: `You are an AI that generates brief, motivational daily insights for public speaking students. Keep insights concise (1-2 sentences) and relevant to their current focus area.`,
} as const;
