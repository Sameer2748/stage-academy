export type Phase =
  | "foundation"
  | "intermediate"
  | "advanced"
  | "mastery";

export interface SessionWithRelations {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  phase: Phase;
  week: number;
  day: number;
  audioUrl?: string | null;
  duration?: number | null;
  status: string;
  overallScore?: number | null;
  transcript?: TranscriptData | null;
  aiAnalysis?: AIAnalysisData | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export interface TranscriptData {
  id: string;
  sessionId: string;
  content: string;
  words?: TranscriptWord[];
  duration?: number | null;
  confidence?: number | null;
  createdAt: string | Date;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  isFiller?: boolean;
}

export interface AIAnalysisData {
  id: string;
  sessionId: string;
  overallScore: number;
  clarityScore: number;
  confidenceScore: number;
  structureScore: number;
  engagementScore: number;
  fillerWordCount: number;
  fillerWords: FillerWordInstance[];
  paceWPM: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  detailedFeedback?: DetailedFeedback | null;
  createdAt: string | Date;
}

export interface FillerWordInstance {
  word: string;
  count: number;
  timestamps?: number[];
}

export interface DetailedFeedback {
  opening?: string;
  bodyContent?: string;
  closing?: string;
  delivery?: string;
  languageUse?: string;
  suggestions?: string[];
}

export interface WeeklyPlanData {
  id: string;
  userId: string;
  phase: Phase;
  week: number;
  title: string;
  description: string;
  days: DayPlan[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface DayPlan {
  day: number;
  title: string;
  description: string;
  objectives: string[];
  exercises: string[];
  tips?: string[];
  estimatedDuration?: number;
  completed?: boolean;
}

export interface ChatMessageData {
  id: string;
  sessionId?: string | null;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string | Date;
}

export interface CourseProgressData {
  userId: string;
  currentPhase: Phase;
  currentWeek: number;
  currentDay: number;
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  streakDays: number;
  totalPracticeTime: number;
  phaseProgress: PhaseProgress[];
}

export interface PhaseProgress {
  phase: Phase;
  totalDays: number;
  completedDays: number;
  averageScore: number;
  isUnlocked: boolean;
  isCurrent: boolean;
}

export interface DailyLogData {
  id: string;
  userId: string;
  date: string;
  phase: Phase;
  week: number;
  day: number;
  sessionId?: string | null;
  completed: boolean;
  score?: number | null;
  notes?: string | null;
  practiceTime?: number | null;
  createdAt: string | Date;
}

export interface AnalyticsData {
  totalSessions: number;
  totalPracticeTime: number;
  averageScore: number;
  averageClarity: number;
  averageConfidence: number;
  averageStructure: number;
  averageEngagement: number;
  averagePaceWPM: number;
  averageFillerCount: number;
  scoreHistory: ScoreDataPoint[];
  paceHistory: PaceDataPoint[];
  fillerHistory: FillerDataPoint[];
  sessionsByPhase: Record<Phase, number>;
  streakDays: number;
  bestScore: number;
  improvementRate: number;
}

export interface ScoreDataPoint {
  date: string;
  score: number;
  sessionId: string;
}

export interface PaceDataPoint {
  date: string;
  wpm: number;
  sessionId: string;
}

export interface FillerDataPoint {
  date: string;
  count: number;
  sessionId: string;
}

// API request types
export interface CreateSessionRequest {
  title: string;
  description?: string;
  phase: Phase;
  week: number;
  day: number;
}

export interface SubmitAudioRequest {
  sessionId: string;
  audioBlob: Blob;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: string;
}

export interface ChatResponse {
  message: ChatMessageData;
  sessionId?: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
