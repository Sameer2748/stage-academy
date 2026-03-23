"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Volume2,
  Music,
  Timer,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { COURSE_MODULES } from "@/lib/course-data";

interface PhaseData {
  id: string;
  name: string;
  phase: string;
  weeks: number[];
  description: string;
  avgScore: number;
  completionPercent: number;
  sessionsCount: number;
  keyMetric: string;
  keyMetricValue: string;
}

interface WeekData {
  weekNumber: number;
  phase: string;
  status: "future" | "current" | "completed";
  completionRate: number;
  avgScore: number;
  sessionsCount: number;
}

interface ComparisonData {
  metric: string;
  baseline: number;
  current: number;
  delta: number;
}

const phaseIcons: Record<string, React.ReactNode> = {
  VOLUME: <Volume2 className="w-5 h-5" />,
  TONALITY: <Music className="w-5 h-5" />,
  PAUSE: <Timer className="w-5 h-5" />,
  STORYTELLING: <BookOpen className="w-5 h-5" />,
};

const phaseColors: Record<string, string> = {
  VOLUME: "from-blue-500 to-blue-700",
  TONALITY: "from-purple-500 to-purple-700",
  PAUSE: "from-orange-500 to-orange-700",
  STORYTELLING: "from-emerald-500 to-emerald-700",
};

const phaseBorderColors: Record<string, string> = {
  VOLUME: "border-blue-500/30",
  TONALITY: "border-purple-500/30",
  PAUSE: "border-orange-500/30",
  STORYTELLING: "border-emerald-500/30",
};

