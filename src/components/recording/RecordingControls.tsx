"use client";

import { useState, useCallback } from "react";
import { Mic, Square, Pause, Play, RotateCcw } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import CountdownTimer from "./CountdownTimer";

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  hasRecording: boolean;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onRetake: () => void;
}

export default function RecordingControls({
  isRecording,
  isPaused,
  duration,
  hasRecording,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onRetake,
}: RecordingControlsProps) {
  const [showCountdown, setShowCountdown] = useState(false);

  const handleStartClick = useCallback(() => {
    setShowCountdown(true);
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    onStartRecording();
  }, [onStartRecording]);

  return (
    <div className="relative">
      <CountdownTimer
        isActive={showCountdown}
        onComplete={handleCountdownComplete}
      />

      <div className="flex flex-col items-center gap-4 py-4">
        {/* Timer Display */}
        <div className="text-3xl font-mono font-semibold text-slate-900 tabular-nums tracking-wider">
          {formatDuration(duration)}
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-6">
          {!isRecording && !hasRecording && (
            <button
              onClick={handleStartClick}
              disabled={showCountdown}
              className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50"
            >
              {/* Pulse animation ring */}
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
              <Mic className="w-8 h-8 text-slate-900 relative z-10" />
            </button>
          )}

          {isRecording && (
            <>
              {/* Pause / Resume */}
              <button
                onClick={isPaused ? onResumeRecording : onPauseRecording}
                className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-slate-200 bg-white hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? (
                  <Play className="w-6 h-6 text-slate-900" />
                ) : (
                  <Pause className="w-6 h-6 text-slate-900" />
                )}
              </button>

              {/* Record indicator (pulsing red dot) */}
              <div className="relative flex items-center justify-center w-20 h-20">
                {!isPaused && (
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
                )}
                <div
                  className={`w-6 h-6 rounded-full ${
                    isPaused ? "bg-yellow-500" : "bg-red-500"
                  }`}
                />
              </div>

              {/* Stop */}
              <button
                onClick={onStopRecording}
                className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-slate-200 bg-white hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
                title="Stop recording"
              >
                <Square className="w-6 h-6 text-red-600" />
              </button>
            </>
          )}

          {!isRecording && hasRecording && (
            <button
              onClick={onRetake}
              className="flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Retake</span>
            </button>
          )}
        </div>

        {/* Status Text */}
        <p className="text-xs text-gray-500">
          {showCountdown
            ? "Get ready..."
            : isRecording && !isPaused
              ? "Recording in progress..."
              : isPaused
                ? "Recording paused"
                : hasRecording
                  ? "Recording complete"
                  : "Press the button to start recording"}
        </p>
      </div>
    </div>
  );
}
