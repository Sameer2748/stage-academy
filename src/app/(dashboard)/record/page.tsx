"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Video,
  Square,
  Pause,
  Play,
  RotateCcw,
  Download,
  Clock,
  Target,
  Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type RecordingState = "idle" | "recording" | "paused" | "done";

export default function RecordPage() {
  const [mode, setMode] = useState<"video" | "audio">("audio");
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioData, setAudioData] = useState<number[]>(new Array(32).fill(4));
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && mediaStream && mode === "video") {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(buf);
        setAudioData(Array.from(buf));
        animFrameRef.current = requestAnimationFrame(update);
      };
      animFrameRef.current = requestAnimationFrame(update);
    } catch {
      // Web Audio API not available
    }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setAudioData(new Array(32).fill(4));
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: mode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
      });

      streamRef.current = stream;
      setMediaStream(stream);

      startAudioAnalysis(stream);

      const mimeType = mode === "video"
        ? (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm")
        : (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm");

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setState("done");
        if (timerRef.current) clearInterval(timerRef.current);
        stopAudioAnalysis();
      };

      recorder.start(1000);
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Microphone access denied. Please allow it in browser settings."
        : "Failed to start recording. Check your device permissions.";
      setError(msg);
    }
  }, [mode, recordedUrl, startAudioAnalysis, stopAudioAnalysis]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setState("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
    setMediaStream(null);
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    stopAudioAnalysis();
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setState("idle");
    setDuration(0);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setError(null);
    setMediaStream(null);
    chunksRef.current = [];
  }, [stopRecording, stopAudioAnalysis, recordedUrl]);

  const downloadRecording = useCallback(() => {
    if (!recordedUrl || !recordedBlob) return;
    const a = document.createElement("a");
    a.href = recordedUrl;
    a.download = `practice-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
  }, [recordedUrl, recordedBlob]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recording Studio</h1>
        <p className="text-sm text-slate-400 mt-1">
          Record your practice session and track your progress
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Recording Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => state === "idle" && setMode("audio")}
              disabled={state !== "idle"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "audio"
                  ? "bg-indigo-500/20 text-indigo-600 border border-indigo-200"
                  : "bg-white text-slate-500 border border-slate-200 hover:text-slate-900"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Mic className="w-4 h-4" />
              Audio Only
            </button>
            <button
              onClick={() => state === "idle" && setMode("video")}
              disabled={state !== "idle"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "video"
                  ? "bg-indigo-500/20 text-indigo-600 border border-indigo-200"
                  : "bg-white text-slate-500 border border-slate-200 hover:text-slate-900"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Video className="w-4 h-4" />
              Video + Audio
            </button>
          </div>

          {/* Preview Area */}
          <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 aspect-video flex items-center justify-center">
            {/* Live Video Preview */}
            {mode === "video" && mediaStream && state !== "done" && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover mirror"
                style={{ transform: "scaleX(-1)" }}
              />
            )}

            {/* Audio Mode - Waveform */}
            {mode === "audio" && (state === "recording" || state === "paused") && (
              <div className="flex items-end justify-center gap-[3px] h-32 px-8">
                {audioData.slice(0, 32).map((val, i) => (
                  <motion.div
                    key={i}
                    className="w-2 rounded-full bg-gradient-to-t from-indigo-600 to-purple-500"
                    animate={{ height: Math.max(4, (val / 255) * 80) }}
                    transition={{ duration: 0.05 }}
                  />
                ))}
              </div>
            )}

            {/* Idle State */}
            {state === "idle" && (
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {mode === "video" ? (
                    <Video className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </div>
                <p className="text-sm">Press the button below to start recording</p>
              </div>
            )}

            {/* Done State - Playback */}
            {state === "done" && recordedUrl && (
              <div className="w-full h-full">
                {mode === "video" ? (
                  <video src={recordedUrl} controls className="w-full h-full object-contain bg-black" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <Mic className="w-10 h-10 text-emerald-600" />
                    </div>
                    <p className="text-sm text-slate-500">Recording complete - {formatTime(duration)}</p>
                    <audio src={recordedUrl} controls className="w-64" />
                  </div>
                )}
              </div>
            )}

            {/* Recording Indicator */}
            <AnimatePresence>
              {state === "recording" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-200 backdrop-blur-sm"
                >
                  <motion.span
                    className="w-2.5 h-2.5 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                  <span className="text-xs font-semibold text-red-600">REC</span>
                </motion.div>
              )}
              {state === "paused" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-xs font-semibold text-yellow-600">PAUSED</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer */}
            {(state === "recording" || state === "paused") && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-slate-200">
                <span className="text-sm font-mono text-slate-900">{formatTime(duration)}</span>
              </div>
            )}
          </div>

          {/* Waveform Bar (when video mode recording) */}
          {mode === "video" && (state === "recording" || state === "paused") && (
            <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 flex items-end justify-center gap-[2px] h-16">
              {audioData.slice(0, 48).map((val, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-indigo-600 to-purple-500"
                  animate={{ height: Math.max(3, (val / 255) * 40) }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <div className="flex items-center justify-center gap-4">
              {state === "idle" && (
                <button
                  onClick={startRecording}
                  className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-900 font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                >
                  <div className="w-5 h-5 rounded-full bg-red-500 group-hover:animate-pulse" />
                  Start Recording
                </button>
              )}

              {state === "recording" && (
                <>
                  <button
                    onClick={pauseRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-50 border border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/20 font-medium transition-all"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-500/20 font-medium transition-all"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                </>
              )}

              {state === "paused" && (
                <>
                  <button
                    onClick={resumeRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-500/20 font-medium transition-all"
                  >
                    <Play className="w-5 h-5" />
                    Resume
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-500/20 font-medium transition-all"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                </>
              )}

              {state === "done" && (
                <>
                  <button
                    onClick={resetRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-all"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Record Again
                  </button>
                  <button
                    onClick={downloadRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </>
              )}
            </div>

            {/* Duration display when recording */}
            {(state === "recording" || state === "paused") && (
              <div className="flex items-center justify-center mt-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-lg">{formatTime(duration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Panel - Tips & Info */}
        <div className="space-y-4">
          {/* Session Info */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">Practice Goals</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Duration</span>
                <span className="text-slate-900 font-medium">3-5 min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Pace</span>
                <span className="text-slate-900 font-medium">130-160 WPM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Filler Words</span>
                <span className="text-slate-900 font-medium">&lt; 5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Target Score</span>
                <span className="text-slate-900 font-medium">70+</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <h3 className="text-sm font-semibold text-slate-900">Quick Tips</h3>
            </div>
            <ul className="space-y-2.5">
              {[
                "Speak clearly and project your voice",
                "Use intentional pauses instead of filler words",
                "Vary your tonality to keep engagement",
                "Record in a quiet environment",
                "Stand up while recording for better energy",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                  <span className="text-indigo-600 mt-0.5 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">How it works</h3>
            <ol className="space-y-2.5">
              {[
                "Choose audio or video mode",
                "Click 'Start Recording' and allow mic access",
                "Practice your speech or presentation",
                "Stop when done and review your recording",
                "Download to save your practice session",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-500">
                  <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