const phaseVariant: Record<string, "phase-volume" | "phase-tonality" | "phase-pause" | "phase-storytelling"> = {
  VOLUME: "phase-volume",
  TONALITY: "phase-tonality",
  PAUSE: "phase-pause",
  STORYTELLING: "phase-storytelling",
};

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [currentPhase, setCurrentPhase] = useState("VOLUME");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());

  // Load watched videos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("watched-videos");
      if (saved) setWatchedVideos(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/analytics");
        const data = await res.json();

        // Build phase data
        const phaseList: PhaseData[] = [
          {
            id: "VOLUME",
            name: "Volume & Projection",
            phase: "VOLUME",
            weeks: [1, 2, 3],
            description: "Master breath, projection, and conscious volume control",
            avgScore: data.phaseStats?.VOLUME?.avgScore ?? 0,
            completionPercent: data.phaseStats?.VOLUME?.completion ?? 0,
            sessionsCount: data.phaseStats?.VOLUME?.sessions ?? 0,
            keyMetric: "Volume Consistency",
            keyMetricValue: data.phaseStats?.VOLUME?.keyMetric ?? "N/A",
          },
          {
            id: "TONALITY",
            name: "Tonality & Vocal Archetypes",
            phase: "TONALITY",
            weeks: [4, 5, 6],
            description: "Master the 4 vocal archetypes and dynamic speech",
            avgScore: data.phaseStats?.TONALITY?.avgScore ?? 0,
            completionPercent: data.phaseStats?.TONALITY?.completion ?? 0,
            sessionsCount: data.phaseStats?.TONALITY?.sessions ?? 0,
            keyMetric: "Tonal Range",
            keyMetricValue: data.phaseStats?.TONALITY?.keyMetric ?? "N/A",
          },
          {
            id: "PAUSE",
            name: "The Pause & Filler Words",
            phase: "PAUSE",
            weeks: [7, 8, 9],
            description: "Eliminate filler words and use silence as a power tool",
            avgScore: data.phaseStats?.PAUSE?.avgScore ?? 0,
            completionPercent: data.phaseStats?.PAUSE?.completion ?? 0,
            sessionsCount: data.phaseStats?.PAUSE?.sessions ?? 0,
            keyMetric: "Filler Reduction",
            keyMetricValue: data.phaseStats?.PAUSE?.keyMetric ?? "N/A",
          },
          {
            id: "STORYTELLING",
            name: "Storytelling",
            phase: "STORYTELLING",
            weeks: [10, 11, 12],
            description: "Master the CCR story structure and become a compelling communicator",
            avgScore: data.phaseStats?.STORYTELLING?.avgScore ?? 0,
            completionPercent: data.phaseStats?.STORYTELLING?.completion ?? 0,
            sessionsCount: data.phaseStats?.STORYTELLING?.sessions ?? 0,
            keyMetric: "Narrative Score",
            keyMetricValue: data.phaseStats?.STORYTELLING?.keyMetric ?? "N/A",
          },
        ];
        setPhases(phaseList);

        // Build week data
        const weekList: WeekData[] = [];
        for (let w = 1; w <= 12; w++) {
          const phase =
            w <= 3
              ? "VOLUME"
              : w <= 6
                ? "TONALITY"
                : w <= 9
                  ? "PAUSE"
                  : "STORYTELLING";
          const weekStats = data.weekStats?.[w];
          weekList.push({
            weekNumber: w,
            phase,
            status: weekStats?.status ?? (w === 1 ? "current" : "future"),
            completionRate: weekStats?.completion ?? 0,
            avgScore: weekStats?.avgScore ?? 0,
            sessionsCount: weekStats?.sessions ?? 0,
          });
        }
        setWeeks(weekList);

        // Build comparison
        const comp: ComparisonData[] = [
          {
            metric: "Overall Score",
            baseline: data.baseline?.overall ?? 0,
            current: data.latest?.overall ?? 0,
            delta: (data.latest?.overall ?? 0) - (data.baseline?.overall ?? 0),
          },
          {
            metric: "Volume",
            baseline: data.baseline?.volume ?? 0,
            current: data.latest?.volume ?? 0,
            delta: (data.latest?.volume ?? 0) - (data.baseline?.volume ?? 0),
          },
          {
            metric: "Tonality",
            baseline: data.baseline?.tonality ?? 0,
            current: data.latest?.tonality ?? 0,
            delta: (data.latest?.tonality ?? 0) - (data.baseline?.tonality ?? 0),
          },
          {
            metric: "Pause",
            baseline: data.baseline?.pause ?? 0,
            current: data.latest?.pause ?? 0,
            delta: (data.latest?.pause ?? 0) - (data.baseline?.pause ?? 0),
          },
          {
            metric: "Filler Count",
            baseline: data.baseline?.fillers ?? 0,
            current: data.latest?.fillers ?? 0,
            delta: (data.latest?.fillers ?? 0) - (data.baseline?.fillers ?? 0),
          },
        ];
        setComparison(comp);

        setCurrentPhase(data.currentPhase ?? "VOLUME");
        setCurrentWeek(data.currentWeek ?? 1);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Progress</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Your 12-week journey through Stage Academy
        </p>
      </div>

      {/* Course Video Progress */}
      {(() => {
        const totalVideos = COURSE_MODULES.reduce((s, m) => s + m.videoCount, 0);
        const totalWatched = COURSE_MODULES.reduce(
          (s, m) => s + m.videos.filter((v) => watchedVideos.has(v.driveFileId)).length, 0
        );
        const overallPct = totalVideos > 0 ? (totalWatched / totalVideos) * 100 : 0;

        return (
          <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Course Video Progress</h3>
              <span className="text-sm text-zinc-400 font-medium">{totalWatched}/{totalVideos} watched</span>
            </div>
            <Progress value={overallPct} className="h-2 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {COURSE_MODULES.map((mod) => {
                const watched = mod.videos.filter((v) => watchedVideos.has(v.driveFileId)).length;
                const pct = mod.videoCount > 0 ? (watched / mod.videoCount) * 100 : 0;
                return (
                  <div key={mod.folderId} className="p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
                    <p className="text-[10px] text-zinc-500 truncate mb-1">Module {mod.moduleNumber}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-lg font-bold text-white">{watched}</span>
                      <span className="text-xs text-zinc-600 mb-0.5">/{mod.videoCount}</span>
                    </div>
                    <Progress value={pct} className="h-1 mt-1.5" />
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* 12-Week Timeline */}
      <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
        <h3 className="font-semibold text-sm mb-4">12-Week Overview</h3>
        <div className="grid grid-cols-12 gap-2">
          {weeks.map((week) => {
            const isCurrent = week.weekNumber === currentWeek;
            return (
              <div
                key={week.weekNumber}
                className={`relative flex flex-col items-center p-2 rounded-lg transition-all ${
                  isCurrent
                    ? `bg-gradient-to-b ${phaseColors[week.phase]} bg-opacity-20 ring-2 ring-white/20`
                    : week.status === "completed"
                      ? "bg-[#1a1a1a]"
                      : "bg-[#0a0a0a]"
                }`}
              >
                <span className="text-[10px] text-zinc-500 mb-1">W{week.weekNumber}</span>
                {week.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Play className="w-4 h-4 text-white fill-white" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-700" />
                )}
                {week.avgScore > 0 && (
                  <span className="text-[10px] text-zinc-400 mt-1">
                    {week.avgScore.toFixed(1)}
                  </span>
                )}
                {week.completionRate > 0 && (
                  <div className="w-full mt-1">
                    <div className="h-0.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(week.completionRate, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Phase labels below timeline */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {["VOLUME", "TONALITY", "PAUSE", "STORYTELLING"].map((phase) => (
            <div
              key={phase}
              className="text-center text-[10px] text-zinc-500"
            >
              <Badge variant={phaseVariant[phase]} className="text-[9px]">
                {phase}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Phase Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {phases.map((phase) => {
          const isCurrent = phase.phase === currentPhase;
          return (
            <Card
              key={phase.id}
              className={`p-6 bg-[#111111] border-[#2a2a2a] ${
                isCurrent ? phaseBorderColors[phase.phase] : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${phaseColors[phase.phase]} text-white`}
                  >
                    {phaseIcons[phase.phase]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{phase.name}</h4>
                    <p className="text-xs text-zinc-500">
                      Weeks {phase.weeks.join(", ")}
                    </p>
                  </div>
                </div>
                {isCurrent && <Badge variant="default">Current</Badge>}
              </div>
              <p className="text-xs text-zinc-400 mb-4">{phase.description}</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Completion</span>
                  <span className="text-zinc-300">
                    {phase.completionPercent.toFixed(0)}%
                  </span>
                </div>
                <Progress value={phase.completionPercent} className="h-1.5" />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <span className="text-lg font-bold text-white">
                      {phase.avgScore > 0 ? phase.avgScore.toFixed(1) : "-"}
                    </span>
                    <p className="text-[10px] text-zinc-500">Avg Score</p>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-white">
                      {phase.sessionsCount}
                    </span>
                    <p className="text-[10px] text-zinc-500">Sessions</p>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-white">
                      {phase.keyMetricValue}
                    </span>
                    <p className="text-[10px] text-zinc-500">{phase.keyMetric}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Before & After Scorecard */}
      <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-sm">Before & After</h3>
        </div>
        {comparison.every((c) => c.baseline === 0 && c.current === 0) ? (
          <p className="text-sm text-zinc-500 text-center py-4">
            Complete more sessions to see your before & after comparison.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {comparison.map((c) => {
              const isImprovement =
                c.metric === "Filler Count" ? c.delta < 0 : c.delta > 0;
              const isNeutral = c.delta === 0;
              return (
                <div key={c.metric} className="text-center p-3 rounded-lg bg-[#0a0a0a]">
                  <p className="text-[10px] text-zinc-500 mb-2">{c.metric}</p>
                  <div className="flex items-center justify-center gap-3">
                    <div>
                      <span className="text-sm text-zinc-500">
                        {c.baseline > 0 ? c.baseline.toFixed(1) : "-"}
                      </span>
                      <p className="text-[9px] text-zinc-600">Baseline</p>
                    </div>
                    <div>
                      {isNeutral ? (
                        <Minus className="w-4 h-4 text-zinc-500" />
                      ) : isImprovement ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-sm font-bold ${
                          isImprovement
                            ? "text-emerald-400"
                            : isNeutral
                              ? "text-zinc-400"
                              : "text-red-400"
                        }`}
                      >
                        {c.current > 0 ? c.current.toFixed(1) : "-"}
                      </span>
                      <p className="text-[9px] text-zinc-600">Now</p>
                    </div>
                  </div>
                  {!isNeutral && c.delta !== 0 && (
                    <span
                      className={`text-[10px] mt-1 block ${
                        isImprovement ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {c.delta > 0 ? "+" : ""}
                      {c.delta.toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Graduation Recordings */}
      <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
        <h3 className="font-semibold text-sm mb-4">Graduation Recordings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { phase: "VOLUME", week: 3, label: "Phase 1 Final" },
            { phase: "TONALITY", week: 6, label: "Phase 2 Final" },
            { phase: "PAUSE", week: 9, label: "Phase 3 Final" },
            { phase: "STORYTELLING", week: 12, label: "Phase 4 Final" },
          ].map((grad) => {
            const week = weeks.find((w) => w.weekNumber === grad.week);
            const isCompleted = week?.status === "completed";
            return (
              <Card
                key={grad.phase}
                className={`p-4 bg-[#0a0a0a] border-[#2a2a2a] text-center ${
                  isCompleted ? phaseBorderColors[grad.phase] : ""
                }`}
              >
                <Badge variant={phaseVariant[grad.phase]} className="mb-2">
                  {grad.label}
                </Badge>
                {isCompleted ? (
                  <>
                    <div className="text-2xl font-bold text-white my-2">
                      {week.avgScore.toFixed(1)}
                    </div>
                    <p className="text-xs text-zinc-500">Week {grad.week}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-[#2a2a2a] text-xs"
                      asChild
                    >
                      <Link href="/sessions">View Session</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Circle className="w-8 h-8 mx-auto text-zinc-700 my-2" />
                    <p className="text-xs text-zinc-600">Not yet reached</p>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
