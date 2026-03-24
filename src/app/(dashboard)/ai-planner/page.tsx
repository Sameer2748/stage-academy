"use client";

import { useState, useRef, useCallback } from "react";
import {
  Sparkles,
  Mic,
  Square,
  Send,
  Check,
  Clock,
  Calendar,
  Plus,
  Loader2,
  Trash2,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────

type Category = "work" | "personal" | "learning" | "health" | "other";

interface ParsedBlock {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  category: Category;
}

interface TimeBlock extends ParsedBlock {
  id: string;
  completed: boolean;
}

interface DailyPlan {
  date: string;
  blocks: TimeBlock[];
  references: { id: string; title: string; url?: string; note?: string }[];
  journalRecorded: boolean;
  journalDuration: number;
  journalUrl?: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  Category,
  { label: string; dot: string; bg: string; border: string; text: string }
> = {
  work: {
    label: "Work",
    dot: "bg-blue-400",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-600",
  },
  personal: {
    label: "Personal",
    dot: "bg-purple-400",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-600",
  },
  learning: {
    label: "Learning",
    dot: "bg-indigo-400",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-600",
  },
  health: {
    label: "Health",
    dot: "bg-emerald-400",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-600",
  },
  other: {
    label: "Other",
    dot: "bg-zinc-400",
    bg: "bg-zinc-50",
    border: "border-zinc-200",
    text: "text-zinc-600",
  },
};

const EXAMPLE_PROMPTS = [
  "Schedule 6am to 7am running tomorrow",
  "Plan my morning: 6am yoga, 7am breakfast, 8am study",
  "Meeting at 2pm to 3:30pm today, then gym at 5pm",
  "Study React from 10am to 12pm on 25 March 2026",
];

// ─── Helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function storageKey(date: string): string {
  return `daily-plan-${date}`;
}

function loadPlan(date: string): DailyPlan {
  if (typeof window === "undefined")
    return { date, blocks: [], references: [], journalRecorded: false, journalDuration: 0 };
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { date, blocks: [], references: [], journalRecorded: false, journalDuration: 0 };
}

function savePlan(plan: DailyPlan) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(plan.date), JSON.stringify(plan));
  } catch {}
}

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────

export default function AiPlannerPage() {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Voice Recording ────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) {
          setError("Recording too short. Please try again.");
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Transcription failed");
          if (data.transcript) {
            setInput((prev) => (prev ? prev + " " + data.transcript : data.transcript));
            textareaRef.current?.focus();
          } else {
            setError("Could not transcribe audio. Please try again or type instead.");
          }
        } catch (err: any) {
          setError(err.message || "Transcription failed");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ─── AI Parse ───────────────────────────────────────────────────

  const handleParse = useCallback(async () => {
    const text = input.trim();
    if (!text || text.length < 3) {
      setError("Please describe what you want to schedule.");
      return;
    }

    setError("");
    setParsedBlocks([]);
    setSummary("");
    setSavedMessage("");
    setIsParsing(true);

    try {
      const res = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse schedule");

      setParsedBlocks(data.blocks || []);
      setSummary(data.summary || "");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsParsing(false);
    }
  }, [input]);

  // ─── Remove Block ───────────────────────────────────────────────

  const removeBlock = useCallback((index: number) => {
    setParsedBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ─── Save to Daily Planner ─────────────────────────────────────

  const saveToPlanner = useCallback(() => {
    if (parsedBlocks.length === 0) return;

    const blocksByDate: Record<string, ParsedBlock[]> = {};
    for (const block of parsedBlocks) {
      const date = block.date;
      if (!blocksByDate[date]) blocksByDate[date] = [];
      blocksByDate[date].push(block);
    }

    let totalAdded = 0;
    for (const [date, blocks] of Object.entries(blocksByDate)) {
      const plan = loadPlan(date);
      for (const b of blocks) {
        plan.blocks.push({
          ...b,
          id: generateId(),
          completed: false,
        });
      }
      // Sort by start time
      plan.blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
      savePlan(plan);
      totalAdded += blocks.length;
    }

    const dates = Object.keys(blocksByDate);
    const dateStr =
      dates.length === 1
        ? formatDateDisplay(dates[0])
        : `${dates.length} different days`;

    setSavedMessage(`Added ${totalAdded} task${totalAdded > 1 ? "s" : ""} to ${dateStr}`);
    setParsedBlocks([]);
    setSummary("");
    setInput("");

    setTimeout(() => setSavedMessage(""), 4000);
  }, [parsedBlocks]);

  // ─── Key Handler ────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-24 sm:p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">AI Planner</h1>
            <p className="text-sm text-slate-500">
              Describe your schedule and AI will organize it for you
            </p>
          </div>
        </div>
      </div>

      {/* Input Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Schedule 6am to 7am running tomorrow, then study from 8am to 10am..."
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-24 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Voice Button */}
            {isTranscribing ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span className="text-xs text-indigo-600">Transcribing...</span>
              </div>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Square className="h-3.5 w-3.5 fill-red-500" />
                <span className="text-xs font-medium">{formatSeconds(recordingTime)}</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Record voice"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}

            {/* Send Button */}
            <Button
              onClick={handleParse}
              disabled={isParsing || !input.trim()}
              size="sm"
              className="h-8 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isParsing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">Plan</span>
            </Button>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Press Enter to send, Shift+Enter for new line. Or use the mic to speak.
        </p>
      </div>

      {/* Example Prompts */}
      {parsedBlocks.length === 0 && !isParsing && !error && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Try saying
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setInput(prompt);
                  textareaRef.current?.focus();
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Confirmation */}
      <AnimatePresence>
        {savedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            <Check className="h-4 w-4" />
            {savedMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isParsing && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-12 shadow-sm">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-sm text-slate-500">AI is parsing your schedule...</p>
        </div>
      )}

      {/* Parsed Results */}
      <AnimatePresence>
        {parsedBlocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            {summary && (
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5">
                <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                <p className="text-sm text-indigo-700">{summary}</p>
              </div>
            )}

            {/* Blocks */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-medium text-slate-900">
                  Parsed Tasks ({parsedBlocks.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Review and add to your planner
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {parsedBlocks.map((block, i) => {
                  const cat = CATEGORY_CONFIG[block.category] || CATEGORY_CONFIG.other;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      {/* Category dot */}
                      <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${cat.dot}`} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-900">
                            {block.title}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.bg} ${cat.text} ${cat.border} border`}
                          >
                            {cat.label}
                          </span>
                        </div>

                        {block.description && (
                          <p className="mt-0.5 text-xs text-slate-500">{block.description}</p>
                        )}

                        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateDisplay(block.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime12(block.startTime)} – {formatTime12(block.endTime)}
                          </span>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeBlock(i)}
                        className="mt-1 rounded-md p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={saveToPlanner}
                className="flex-1 gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add {parsedBlocks.length} Task{parsedBlocks.length > 1 ? "s" : ""} to Planner
              </Button>
              <Button
                onClick={() => {
                  setParsedBlocks([]);
                  setSummary("");
                }}
                variant="outline"
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
      {parsedBlocks.length === 0 && !isParsing && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-slate-900 mb-3">How it works</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Volume2,
                title: "Speak or Type",
                desc: "Describe your schedule in natural language",
              },
              {
                icon: Sparkles,
                title: "AI Parses",
                desc: "AI converts your input into structured time blocks",
              },
              {
                icon: Calendar,
                title: "Add to Planner",
                desc: "Review and add tasks to your daily planner",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <step.icon className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700">{step.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
