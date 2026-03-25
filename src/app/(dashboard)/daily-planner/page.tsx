"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Trash2,
  Check,
  Clock,
  Video,
  Mic,
  Square,
  Play,
  Link2,
  FileText,
  BarChart3,
  X,
  Circle,
  CheckCircle2,
  ExternalLink,
  Timer,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────

type Category = "work" | "personal" | "learning" | "health" | "other";

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  category: Category;
  completed: boolean;
}

interface DayReference {
  id: string;
  title: string;
  url?: string;
  note?: string;
}

interface DailyPlan {
  date: string;
  blocks: TimeBlock[];
  references: DayReference[];
  journalRecorded: boolean;
  journalDuration: number;
  journalUrl?: string;
  journalS3Key?: string;
  journalType?: "audio" | "video";
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
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    text: "text-slate-500",
  },
};

const CATEGORIES: Category[] = [
  "work",
  "personal",
  "learning",
  "health",
  "other",
];

// ─── Helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function emptyPlan(date: string): DailyPlan {
  return {
    date,
    blocks: [],
    references: [],
    journalRecorded: false,
    journalDuration: 0,
  };
}

async function loadPlanFromAPI(date: string): Promise<DailyPlan> {
  try {
    const res = await fetch(`/api/daily-plan?date=${date}`);
    if (res.ok) {
      const data = await res.json();
      return { ...emptyPlan(date), ...data };
    }
  } catch (err) {
    console.error("[daily-planner] Failed to load plan:", err);
  }
  return emptyPlan(date);
}

