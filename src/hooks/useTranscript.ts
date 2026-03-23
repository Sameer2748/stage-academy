"use client";

import { useState, useCallback } from "react";
import type { TranscriptData, FillerWordInstance, ApiResponse } from "@/types";
import { FILLER_WORDS } from "@/lib/constants";

export interface UseTranscriptReturn {
  transcript: TranscriptData | null;
  loading: boolean;
  error: string | null;
  fetchTranscript: (sessionId: string) => Promise<TranscriptData | null>;
  getFillerWords: () => FillerWordInstance[];
  getFillerWordCount: () => number;
  getCleanTranscript: () => string;
  getWordCount: () => number;
  getWordsPerMinute: () => number;
}

export function useTranscript(): UseTranscriptReturn {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscript = useCallback(
    async (sessionId: string): Promise<TranscriptData | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch session: ${response.statusText}`);
        }

        const data: ApiResponse<{ transcript: TranscriptData }> =
          await response.json();

        if (!data.success || !data.data?.transcript) {
          throw new Error("Transcript not available yet");
        }

        setTranscript(data.data.transcript);
        return data.data.transcript;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch transcript";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getFillerWords = useCallback((): FillerWordInstance[] => {
    if (!transcript?.content) return [];

    const content = transcript.content.toLowerCase();
    const fillerInstances: FillerWordInstance[] = [];

    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        const timestamps: number[] = [];
        if (transcript.words) {
          transcript.words.forEach((word) => {
            if (word.word.toLowerCase() === filler.toLowerCase()) {
              timestamps.push(word.start);
            }
          });
        }
        fillerInstances.push({
          word: filler,
          count: matches.length,
          timestamps,
        });
      }
    }

    return fillerInstances.sort((a, b) => b.count - a.count);
  }, [transcript]);

  const getFillerWordCount = useCallback((): number => {
    return getFillerWords().reduce((sum, fw) => sum + fw.count, 0);
  }, [getFillerWords]);

  const getCleanTranscript = useCallback((): string => {
    if (!transcript?.content) return "";

    let clean = transcript.content;
    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      clean = clean.replace(regex, "").replace(/\s{2,}/g, " ").trim();
    }
    return clean;
  }, [transcript]);

  const getWordCount = useCallback((): number => {
    if (!transcript?.content) return 0;
    return transcript.content
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }, [transcript]);

  const getWordsPerMinute = useCallback((): number => {
    if (!transcript?.content || !transcript.duration) return 0;
    const words = getWordCount();
    const minutes = transcript.duration / 60;
    return minutes > 0 ? Math.round(words / minutes) : 0;
  }, [transcript, getWordCount]);

  return {
    transcript,
    loading,
    error,
    fetchTranscript,
    getFillerWords,
    getFillerWordCount,
    getCleanTranscript,
    getWordCount,
    getWordsPerMinute,
  };
}
