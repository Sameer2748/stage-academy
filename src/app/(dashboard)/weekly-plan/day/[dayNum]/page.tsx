"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  Video,
  Square,
  Pause,
  Play,
  RotateCcw,
  Upload,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  FileText,
  Sparkles,
  Loader2,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayTask {
  id: string;
  type: string;
  title: string;
  description: string;
  focusArea: string;
  completed: boolean;
  sessionId?: string;
}

interface DayPlan {
  day: number;
  title: string;
  tasks: DayTask[];
}

interface Recording {
  id: string;
  taskId: string;
  blob: Blob | null;
  url: string;
  s3Url?: string;
  s3Key?: string;
  duration: number;
  timestamp: number;
  transcript?: string;
  aiReview?: AIReview;
  isTranscribing?: boolean;
  isReviewing?: boolean;
  isUploading?: boolean;
}

interface AIReview {
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

type RecState = "idle" | "recording" | "paused" | "done";

function isValidTranscript(t?: string): boolean {
  return !!t && !t.startsWith("[") && t.trim().length >= 10;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function DayDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dayNum = parseInt(params.dayNum as string);
  const weekNum = parseInt(searchParams.get("week") || "1");
  const focusTaskId = searchParams.get("task");

  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(focusTaskId);

  // Recording state
  const [recState, setRecState] = useState<RecState>("idle");
  const [recMode, setRecMode] = useState<"audio" | "video">("audio");
  const [duration, setDuration] = useState(0);
  const [audioData, setAudioData] = useState<number[]>(new Array(32).fill(4));
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecording, setExpandedRecording] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  // Load day plan and recordings from API
  useEffect(() => {
    // Load weekly plan
    fetch(`/api/weekly-plan?week=${weekNum}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.plan?.days) {
          const day = (data.plan.days as DayPlan[]).find((d) => d.day === dayNum);
          setDayPlan(day || null);
        }
      })
      .catch(() => {});

    // Load recordings
    fetch(`/api/day-recordings?week=${weekNum}&day=${dayNum}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.recordings) {
          setRecordings(
            data.recordings.map((r: any) => ({
              ...r,
              blob: null,
              url: r.s3Url || "",
            }))
          );
        }
      })
      .catch(() => {});
  }, [weekNum, dayNum]);

  // Save a recording to the API
  const saveRecordingToAPI = useCallback(async (rec: { taskId: string; s3Url?: string; s3Key?: string; duration: number; timestamp: number; transcript?: string; aiReview?: any }) => {
    try {
      await fetch("/api/day-recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekNumber: weekNum,
          dayNumber: dayNum,
          ...rec,
        }),
      });
    } catch (err) {
      console.error("[day-recordings] Failed to save:", err);
    }
  }, [weekNum, dayNum]);

  // Save plan updates via API
  const saveDayPlan = (updated: DayPlan) => {
    setDayPlan(updated);
    // Fetch the full plan, update this day, and save
    fetch(`/api/weekly-plan?week=${weekNum}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.plan?.days) {
          const days = (data.plan.days as DayPlan[]).map((d) =>
            d.day === dayNum ? updated : d
          );
          fetch("/api/weekly-plan", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weekNumber: weekNum, days }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  };

  const toggleTask = (taskId: string) => {
    if (!dayPlan) return;
    const updated = {
      ...dayPlan,
      tasks: dayPlan.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
    };
    saveDayPlan(updated);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Attach stream to video
  useEffect(() => {
    if (videoRef.current && mediaStream && recMode === "video") {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, recMode]);

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(buf);
        setAudioData(Array.from(buf));
        animRef.current = requestAnimationFrame(update);
      };
      animRef.current = requestAnimationFrame(update);
    } catch { /* ignore */ }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
    audioCtxRef.current = null;
    setAudioData(new Array(32).fill(4));
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: recMode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
      });
      streamRef.current = stream;
      setMediaStream(stream);
      startAudioAnalysis(stream);

      const mimeType = recMode === "video"
        ? (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm")
        : (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm");

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const localUrl = URL.createObjectURL(blob);
        const recId = Math.random().toString(36).slice(2, 10);
        const newRec: Recording = {
          id: recId,
          taskId: activeTaskId || "",
          blob,
          url: localUrl,
          duration: durationRef.current,
          timestamp: Date.now(),
          isUploading: true,
        };
        setRecordings((prev) => [...prev, newRec]);
        setRecState("done");
        if (timerRef.current) clearInterval(timerRef.current);
        stopAudioAnalysis();

        // Upload to S3
        try {
          const ext = recMode === "video" ? "webm" : "webm";
          const fileName = `w${weekNum}d${dayNum}_${recId}.${ext}`;
          const res = await fetch("/api/s3/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName, contentType: mimeType, folder: `recordings/w${weekNum}/d${dayNum}` }),
          });
          if (res.ok) {
            const { uploadUrl, publicUrl, key } = await res.json();
            await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": mimeType },
              body: blob,
            });
            setRecordings((prev) =>
              prev.map((r) => r.id === recId ? { ...r, s3Url: publicUrl, s3Key: key, url: publicUrl, isUploading: false } : r)
            );
            // Save to DB
            saveRecordingToAPI({
              taskId: activeTaskId || "",
              s3Url: publicUrl,
              s3Key: key,
              duration: durationRef.current,
              timestamp: Date.now(),
            });
          } else {
            console.error("Failed to get upload URL");
            setRecordings((prev) =>
              prev.map((r) => r.id === recId ? { ...r, isUploading: false } : r)
            );
            // Still save to DB without S3
            saveRecordingToAPI({
              taskId: activeTaskId || "",
              duration: durationRef.current,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.error("S3 upload error:", err);
          setRecordings((prev) =>
            prev.map((r) => r.id === recId ? { ...r, isUploading: false } : r)
          );
          // Still save to DB without S3
          saveRecordingToAPI({
            taskId: activeTaskId || "",
            duration: durationRef.current,
            timestamp: Date.now(),
          });
        }

        // Auto-transcribe (use blob directly, don't wait for S3)
        transcribeRecording(newRec, blob);
      };

      recorder.start(1000);
      setRecState("recording");
      setDuration(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof DOMException && err.name === "NotAllowedError"
        ? "Microphone access denied."
        : "Failed to start recording.");
    }
  }, [recMode, activeTaskId, startAudioAnalysis, stopAudioAnalysis]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecState("paused");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecState("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
    setMediaStream(null);
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    stopAudioAnalysis();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecState("idle");
    setDuration(0);
    setMediaStream(null);
  }, [stopRecording, stopAudioAnalysis]);

  // Transcribe using Deepgram API
  const transcribeRecording = async (rec: Recording, blob: Blob) => {
    setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, isTranscribing: true } : r)));

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const text = data.transcript || "[No speech detected in recording]";
        setRecordings((prev) =>
          prev.map((r) => (r.id === rec.id ? { ...r, transcript: text, isTranscribing: false } : r))
        );
      } else {
        console.error("[transcribe] API error:", data);
        setRecordings((prev) =>
          prev.map((r) => (r.id === rec.id ? { ...r, transcript: `[Transcription error: ${data.error || res.status}]`, isTranscribing: false } : r))
        );
      }
    } catch (err) {
      console.error("[transcribe] Error:", err);
      setRecordings((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, transcript: "[Transcription failed — check console for details]", isTranscribing: false } : r))
      );
    }
  };

  // AI Review using Grok
  const [reviewError, setReviewError] = useState<string | null>(null);

  const requestAIReview = async (rec: Recording) => {
    if (!rec.transcript) return;
    setReviewError(null);

    const task = dayPlan?.tasks.find((t) => t.id === rec.taskId);
    setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, isReviewing: true } : r)));

    try {
      const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: rec.transcript,
          focusArea: task?.focusArea || "general",
          taskDescription: task?.description || "",
          taskTitle: task?.title || "",
          duration: rec.duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[ai-review] Error:", data);
        setReviewError(data.error || `AI review failed (${res.status})`);
        setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, isReviewing: false } : r)));
        return;
      }

      if (data.review) {
        setRecordings((prev) =>
          prev.map((r) => (r.id === rec.id ? { ...r, aiReview: data.review, isReviewing: false } : r))
        );

        // Mark task as completed
        if (task && dayPlan) {
          const updated = {
            ...dayPlan,
            tasks: dayPlan.tasks.map((t) =>
              t.id === rec.taskId ? { ...t, completed: true, sessionId: rec.id } : t
            ),
          };
          saveDayPlan(updated);
        }
      } else {
        setReviewError("AI review returned empty response");
        setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, isReviewing: false } : r)));
      }
    } catch (err) {
      console.error("[ai-review] Error:", err);
      setReviewError("Failed to connect to AI review service");
      setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, isReviewing: false } : r)));
    }
  };

  const activeTask = dayPlan?.tasks.find((t) => t.id === activeTaskId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/weekly-plan`}
          className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {DAY_NAMES[dayNum - 1]} — Week {weekNum}
          </h1>
          <p className="text-sm text-slate-400">{dayPlan?.title || "No title set"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tasks + Recording */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tasks Checklist */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600 shrink-0" /> Today&apos;s Tasks
            </h3>
            {dayPlan?.tasks.length === 0 && (
              <p className="text-sm text-slate-400">No tasks planned for this day.</p>
            )}
            <div className="space-y-2">
              {dayPlan?.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskId(activeTaskId === task.id ? null : task.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    activeTaskId === task.id
                      ? "border-indigo-200 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300"
                  } ${task.completed ? "opacity-50" : ""}`}
                >
                  <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}>
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <div className="flex-1">
                    <span className={`text-sm font-medium text-slate-900 ${task.completed ? "line-through" : ""}`}>
                      {task.title}
                    </span>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.focusArea !== "general" && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                        {task.focusArea}
                      </span>
                    )}
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                      {task.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Action Panel for non-record types */}
          {activeTask && activeTask.type !== "record" && activeTask.type !== "review" && !activeTask.completed && (
            <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                {activeTask.type === "watch" && <Eye className="w-4 h-4 text-blue-600 shrink-0" />}
                {activeTask.type === "exercise" && <Target className="w-4 h-4 text-amber-600 shrink-0" />}
                {activeTask.type === "note" && <FileText className="w-4 h-4 text-emerald-600 shrink-0" />}
                {activeTask.title}
              </h3>
              {activeTask.description && (
                <p className="text-sm text-slate-500">{activeTask.description}</p>
              )}
              {activeTask.focusArea !== "general" && (
                <p className="text-xs text-indigo-600 uppercase">Focus: {activeTask.focusArea}</p>
              )}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => toggleTask(activeTask.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as Done
                </Button>
                {activeTask.type === "watch" && (
                  <Link href="/library">
                    <Button variant="outline" className="border-slate-200 gap-2">
                      <BookOpen className="w-4 h-4" /> Go to Library
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Recording Studio */}
          {activeTask && (activeTask.type === "record" || activeTask.type === "review") && !activeTask.completed && (
            <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-red-600 shrink-0" /> Record: {activeTask.title}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => recState === "idle" && setRecMode("audio")}
                    disabled={recState !== "idle"}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      recMode === "audio" ? "bg-indigo-500/20 text-indigo-600 border border-indigo-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                    } disabled:opacity-50`}
                  >
                    <Mic className="w-3 h-3 inline mr-1" />Audio
                  </button>
                  <button
                    onClick={() => recState === "idle" && setRecMode("video")}
                    disabled={recState !== "idle"}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      recMode === "video" ? "bg-indigo-500/20 text-indigo-600 border border-indigo-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                    } disabled:opacity-50`}
                  >
                    <Video className="w-3 h-3 inline mr-1" />Video
                  </button>
                </div>
              </div>

              {/* Task Description */}
              {activeTask.description && (
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                  <p className="text-xs text-indigo-500">{activeTask.description}</p>
                  {activeTask.focusArea !== "general" && (
                    <p className="text-[10px] text-indigo-600 mt-1">Focus: {activeTask.focusArea}</p>
                  )}
                </div>
              )}

              {/* Preview Area */}
              <div className="relative rounded-xl overflow-hidden bg-white border border-slate-200 aspect-video flex items-center justify-center">
                {recMode === "video" && mediaStream && recState !== "done" && (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                )}
                {recMode === "audio" && (recState === "recording" || recState === "paused") && (
                  <div className="flex items-end justify-center gap-[3px] h-32 px-8">
                    {audioData.slice(0, 32).map((val, i) => (
                      <motion.div key={i} className="w-2 rounded-full bg-gradient-to-t from-indigo-600 to-purple-500" animate={{ height: Math.max(4, (val / 255) * 80) }} transition={{ duration: 0.05 }} />
                    ))}
                  </div>
                )}
                {recState === "idle" && (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Mic className="w-10 h-10" />
                    <p className="text-sm">Ready to record</p>
                  </div>
                )}
                {(recState === "recording" || recState === "paused") && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-slate-200">
                    <span className="text-sm font-mono text-slate-900">{formatTime(duration)}</span>
                  </div>
                )}
                {recState === "recording" && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-200">
                    <motion.span className="w-2 h-2 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                    <span className="text-xs font-semibold text-red-600">REC</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                {recState === "idle" && (
                  <button onClick={startRecording} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-900 font-medium transition-all">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    Start Recording
                  </button>
                )}
                {recState === "recording" && (
                  <>
                    <button onClick={pauseRecording} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-50 border border-yellow-500/20 text-yellow-600 font-medium">
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                    <button onClick={stopRecording} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium">
                      <Square className="w-4 h-4" /> Stop
                    </button>
                  </>
                )}
                {recState === "paused" && (
                  <>
                    <button onClick={resumeRecording} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-medium">
                      <Play className="w-4 h-4" /> Resume
                    </button>
                    <button onClick={stopRecording} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium">
                      <Square className="w-4 h-4" /> Stop
                    </button>
                  </>
                )}
                {recState === "done" && (
                  <button onClick={resetRecording} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                    <RotateCcw className="w-4 h-4" /> Record Again
                  </button>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
            </div>
          )}

          {/* Recordings List */}
          {recordings.length > 0 && (
            <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" /> Recordings ({recordings.length})
              </h3>
              {recordings.map((rec) => {
                const task = dayPlan?.tasks.find((t) => t.id === rec.taskId);
                const isExpanded = expandedRecording === rec.id;
                return (
                  <div key={rec.id} className="rounded-lg border border-slate-200 overflow-hidden">
                    {/* Recording Header */}
                    <button
                      onClick={() => setExpandedRecording(isExpanded ? null : rec.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                          <Mic className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-900">{task?.title || "Recording"}</p>
                          <p className="text-[10px] text-slate-400">
                            {formatTime(rec.duration)} • {new Date(rec.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rec.isUploading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                        {rec.isTranscribing && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                        {rec.s3Url && !rec.isUploading && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            Saved
                          </span>
                        )}
                        {isValidTranscript(rec.transcript) && !rec.aiReview && !rec.isReviewing && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-500/20">
                            Ready for review
                          </span>
                        )}
                        {rec.aiReview && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Score: {rec.aiReview.overallScore}/100
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-200 overflow-hidden"
                        >
                          <div className="p-4 space-y-4">
                            {/* Upload Status */}
                            {rec.isUploading && (
                              <div className="flex items-center gap-2 text-xs text-indigo-600">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to cloud...
                              </div>
                            )}

                            {/* Playback */}
                            {(rec.s3Url || rec.url) && (
                              <div>
                                <audio src={rec.s3Url || rec.url} controls className="w-full" />
                              </div>
                            )}

                            {/* Transcript */}
                            <div>
                              <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" /> Transcript
                              </h4>
                              {rec.isTranscribing ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <Loader2 className="w-4 h-4 animate-spin" /> Transcribing...
                                </div>
                              ) : rec.transcript ? (
                                <p className="text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                                  {rec.transcript}
                                </p>
                              ) : (
                                <p className="text-sm text-slate-400">No transcript available</p>
                              )}
                            </div>

                            {/* AI Review Button */}
                            {isValidTranscript(rec.transcript) && !rec.aiReview && (
                              <Button
                                onClick={() => requestAIReview(rec)}
                                disabled={rec.isReviewing}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 gap-2"
                              >
                                {rec.isReviewing ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                                ) : (
                                  <><Sparkles className="w-4 h-4" /> Get AI Review</>
                                )}
                              </Button>
                            )}

                            {/* AI Review Error */}
                            {reviewError && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {reviewError}
                              </div>
                            )}

                            {/* AI Review Results */}
                            {rec.aiReview && (
                              <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Review
                                </h4>

                                {/* Scores */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {[
                                    { label: "Overall", score: rec.aiReview.overallScore, color: "indigo" },
                                    { label: "Volume", score: rec.aiReview.volumeScore, color: "blue" },
                                    { label: "Tonality", score: rec.aiReview.tonalityScore, color: "purple" },
                                    { label: "Pause", score: rec.aiReview.pauseScore, color: "amber" },
                                    { label: "Storytelling", score: rec.aiReview.storytellingScore, color: "emerald" },
                                  ].map((s) => (
                                    <div key={s.label} className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                                      <p className="text-lg font-bold text-slate-900">{s.score}</p>
                                      <p className="text-[10px] text-slate-400">{s.label}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Strengths */}
                                {rec.aiReview.strengths?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-emerald-600 mb-1">Strengths</p>
                                    <ul className="space-y-1">
                                      {rec.aiReview.strengths.map((s, i) => (
                                        <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" /> {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Improvements */}
                                {rec.aiReview.improvements?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-amber-600 mb-1">Areas to Improve</p>
                                    <ul className="space-y-1">
                                      {rec.aiReview.improvements.map((s, i) => (
                                        <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                                          <Target className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" /> {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Detailed Feedback */}
                                <div className="p-3 rounded-lg bg-white border border-slate-200">
                                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {rec.aiReview.detailedFeedback}
                                  </p>
                                </div>

                                {/* Focus Area Feedback */}
                                {rec.aiReview.focusAreaFeedback && (
                                  <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                                    <p className="text-[10px] text-indigo-600 font-medium mb-1 uppercase">
                                      Focus: {task?.focusArea}
                                    </p>
                                    <p className="text-xs text-indigo-500 leading-relaxed">
                                      {rec.aiReview.focusAreaFeedback}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Day Info */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Day Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Tasks</span>
                <span className="text-slate-900">{dayPlan?.tasks.filter((t) => t.completed).length || 0}/{dayPlan?.tasks.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recordings</span>
                <span className="text-slate-900">{recordings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reviewed</span>
                <span className="text-slate-900">{recordings.filter((r) => r.aiReview).length}</span>
              </div>
            </div>
          </div>

          {activeTask && (
            <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600 shrink-0" /> Active Task
              </h3>
              <p className="text-sm text-slate-900 font-medium">{activeTask.title}</p>
              {activeTask.description && (
                <p className="text-xs text-slate-500 mt-1">{activeTask.description}</p>
              )}
              {activeTask.focusArea !== "general" && (
                <p className="text-xs text-indigo-600 mt-2 uppercase">Focus: {activeTask.focusArea}</p>
              )}
            </div>
          )}

          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-600 shrink-0" /> Tips
            </h3>
            <ul className="space-y-2">
              {["Record in a quiet space", "Speak for 2-5 minutes", "Focus on one skill at a time", "Review your AI feedback carefully"].map((tip, i) => (
                <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                  <span className="text-indigo-600">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
