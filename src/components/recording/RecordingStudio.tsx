"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Mic,
  Upload,
  Loader2,
  CheckCircle2,
  FileAudio,
  AlertCircle,
  Sparkles,
  Target,
  Lightbulb,
  Clock,
  Trophy,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRecording } from "@/hooks/useRecording";
import WaveformVisualiser from "./WaveformVisualiser";
import RecordingControls from "./RecordingControls";
import VideoPreview from "./VideoPreview";
import type { WeeklyPlanData, DayPlan } from "@/types";
import { formatDuration } from "@/lib/utils";

type ProcessingStage =
  | "idle"
  | "uploading"
  | "transcribing"
  | "analysing"
  | "complete";

interface RecordingStudioProps {
  plan: WeeklyPlanData | null;
  todayPlan: DayPlan | null;
  currentWeek: number;
  currentDay: number;
  currentPhase: string;
  previousScore: number | null;
}

export default function RecordingStudio({
  plan,
  todayPlan,
  currentWeek,
  currentDay,
  currentPhase,
  previousScore,
}: RecordingStudioProps) {
  const router = useRouter();
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const {
    isRecording,
    isPaused,
    duration,
    mediaStream,
    recordedBlob,
    recordedUrl,
    error: recordingError,
    audioData,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  } = useRecording();

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect live mediaStream to video preview
  useEffect(() => {
    if (videoPreviewRef.current && mediaStream && videoEnabled) {
      videoPreviewRef.current.srcObject = mediaStream;
    }
    return () => {
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
    };
  }, [mediaStream, videoEnabled]);

  // Poll session status when processing
  useEffect(() => {
    if (!sessionId || processingStage === "idle" || processingStage === "complete") {
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;

        const status = data.data?.status;

        if (status === "transcribing") {
          setProcessingStage("transcribing");
        } else if (status === "analysing" || status === "analyzing") {
          setProcessingStage("analysing");
        } else if (status === "complete" || status === "completed") {
          setProcessingStage("complete");
          if (pollRef.current) clearInterval(pollRef.current);
          // Auto-redirect after brief delay
          setTimeout(() => {
            router.push(`/sessions/${sessionId}`);
          }, 1500);
        }
      } catch {
        // Continue polling
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, processingStage, router]);

  const handleStartRecording = useCallback(() => {
    startRecording(videoEnabled);
  }, [startRecording, videoEnabled]);

  const handleRetake = useCallback(() => {
    resetRecording();
    setProcessingStage("idle");
    setUploadProgress(0);
    setSessionId(null);
    setUploadError(null);
  }, [resetRecording]);

  const handleUpload = useCallback(async () => {
    if (!recordedBlob) return;

    setUploadError(null);
    setProcessingStage("uploading");
    setUploadProgress(0);

    try {
      // 1. Get presigned URL
      const mimeType = recordedBlob.type;
      const extension = mimeType.includes("video") ? "webm" : "webm";
      const filename = `recording-w${currentWeek}d${currentDay}-${Date.now()}.${extension}`;

      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          contentType: mimeType,
          phase: currentPhase,
          week: currentWeek,
          day: currentDay,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const presignedData = await presignedRes.json();
      if (!presignedData.success) {
        throw new Error(presignedData.error || "Failed to get upload URL");
      }

      const { uploadUrl, sessionId: newSessionId, key } = presignedData.data;
      setSessionId(newSessionId);

      // 2. Upload to S3 via PUT
      setUploadProgress(10);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: recordedBlob,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload recording");
      }

      setUploadProgress(70);

      // 3. Call complete endpoint
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: newSessionId,
          key,
          duration,
          title: todayPlan?.title || `Practice Session - Week ${currentWeek} Day ${currentDay}`,
        }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to finalize upload");
      }

      const completeData = await completeRes.json();
      if (!completeData.success) {
        throw new Error(completeData.error || "Failed to finalize upload");
      }

      setUploadProgress(100);
      setProcessingStage("transcribing");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(message);
      setProcessingStage("idle");
    }
  }, [recordedBlob, currentWeek, currentDay, currentPhase, duration, todayPlan]);

  const recordingFilename = `recording-w${currentWeek}d${currentDay}-${Date.now()}.webm`;

  const phaseLabel =
    currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-h-[calc(100vh-8rem)]">
      {/* ─── Left Panel (60%) ─────────────────────────────────────────────── */}
      <div className="flex-[3] flex flex-col gap-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => setVideoEnabled(true)}
            disabled={isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              videoEnabled
                ? "bg-indigo-500/20 text-indigo-600 border border-indigo-200"
                : "bg-white text-gray-400 border border-slate-200 hover:text-slate-900"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Video className="w-4 h-4" />
            Video + Audio
          </button>
          <button
            onClick={() => setVideoEnabled(false)}
            disabled={isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !videoEnabled
                ? "bg-indigo-500/20 text-indigo-600 border border-indigo-200"
                : "bg-white text-gray-400 border border-slate-200 hover:text-slate-900"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Mic className="w-4 h-4" />
            Audio Only
          </button>
        </div>

        {/* Video / Audio Preview Area */}
        <div className="relative rounded-xl overflow-hidden bg-white border border-slate-200 aspect-video flex items-center justify-center">
          {/* Live video preview */}
          {videoEnabled && mediaStream && !recordedBlob && (
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* Audio only mode - show waveform area */}
          {!videoEnabled && mediaStream && !recordedBlob && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Mic className="w-10 h-10 text-indigo-600" />
              </div>
              <p className="text-gray-400 text-sm">Audio recording in progress</p>
            </div>
          )}

          {/* Idle state */}
          {!mediaStream && !recordedBlob && (
            <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
              {videoEnabled ? (
                <Video className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
              <p className="text-sm">
                Press record to start your practice session
              </p>
            </div>
          )}

          {/* Recorded preview */}
          {recordedBlob && recordedUrl && processingStage === "idle" && (
            <div className="w-full h-full">
              <VideoPreview src={recordedUrl} isVideo={videoEnabled} />
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && !isPaused && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-600">REC</span>
            </div>
          )}

          {isPaused && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs font-medium text-yellow-600">
                PAUSED
              </span>
            </div>
          )}
        </div>

        {/* Waveform Visualiser */}
        <div className="rounded-xl bg-white border border-slate-200 px-4 py-2">
          <WaveformVisualiser
            audioData={audioData}
            isActive={isRecording && !isPaused}
          />
        </div>

        {/* Recording Controls */}
        <div className="rounded-xl bg-white border border-slate-200">
          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            duration={duration}
            hasRecording={!!recordedBlob}
            onStartRecording={handleStartRecording}
            onPauseRecording={pauseRecording}
            onResumeRecording={resumeRecording}
            onStopRecording={stopRecording}
            onRetake={handleRetake}
          />
        </div>

        {/* Error Display */}
        {(recordingError || uploadError) && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{recordingError || uploadError}</span>
          </div>
        )}

        {/* Upload Button & Processing Status */}
        {recordedBlob && processingStage === "idle" && !uploadError && (
          <button
            onClick={handleUpload}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
          >
            <Upload className="w-5 h-5" />
            Upload & Analyze
          </button>
        )}

        {/* Processing Status */}
        <AnimatePresence>
          {processingStage !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl bg-white border border-slate-200 p-5"
            >
              <div className="flex flex-col gap-4">
                {/* Progress bar for upload */}
                {processingStage === "uploading" && (
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}

                {/* Status steps */}
                <div className="flex items-center gap-8">
                  <ProcessingStep
                    label="Uploading"
                    stage="uploading"
                    currentStage={processingStage}
                  />
                  <ProcessingStep
                    label="Transcribing"
                    stage="transcribing"
                    currentStage={processingStage}
                  />
                  <ProcessingStep
                    label="Analysing"
                    stage="analysing"
                    currentStage={processingStage}
                  />
                  <ProcessingStep
                    label="Complete"
                    stage="complete"
                    currentStage={processingStage}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Right Panel (40%) ────────────────────────────────────────────── */}
      <div className="flex-[2] flex flex-col gap-4">
        {/* Week / Day / Phase Header */}
        <div className="rounded-xl bg-white border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-500/20 text-indigo-600 border border-indigo-200 uppercase tracking-wider">
              {phaseLabel}
            </span>
            <span className="text-sm text-gray-500">
              Week {currentWeek} &middot; Day {currentDay}
            </span>
          </div>
          {plan && (
            <h2 className="text-lg font-semibold text-slate-900">{plan.title}</h2>
          )}
        </div>

        {/* Recording Prompt Card */}
        {todayPlan && (
          <div className="rounded-xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Today&apos;s Exercise
              </h3>
            </div>
            <h4 className="text-base font-medium text-slate-900 mb-2">
              {todayPlan.title}
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              {todayPlan.description}
            </p>

            {/* Objectives */}
            {todayPlan.objectives && todayPlan.objectives.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {todayPlan.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Target className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span className="text-gray-300">{obj}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Focus Skill Badge */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Focus Skill
            </p>
            <p className="text-sm font-medium text-slate-900">{phaseLabel}</p>
          </div>
        </div>

        {/* Tips Section */}
        {todayPlan?.tips && todayPlan.tips.length > 0 && (
          <div className="rounded-xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Tips
              </h3>
            </div>
            <ul className="space-y-2">
              {todayPlan.tips.slice(0, 3).map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-400"
                >
                  <span className="text-indigo-600 mt-0.5">&bull;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Target Metrics */}
        <div className="rounded-xl bg-white border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Target Metrics
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-medium text-slate-900">
                {todayPlan?.estimatedDuration
                  ? formatDuration(todayPlan.estimatedDuration * 60)
                  : "3:00 - 5:00"}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-gray-500">Pace</p>
              <p className="text-sm font-medium text-slate-900">130-160 WPM</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-gray-500">Filler Words</p>
              <p className="text-sm font-medium text-slate-900">&lt; 5</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-gray-500">Target Score</p>
              <p className="text-sm font-medium text-slate-900">70+</p>
            </div>
          </div>
        </div>

        {/* Previous Session Score */}
        {previousScore !== null && (
          <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Previous Session
              </p>
              <p className="text-sm font-medium text-slate-900">
                Score: {Math.round(previousScore)}/100
              </p>
            </div>
          </div>
        )}

        {/* Recording Filename Preview */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-center gap-3">
          <FileText className="w-4 h-4 text-gray-500 shrink-0" />
          <p className="text-xs text-gray-500 truncate font-mono">
            {recordingFilename}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Processing Step Sub-component ──────────────────────────────────────────

const STAGE_ORDER: ProcessingStage[] = [
  "uploading",
  "transcribing",
  "analysing",
  "complete",
];

function ProcessingStep({
  label,
  stage,
  currentStage,
}: {
  label: string;
  stage: ProcessingStage;
  currentStage: ProcessingStage;
}) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const stepIndex = STAGE_ORDER.indexOf(stage);
  const isActive = currentStage === stage;
  const isComplete = currentIndex > stepIndex;

  return (
    <div className="flex items-center gap-2">
      {isComplete ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      ) : isActive ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-5 h-5 text-indigo-600" />
        </motion.div>
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
      )}
      <span
        className={`text-sm font-medium ${
          isActive
            ? "text-indigo-600"
            : isComplete
              ? "text-emerald-600"
              : "text-gray-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