let saveTimeout: NodeJS.Timeout | null = null;
function savePlanToAPI(plan: DailyPlan) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await fetch("/api/daily-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
    } catch (err) {
      console.error("[daily-planner] Failed to save plan:", err);
    }
  }, 500);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToDisplay(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Component ───────────────────────────────────────────────────────

export default function DailyPlannerPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plan, setPlan] = useState<DailyPlan>(() =>
    emptyPlan(formatDate(new Date()))
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddRef, setShowAddRef] = useState(false);

  // Add block form state
  const [newBlock, setNewBlock] = useState({
    startTime: "09:00",
    endTime: "10:00",
    title: "",
    description: "",
    category: "work" as Category,
  });

  // Add reference form state
  const [newRef, setNewRef] = useState({ title: "", url: "", note: "" });

  // Journal state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingMode, setRecordingMode] = useState<"audio" | "video">(
    "audio"
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const dateStr = formatDate(selectedDate);

  // Load plan when date changes
  useEffect(() => {
    let cancelled = false;
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setShowAddForm(false);
    setShowAddRef(false);
    setMediaUrl(null);

    loadPlanFromAPI(dateStr).then((loaded) => {
      if (cancelled) return;
      setPlan(loaded);
      setHasRecorded(loaded.journalRecorded);
      if (loaded.journalType) setRecordingMode(loaded.journalType);

      // If we have an S3 key, fetch a fresh presigned URL for playback
      if (loaded.journalS3Key) {
        fetch("/api/s3/download-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: loaded.journalS3Key }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (!cancelled && data.downloadUrl) setMediaUrl(data.downloadUrl);
          })
          .catch(() => {});
      } else if (loaded.journalUrl) {
        setMediaUrl(loaded.journalUrl);
      }
    });

    return () => { cancelled = true; };
  }, [dateStr]);

  // Auto-save to API (debounced)
  const planRef = useRef(plan);
  planRef.current = plan;
  useEffect(() => {
    savePlanToAPI(plan);
  }, [plan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Block Actions ─────────────────────────────────────────

  function addBlock() {
    if (!newBlock.title.trim()) return;
    if (timeToMinutes(newBlock.endTime) <= timeToMinutes(newBlock.startTime))
      return;

    const block: TimeBlock = {
      id: generateId(),
      startTime: newBlock.startTime,
      endTime: newBlock.endTime,
      title: newBlock.title.trim(),
      description: newBlock.description.trim(),
      category: newBlock.category,
      completed: false,
    };

    setPlan((prev) => {
      const blocks = [...prev.blocks, block].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
      return { ...prev, blocks };
    });

    setNewBlock({
      startTime: "09:00",
      endTime: "10:00",
      title: "",
      description: "",
      category: "work",
    });
    setShowAddForm(false);
  }

  function toggleBlock(id: string) {
    setPlan((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id ? { ...b, completed: !b.completed } : b
      ),
    }));
  }

  function deleteBlock(id: string) {
    setPlan((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  }

  // ─── Reference Actions ────────────────────────────────────

  function addReference() {
    if (!newRef.title.trim()) return;
    const ref: DayReference = {
      id: generateId(),
      title: newRef.title.trim(),
      url: newRef.url.trim() || undefined,
      note: newRef.note.trim() || undefined,
    };
    setPlan((prev) => ({
      ...prev,
      references: [...prev.references, ref],
    }));
    setNewRef({ title: "", url: "", note: "" });
    setShowAddRef(false);
  }

  function deleteReference(id: string) {
    setPlan((prev) => ({
      ...prev,
      references: prev.references.filter((r) => r.id !== id),
    }));
  }

  // ─── Journal Recording ────────────────────────────────────

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser!.getByteTimeDomainData(dataArray);

      ctx!.fillStyle = "#f1f5f9";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      ctx!.lineWidth = 2;
      ctx!.strokeStyle = "#818cf8";
      ctx!.beginPath();

      const sliceWidth = canvas!.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas!.height) / 2;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
        x += sliceWidth;
      }

      ctx!.lineTo(canvas!.width, canvas!.height / 2);
      ctx!.stroke();
    }

    draw();
  }, []);

  async function startRecording() {
    try {
      const constraints: MediaStreamConstraints =
        recordingMode === "video"
          ? { audio: true, video: { facingMode: "user", width: 640, height: 480 } }
          : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Set up audio analysis for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType =
          recordingMode === "video" ? "video/webm" : "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const localUrl = URL.createObjectURL(blob);
        setMediaUrl(localUrl);
        setHasRecorded(true);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        // Upload to S3
        setIsUploading(true);
        try {
          const fileName = `journal_${formatDate(selectedDate)}.webm`;
          const res = await fetch("/api/s3/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName, contentType: mimeType, folder: `journals/${formatDate(selectedDate)}` }),
          });
          if (res.ok) {
            const { uploadUrl, publicUrl, key } = await res.json();
            await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": mimeType },
              body: blob,
            });
            setPlan((prev) => ({
              ...prev,
              journalRecorded: true,
              journalDuration: recordingTime,
              journalUrl: publicUrl,
              journalS3Key: key,
              journalType: recordingMode,
            }));
          } else {
            setPlan((prev) => ({
              ...prev,
              journalRecorded: true,
              journalDuration: recordingTime,
              journalType: recordingMode,
            }));
          }
        } catch (err) {
          console.error("Journal S3 upload error:", err);
          setPlan((prev) => ({
            ...prev,
            journalRecorded: true,
            journalDuration: recordingTime,
            journalType: recordingMode,
          }));
        }
        setIsUploading(false);
      };

      // Show live video preview if recording video
      if (recordingMode === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      recorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setMediaUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      drawWaveform();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }

  function pauseRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (timerRef.current) clearInterval(timerRef.current);
    recorder.stop();
    setIsRecording(false);
    setIsPaused(false);
  }

  // ─── Stats ────────────────────────────────────────────────

  const totalBlocks = plan.blocks.length;
  const completedBlocks = plan.blocks.filter((b) => b.completed).length;
  const completionPct = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
  const trackedMinutes = plan.blocks
    .filter((b) => b.completed)
    .reduce(
      (sum, b) => sum + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)),
      0
    );

  const isToday = formatDate(new Date()) === dateStr;

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ─── Header / Date Selector ─────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Daily Planner</h1>
            <p className="text-slate-400 text-sm mt-1">
              Plan your day, track your progress
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setSelectedDate(new Date(e.target.value + "T12:00:00"))}
                className="bg-transparent text-slate-900 text-sm outline-none [color-scheme:dark]"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {!isToday && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            )}
          </div>
        </div>

        <p className="text-slate-500 text-sm mb-6">
          {formatDisplayDate(selectedDate)}
        </p>

        {/* ─── Main Grid ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ─── Left: Timeline + Journal (2 cols) ─────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ─── Timeline ─────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Schedule
                  </h2>
                  <span className="text-slate-400 text-sm">
                    ({plan.blocks.length} blocks)
                  </span>
                </div>
                <Button
                  variant={showAddForm ? "secondary" : "default"}
                  size="sm"
                  onClick={() => setShowAddForm((v) => !v)}
                >
                  {showAddForm ? (
                    <>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" /> Add Block
                    </>
                  )}
                </Button>
              </div>

              {/* ─── Add Block Form (inline) ────────────── */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={newBlock.startTime}
                            onChange={(e) =>
                              setNewBlock((b) => ({
                                ...b,
                                startTime: e.target.value,
                              }))
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={newBlock.endTime}
                            onChange={(e) =>
                              setNewBlock((b) => ({
                                ...b,
                                endTime: e.target.value,
                              }))
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 [color-scheme:dark]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-slate-400 mb-1">
                            Category
                          </label>
                          <select
                            value={newBlock.category}
                            onChange={(e) =>
                              setNewBlock((b) => ({
                                ...b,
                                category: e.target.value as Category,
                              }))
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 [color-scheme:dark]"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {CATEGORY_CONFIG[c].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          placeholder="What are you working on?"
                          value={newBlock.title}
                          onChange={(e) =>
                            setNewBlock((b) => ({
                              ...b,
                              title: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addBlock();
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Description{" "}
                          <span className="text-slate-400">(optional)</span>
                        </label>
                        <textarea
                          placeholder="Add details..."
                          value={newBlock.description}
                          onChange={(e) =>
                            setNewBlock((b) => ({
                              ...b,
                              description: e.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 placeholder:text-slate-400 resize-none"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={addBlock}>
                          <Plus className="w-4 h-4 mr-1" /> Add to Schedule
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Time Blocks ────────────────────────── */}
              {plan.blocks.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">
                    No blocks scheduled yet
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Add your first time block to start planning
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[88px] top-0 bottom-0 w-px bg-slate-200 hidden sm:block" />

                  <AnimatePresence mode="popLayout">
                    {plan.blocks.map((block) => {
                      const cat = CATEGORY_CONFIG[block.category];
                      const duration =
                        timeToMinutes(block.endTime) -
                        timeToMinutes(block.startTime);

                      return (
                        <motion.div
                          key={block.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-4 mb-4 group"
                        >
                          {/* Time column */}
                          <div className="w-20 flex-shrink-0 text-right pt-3 hidden sm:block">
                            <p className="text-xs font-mono text-slate-500">
                              {formatTime12(block.startTime)}
                            </p>
                            <p className="text-xs font-mono text-slate-400">
                              {formatTime12(block.endTime)}
                            </p>
                          </div>

                          {/* Dot on timeline */}
                          <div className="relative flex-shrink-0 hidden sm:flex items-center" style={{ height: '44px' }}>
                            <div
                              className={`w-3 h-3 rounded-full ${cat.dot} ring-4 ring-white z-10`}
                            />
                          </div>

                          {/* Card */}
                          <div
                            className={`flex-1 bg-white border rounded-lg p-4 transition-all ${
                              block.completed
                                ? "border-slate-200 opacity-60"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleBlock(block.id)}
                                  className="mt-0.5 flex-shrink-0"
                                >
                                  {block.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-400 hover:text-slate-500 transition-colors" />
                                  )}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p
                                      className={`text-sm font-medium ${
                                        block.completed
                                          ? "text-slate-400 line-through"
                                          : "text-slate-900"
                                      }`}
                                    >
                                      {block.title}
                                    </p>
                                    <span
                                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cat.bg} ${cat.border} ${cat.text}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}
                                      />
                                      {cat.label}
                                    </span>
                                  </div>

                                  {/* Mobile time display */}
                                  <p className="text-xs font-mono text-slate-400 mt-1 sm:hidden">
                                    {formatTime12(block.startTime)} -{" "}
                                    {formatTime12(block.endTime)}
                                  </p>

                                  {block.description && (
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                      {block.description}
                                    </p>
                                  )}

                                  <p className="text-xs text-slate-400 mt-1">
                                    {minutesToDisplay(duration)}
                                  </p>
                                </div>
                              </div>

                              {/* Delete */}
                              <button
                                onClick={() => deleteBlock(block.id)}
                                className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ─── Journal Recording ──────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Video className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Daily Journal
                </h2>
              </div>
              <p className="text-slate-400 text-sm mb-5 italic">
                &ldquo;What did you accomplish today? What could be better
                tomorrow?&rdquo;
              </p>

              {/* Mode selector */}
              {!isRecording && !mediaUrl && (
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setRecordingMode("audio")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      recordingMode === "audio"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "bg-transparent border-slate-200 text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" /> Audio
                  </button>
                  <button
                    onClick={() => setRecordingMode("video")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      recordingMode === "video"
                        ? "bg-purple-50 border-purple-200 text-purple-600"
                        : "bg-transparent border-slate-200 text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Video
                  </button>
                </div>
              )}

              {/* Waveform / Recording UI */}
              {isRecording && (
                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-red-600 text-sm font-medium">
                      Recording
                    </span>
                    <span className="text-slate-500 font-mono text-sm">
                      {formatSeconds(recordingTime)}
                    </span>
                  </div>
                  {/* Live video preview */}
                  {recordingMode === "video" && (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full max-h-64 rounded-lg border border-slate-200 bg-black object-cover"
                    />
                  )}
                  {/* Audio waveform (only for audio mode) */}
                  {recordingMode === "audio" && (
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={80}
                      className="w-full h-20 rounded-lg border border-slate-200"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={pauseRecording}
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 mr-1" /> Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={stopRecording}
                    >
                      <Square className="w-3.5 h-3.5 mr-1" /> Stop
                    </Button>
                  </div>
                </div>
              )}

              {/* Playback */}
              {mediaUrl && !isRecording && (
                <div className="mb-4 space-y-3">
                  {isUploading && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Uploading to cloud...
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <Check className="w-4 h-4" /> Journal recorded (
                    {formatSeconds(recordingTime || plan.journalDuration)})
                  </div>
                  {(plan.journalType || recordingMode) === "video" ? (
                    <video
                      src={mediaUrl}
                      controls
                      playsInline
                      className="w-full max-h-64 rounded-lg border border-slate-200 bg-black"
                    />
                  ) : (
                    <audio
                      src={mediaUrl}
                      controls
                      className="w-full [&::-webkit-media-controls-panel]:bg-slate-100"
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (mediaUrl && mediaUrl.startsWith("blob:")) URL.revokeObjectURL(mediaUrl);
                      setMediaUrl(null);
                      setHasRecorded(false);
                      setRecordingTime(0);
                      setPlan((prev) => ({
                        ...prev,
                        journalRecorded: false,
                        journalDuration: 0,
                        journalUrl: undefined,
                        journalS3Key: undefined,
                        journalType: undefined,
                      }));
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Re-record
                  </Button>
                </div>
              )}

              {/* Record button */}
              {!isRecording && !mediaUrl && (
                <Button
                  onClick={startRecording}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {recordingMode === "video" ? (
                    <Video className="w-4 h-4 mr-2" />
                  ) : (
                    <Mic className="w-4 h-4 mr-2" />
                  )}
                  Start {recordingMode === "video" ? "Video" : "Audio"}{" "}
                  Journal
                </Button>
              )}

              {/* Previous recording indicator */}
              {!mediaUrl && !isRecording && plan.journalRecorded && (
                <p className="text-xs text-slate-400 mt-3">
                  <Check className="w-3 h-3 inline mr-1 text-emerald-500" />
                  Previously recorded ({formatSeconds(plan.journalDuration)}).
                  {plan.journalS3Key ? " Loading from cloud..." : " Media not persisted across sessions."}
                </p>
              )}
            </div>
          </div>

          {/* ─── Right Sidebar ────────────────────────────── */}
          <div className="space-y-6">
            {/* ─── Daily Stats ────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Daily Stats
                </h2>
              </div>

              <div className="space-y-5">
                {/* Completion */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Completion</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {completionPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Block counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {totalBlocks}
                    </p>
                    <p className="text-xs text-slate-400">Total</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {completedBlocks}
                    </p>
                    <p className="text-xs text-slate-400">Done</p>
                  </div>
                </div>

                {/* Time tracked */}
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">
                      Time Tracked
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {minutesToDisplay(trackedMinutes)}
                  </span>
                </div>

                {/* Journal status */}
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">Journal</span>
                  </div>
                  {plan.journalRecorded || hasRecorded ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="w-3.5 h-3.5" /> Recorded
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Not recorded</span>
                  )}
                </div>

                {/* Category breakdown */}
                {totalBlocks > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                      By Category
                    </p>
                    <div className="space-y-1.5">
                      {CATEGORIES.map((c) => {
                        const count = plan.blocks.filter(
                          (b) => b.category === c
                        ).length;
                        if (count === 0) return null;
                        const cfg = CATEGORY_CONFIG[c];
                        return (
                          <div
                            key={c}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${cfg.dot}`}
                              />
                              <span className="text-xs text-slate-500">
                                {cfg.label}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── References ─────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    References
                  </h2>
                </div>
                <Button
                  variant={showAddRef ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowAddRef((v) => !v)}
                >
                  {showAddRef ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Add Reference Form */}
              <AnimatePresence>
                {showAddRef && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 space-y-2">
                      <input
                        type="text"
                        placeholder="Title"
                        value={newRef.title}
                        onChange={(e) =>
                          setNewRef((r) => ({ ...r, title: e.target.value }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 placeholder:text-slate-400"
                      />
                      <input
                        type="url"
                        placeholder="URL (optional)"
                        value={newRef.url}
                        onChange={(e) =>
                          setNewRef((r) => ({ ...r, url: e.target.value }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 placeholder:text-slate-400"
                      />
                      <textarea
                        placeholder="Note (optional)"
                        value={newRef.note}
                        onChange={(e) =>
                          setNewRef((r) => ({ ...r, note: e.target.value }))
                        }
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 placeholder:text-slate-400 resize-none"
                      />
                      <Button
                        size="sm"
                        onClick={addReference}
                        className="w-full"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Reference
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {plan.references.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  No references yet
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className="space-y-2">
                    {plan.references.map((ref) => (
                      <motion.div
                        key={ref.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="group bg-white border border-slate-200 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {ref.url ? (
                                <Link2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              )}
                              {ref.url ? (
                                <a
                                  href={ref.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-indigo-600 hover:text-indigo-500 truncate flex items-center gap-1"
                                >
                                  {ref.title}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                <p className="text-sm text-slate-900 truncate">
                                  {ref.title}
                                </p>
                              )}
                            </div>
                            {ref.note && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                {ref.note}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteReference(ref.id)}
                            className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
