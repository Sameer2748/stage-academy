"use client";

import { useState, useCallback } from "react";
import type { WeeklyPlanData, Phase, ApiResponse } from "@/types";

export interface UsePlanReturn {
  plan: WeeklyPlanData | null;
  loading: boolean;
  error: string | null;
  fetchCurrentPlan: () => Promise<WeeklyPlanData | null>;
  generatePlan: (
    weekNumber: number,
    phase: Phase
  ) => Promise<WeeklyPlanData | null>;
  adjustPlan: (
    weekNumber: number,
    adjustments: Record<string, unknown>
  ) => Promise<WeeklyPlanData | null>;
  advancePhase: (confirmText: string) => Promise<boolean>;
}

export function usePlan(): UsePlanReturn {
  const [plan, setPlan] = useState<WeeklyPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPlan = useCallback(async (): Promise<WeeklyPlanData | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/weekly-plan");
      if (!response.ok) {
        throw new Error(`Failed to fetch plan: ${response.statusText}`);
      }

      const data: ApiResponse<WeeklyPlanData> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "No active plan found");
      }

      setPlan(data.data);
      return data.data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch plan";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generatePlan = useCallback(
    async (
      weekNumber: number,
      phase: Phase
    ): Promise<WeeklyPlanData | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/weekly-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: weekNumber, phase }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate plan: ${response.statusText}`);
        }

        const data: ApiResponse<WeeklyPlanData> = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Plan generation failed");
        }

        setPlan(data.data);
        return data.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate plan";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const adjustPlan = useCallback(
    async (
      weekNumber: number,
      adjustments: Record<string, unknown>
    ): Promise<WeeklyPlanData | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/weekly-plan/adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: weekNumber, adjustments }),
        });

        if (!response.ok) {
          throw new Error(`Failed to adjust plan: ${response.statusText}`);
        }

        const data: ApiResponse<WeeklyPlanData> = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "Plan adjustment failed");
        }

        setPlan(data.data);
        return data.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to adjust plan";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const advancePhase = useCallback(
    async (confirmText: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/weekly-plan/advance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: confirmText }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to advance phase: ${response.statusText}`
          );
        }

        const data: ApiResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Phase advancement failed");
        }

        // Refresh plan after advancing
        await fetchCurrentPlan();
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to advance phase";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchCurrentPlan]
  );

  return {
    plan,
    loading,
    error,
    fetchCurrentPlan,
    generatePlan,
    adjustPlan,
    advancePhase,
  };
}
