"use client";

import { useState, useCallback } from "react";
import type { AIAnalysisData, ApiResponse } from "@/types";

export interface UseAnalysisReturn {
  analysis: AIAnalysisData | null;
  loading: boolean;
  error: string | null;
  fetchAnalysis: (sessionId: string) => Promise<AIAnalysisData | null>;
  triggerAnalysis: (sessionId: string) => Promise<AIAnalysisData | null>;
}

export function useAnalysis(): UseAnalysisReturn {
  const [analysis, setAnalysis] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(
    async (sessionId: string): Promise<AIAnalysisData | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch session: ${response.statusText}`);
        }

        const data: ApiResponse<{ aiAnalysis: AIAnalysisData }> =
          await response.json();

        if (!data.success || !data.data?.aiAnalysis) {
          throw new Error("Analysis not available yet");
        }

        setAnalysis(data.data.aiAnalysis);
        return data.data.aiAnalysis;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch analysis";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const triggerAnalysis = useCallback(
    async (sessionId: string): Promise<AIAnalysisData | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/analyse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to trigger analysis: ${response.statusText}`);
        }

        const data: ApiResponse<AIAnalysisData> = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Analysis failed");
        }

        setAnalysis(data.data);
        return data.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to trigger analysis";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    analysis,
    loading,
    error,
    fetchAnalysis,
    triggerAnalysis,
  };
}
