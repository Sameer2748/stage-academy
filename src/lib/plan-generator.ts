import { PHASES, type PhaseKey } from "./constants";
import { generateWeeklyPlan as grokGenerateWeeklyPlan } from "./grok";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanDay {
  dayNumber: number;
  date: string; // ISO date string
  title: string;
  description: string;
  prompt: string;
  durationMinutes: number;
  focusArea: string;
  tips: string[];
  isCompleted: boolean;
  isRestDay: boolean;
}

export interface WeeklyPlanData {
  weekNumber: number;
  phase: string;
  days: PlanDay[];
  isAIGenerated: boolean;
}

// ─── Default Prompts Per Phase ───────────────────────────────────────────────

const DEFAULT_PROMPTS: Record<PhaseKey, string[]> = {
  VOLUME: [
    "Record yourself reading a paragraph from a book, focusing on projecting your voice as if speaking to a large room.",
    "Tell a 2-minute story about your weekend while gradually increasing your volume from quiet to powerful.",
    "Practice the phrase 'I am confident and my voice carries power' at 5 different volume levels.",
    "Deliver a 3-minute impromptu speech on any topic, ensuring your voice fills the room.",
    "Read a motivational quote loudly and with conviction, then record yourself whispering it - notice the control.",
    "Describe your favorite place in detail for 3 minutes, projecting as if to an audience of 100.",
    "Reflect on the week's progress. Record a 2-minute summary of what you learned about vocal projection.",
  ],
  TONALITY: [
    "Read a children's story using exaggerated vocal variety - high excitement, low mystery, everything in between.",
    "Tell the same 1-minute story three times: once sad, once excited, once mysterious.",
    "Practice saying 'This is important' with 5 different emotional tones and explain each choice.",
    "Deliver a 3-minute speech about something you're passionate about, focusing on pitch variation.",
    "Read a news article as if you're a dramatic narrator - emphasize key words and vary your tone.",
    "Record yourself having a pretend phone call where you convey excitement, concern, then relief.",
    "Weekly reflection: Record a 2-minute analysis of your tonality progress and what feels natural now.",
  ],
  PAUSE: [
    "Read a famous speech (e.g., MLK or Churchill) and insert deliberate 2-3 second pauses after key points.",
    "Tell a joke or funny story, using pauses for comedic timing. Record it twice with different pause placements.",
    "Give a 3-minute presentation where you count to 3 silently between each major idea.",
    "Practice the 'rule of three' pattern: state three points with dramatic pauses between each.",
    "Deliver a persuasive argument about any topic, using silence instead of filler words at every transition.",
    "Tell a suspenseful story with at least 5 strategic pauses that build tension.",
    "Weekly reflection: Record what you learned about the power of silence and how pauses changed your delivery.",
  ],
  STORYTELLING: [
    "Tell a personal story from your childhood in under 3 minutes with a clear beginning, middle, and end.",
    "Take a mundane daily event and make it into a compelling 2-minute story with vivid details.",
    "Practice the 'hero's journey' structure: describe a challenge you faced, the struggle, and the resolution.",
    "Tell a story using the 'but and therefore' technique - avoid 'and then' transitions.",
    "Deliver a 3-minute story that teaches a lesson, using sensory language (sight, sound, smell, touch, taste).",
    "Retell a well-known story (fairy tale, movie plot) in your own words with personal flair.",
    "Weekly reflection: Record your best story of the week, incorporating all techniques you've learned.",
  ],
};

// ─── Default Plan Generator ──────────────────────────────────────────────────

/**
 * Create a default 7-day plan without AI.
 * Uses pre-written prompts for each phase.
 */
export function generateDefaultPlan(
  weekNumber: number,
  phase: string,
  startDate: Date
): WeeklyPlanData {
  const phaseKey = phase as PhaseKey;
  const phaseConfig = PHASES[phaseKey];
  const prompts = DEFAULT_PROMPTS[phaseKey] || DEFAULT_PROMPTS.VOLUME;

  const days: PlanDay[] = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + i);

    const isRestDay = i === 6; // Day 7 is lighter / reflection

    days.push({
      dayNumber: i + 1,
      date: dayDate.toISOString().split("T")[0],
      title: isRestDay
        ? "Weekly Reflection"
        : `${phaseConfig?.label || phase} Practice - Day ${i + 1}`,
      description: isRestDay
        ? "Reflect on the week's progress and consolidate your learning."
        : `Focus on ${(phaseConfig?.label || phase).toLowerCase()} skills with today's exercise.`,
      prompt: prompts[i % prompts.length],
      durationMinutes: isRestDay ? 3 : 5,
      focusArea: phaseConfig?.label || phase,
      tips: getDefaultTips(phaseKey, i + 1),
      isCompleted: false,
      isRestDay,
    });
  }

  return {
    weekNumber,
    phase,
    days,
    isAIGenerated: false,
  };
}

// ─── Default Tips ────────────────────────────────────────────────────────────

function getDefaultTips(phase: PhaseKey, dayNumber: number): string[] {
  const baseTips: Record<PhaseKey, string[]> = {
    VOLUME: [
      "Stand up while recording for better breath support",
      "Breathe from your diaphragm, not your chest",
      "Imagine your voice reaching the back of a large hall",
    ],
    TONALITY: [
      "Exaggerate more than you think - it often sounds natural to listeners",
      "Record yourself and listen back to notice your pitch patterns",
      "Try matching the emotion of your content with your vocal tone",
    ],
    PAUSE: [
      "Silence feels longer to you than it does to your audience",
      "Use pauses before and after key points for emphasis",
      "Replace every 'um' and 'uh' with a confident pause",
    ],
    STORYTELLING: [
      "Start with a hook - drop your audience into the middle of the action",
      "Use specific details instead of vague descriptions",
      "Every story needs conflict or tension to be engaging",
    ],
  };

  const tips = baseTips[phase] || baseTips.VOLUME;

  // Rotate tips slightly based on day
  const start = (dayNumber - 1) % tips.length;
  return [
    tips[start],
    tips[(start + 1) % tips.length],
  ];
}

// ─── AI-Adjusted Plan ────────────────────────────────────────────────────────

/**
 * Use Grok to adjust an existing plan based on user feedback.
 */
export async function adjustPlanWithAI(
  currentPlan: WeeklyPlanData,
  feedback: string
): Promise<WeeklyPlanData> {
  const adjustedDays = await grokGenerateWeeklyPlan(
    "", // userId not needed for plan adjustment prompt
    currentPlan.weekNumber,
    currentPlan.phase
  );

  // Merge AI-generated days with existing plan structure
  const days: PlanDay[] = adjustedDays.map((aiDay, i) => ({
    dayNumber: aiDay.dayNumber,
    date: currentPlan.days[i]?.date || new Date().toISOString().split("T")[0],
    title: aiDay.title,
    description: aiDay.description,
    prompt: aiDay.prompt,
    durationMinutes: aiDay.durationMinutes,
    focusArea: aiDay.focusArea,
    tips: aiDay.tips,
    isCompleted: currentPlan.days[i]?.isCompleted || false,
    isRestDay: aiDay.dayNumber === 7,
  }));

  return {
    weekNumber: currentPlan.weekNumber,
    phase: currentPlan.phase,
    days,
    isAIGenerated: true,
  };
}
