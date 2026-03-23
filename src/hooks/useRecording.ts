"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type PermissionStatus = "prompt" | "granted" | "denied" | "error";

export interface UseRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  error: string | null;
  permissionStatus: PermissionStatus;
  audioData: Uint8Array;
  startRecording: (videoEnabled: boolean) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  resetRecording: () => void;
}

const EMPTY_AUDIO_DATA = new Uint8Array(32);

export function useRecording(): UseRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("prompt");
  const [audioData, setAudioData] = useState<Uint8Array>(EMPTY_AUDIO_DATA);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioData = () => {
        analyser.getByteFrequencyData(dataArray);
        setAudioData(new Uint8Array(dataArray));
        animationFrameRef.current = requestAnimationFrame(updateAudioData);
      };

      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    } catch {
      console.warn("Web Audio API not available for visualization");
    }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioData(EMPTY_AUDIO_DATA);
  }, []);

  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(
    async (videoEnabled: boolean) => {
      setError(null);
      setRecordedBlob(null);
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
      }
      chunksRef.current = [];

      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
          video: videoEnabled
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setMediaStream(stream);
        setPermissionStatus("granted");

        startAudioAnalysis(stream);

        const mimeType = videoEnabled
          ? MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
            ? "video/webm;codecs=vp9,opus"
            : "video/webm"
          : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setRecordedBlob(blob);
          setRecordedUrl(url);
          setIsRecording(false);
          setIsPaused(false);
          stopTimer();
          stopAudioAnalysis();
        };

        recorder.onerror = () => {
          setError("Recording failed. Please try again.");
          setIsRecording(false);
          setIsPaused(false);
          stopTimer();
          stopAudioAnalysis();
        };

        recorder.start(1000); // collect data every second
        setIsRecording(true);
        setIsPaused(false);
        startTimer();
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Microphone access was denied. Please allow microphone access in your browser settings."
            : err instanceof DOMException && err.name === "NotFoundError"
              ? "No microphone found. Please connect a microphone and try again."
              : "Failed to start recording. Please check your device permissions.";

        setError(message);
        setPermissionStatus(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "denied"
            : "error"
        );
      }
    },
    [recordedUrl, startAudioAnalysis, stopAudioAnalysis, startTimer, stopTimer]
  );

  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setMediaStream(null);
    streamRef.current = null;
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    stopTimer();
    stopAudioAnalysis();

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }

    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setMediaStream(null);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setError(null);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }, [stopRecording, stopTimer, stopAudioAnalysis, recordedUrl]);

  return {
    isRecording,
    isPaused,
    duration,
    mediaStream,
    mediaRecorder: mediaRecorderRef.current,
    recordedBlob,
    recordedUrl,
    error,
    permissionStatus,
    audioData,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
}
