"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mic,
  Clock,
  Trophy,
  TrendingDown,
  Flame,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface AnalyticsData {
  fillerTrend: { date: string; um: number; uh: number; like: number; total: number }[];
  scoreHistory: { date: string; volume: number; tonality: number; pause: number; storytelling: number; overall: number }[];
  heatmap: { date: string; level: number }[];
  durationHistory: { date: string; duration: number; recommended: number }[];
  wpmHistory: { date: string; wpm: number }[];
  phaseRadar: { phase: string; volume: number; tonality: number; pause: number; storytelling: number }[];
  stats: {
    totalRecordings: number;
    totalHours: number;
    bestScore: number;
    lowestFillers: number;
    currentStreak: number;
    longestStreak: number;
  };
}

const chartColors = {
  volume: "#3B82F6",
  tonality: "#8B5CF6",
  pause: "#F97316",
  storytelling: "#10B981",
  overall: "#6366F1",
  um: "#EF4444",
  uh: "#F59E0B",
  like: "#EC4899",
  total: "#6366F1",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [visibleScores, setVisibleScores] = useState<Record<string, boolean>>({
    volume: true,
    tonality: true,
    pause: true,
    storytelling: true,
    overall: true,
  });
  const [visibleFillers, setVisibleFillers] = useState<Record<string, boolean>>({
    total: true,
    um: true,
    uh: true,
    like: true,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics?detailed=true");
        const json = await res.json();
        setData({
          fillerTrend: json.fillerTrend || [],
          scoreHistory: json.scoreHistory || [],
          heatmap: json.heatmap || [],
          durationHistory: json.durationHistory || [],
          wpmHistory: json.wpmHistory || [],
          phaseRadar: json.phaseRadar || [],
          stats: {
            totalRecordings: json.stats?.totalRecordings ?? 0,
            totalHours: json.stats?.totalHours ?? 0,
            bestScore: json.stats?.bestScore ?? 0,
            lowestFillers: json.stats?.lowestFillers ?? 0,
            currentStreak: json.stats?.currentStreak ?? 0,
            longestStreak: json.stats?.longestStreak ?? 0,
          },
        });
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const stats = data.stats;

  const toggleScore = (key: string) =>
    setVisibleScores((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleFiller = (key: string) =>
    setVisibleFillers((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Recordings", value: stats.totalRecordings, icon: Mic, color: "text-indigo-400" },
          { label: "Hours Recorded", value: stats.totalHours.toFixed(1), icon: Clock, color: "text-blue-400" },
          { label: "Best Score", value: stats.bestScore.toFixed(1), icon: Trophy, color: "text-emerald-400" },
          { label: "Lowest Fillers", value: stats.lowestFillers, icon: TrendingDown, color: "text-orange-400" },
          { label: "Current Streak", value: `${stats.currentStreak}d`, icon: Flame, color: "text-amber-400" },
          { label: "Longest Streak", value: `${stats.longestStreak}d`, icon: Award, color: "text-purple-400" },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="p-4 bg-[#111111] border-[#2a2a2a] text-center"
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-zinc-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: Filler Word Trend */}
        <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Filler Word Trend</h3>
            <div className="flex gap-1">
              {(["total", "um", "uh", "like"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleFiller(key)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    visibleFillers[key]
                      ? "border-transparent"
                      : "border-[#2a2a2a] opacity-40"
                  }`}
                  style={{
                    backgroundColor: visibleFillers[key]
                      ? chartColors[key] + "30"
                      : "transparent",
                    color: chartColors[key],
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.fillerTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={5} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Target", fill: "#EF4444", fontSize: 10 }} />
              {visibleFillers.total && <Line type="monotone" dataKey="total" stroke={chartColors.total} strokeWidth={2} dot={{ r: 3 }} name="Total" />}
              {visibleFillers.um && <Line type="monotone" dataKey="um" stroke={chartColors.um} strokeWidth={1.5} dot={false} name="Um" />}
              {visibleFillers.uh && <Line type="monotone" dataKey="uh" stroke={chartColors.uh} strokeWidth={1.5} dot={false} name="Uh" />}
              {visibleFillers.like && <Line type="monotone" dataKey="like" stroke={chartColors.like} strokeWidth={1.5} dot={false} name="Like" />}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Chart 2: Score History */}
        <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Score History</h3>
            <div className="flex gap-1">
              {(["overall", "volume", "tonality", "pause", "storytelling"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleScore(key)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    visibleScores[key]
                      ? "border-transparent"
                      : "border-[#2a2a2a] opacity-40"
                  }`}
                  style={{
                    backgroundColor: visibleScores[key]
                      ? chartColors[key] + "30"
                      : "transparent",
                    color: chartColors[key],
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.scoreHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              {visibleScores.overall && <Line type="monotone" dataKey="overall" stroke={chartColors.overall} strokeWidth={2} dot={{ r: 3 }} name="Overall" />}
              {visibleScores.volume && <Line type="monotone" dataKey="volume" stroke={chartColors.volume} strokeWidth={1.5} dot={false} name="Volume" />}
              {visibleScores.tonality && <Line type="monotone" dataKey="tonality" stroke={chartColors.tonality} strokeWidth={1.5} dot={false} name="Tonality" />}
              {visibleScores.pause && <Line type="monotone" dataKey="pause" stroke={chartColors.pause} strokeWidth={1.5} dot={false} name="Pause" />}
              {visibleScores.storytelling && <Line type="monotone" dataKey="storytelling" stroke={chartColors.storytelling} strokeWidth={1.5} dot={false} name="Storytelling" />}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Chart 3: Weekly Completion Heatmap */}
        <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
          <h3 className="font-semibold text-sm mb-4">Recording Activity</h3>
          <div className="flex flex-wrap gap-1">
            {data.heatmap.map((day, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                title={`${day.date}: ${day.level === 0 ? "No recording" : day.level === 1 ? "Recorded" : "Recorded & Reviewed"}`}
                style={{
                  backgroundColor:
                    day.level === 0
                      ? "#1a1a1a"
                      : day.level === 1
                        ? "#6366F140"
                        : "#6366F1",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[#1a1a1a]" />
              None
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[#6366F140]" />
              Recorded
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[#6366F1]" />
              Reviewed
            </div>
          </div>
        </Card>

        {/* Chart 4: Recording Duration */}
        <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
          <h3 className="font-semibold text-sm mb-4">Recording Duration</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.durationHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="duration" fill="#6366F1" radius={[4, 4, 0, 0]} name="Duration (s)" />
              <Bar dataKey="recommended" fill="#2a2a2a" radius={[4, 4, 0, 0]} name="Recommended" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Chart 5: Words Per Minute */}
        <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
          <h3 className="font-semibold text-sm mb-4">Words Per Minute</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.wpmHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis domain={[80, 220]} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={130} stroke="#22c55e40" />
              <ReferenceLine y={160} stroke="#22c55e40" />
              <Area type="monotone" dataKey="wpm" stroke="#6366F1" fill="#6366F140" strokeWidth={2} name="WPM" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-8 bg-emerald-500/40" />
            <span className="text-[10px] text-zinc-500">Ideal range: 130-160 WPM</span>
            <div className="h-px w-8 bg-emerald-500/40" />
          </div>
        </Card>

        {/* Chart 6: Phase Comparison Radar */}
        <Card className="p-6 bg-[#111111] border-[#2a2a2a]">
          <h3 className="font-semibold text-sm mb-4">Phase Comparison</h3>
          {data.phaseRadar.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-zinc-500">
              Complete sessions across phases to see comparison.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={[
                { subject: "Volume", ...Object.fromEntries(data.phaseRadar.map(p => [p.phase, p.volume])) },
                { subject: "Tonality", ...Object.fromEntries(data.phaseRadar.map(p => [p.phase, p.tonality])) },
                { subject: "Pause", ...Object.fromEntries(data.phaseRadar.map(p => [p.phase, p.pause])) },
                { subject: "Storytelling", ...Object.fromEntries(data.phaseRadar.map(p => [p.phase, p.storytelling])) },
              ]}>
                <PolarGrid stroke="#2a2a2a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "#6b7280", fontSize: 8 }} />
                {data.phaseRadar.map((p, i) => (
                  <Radar
                    key={p.phase}
                    name={p.phase}
                    dataKey={p.phase}
                    stroke={Object.values(chartColors)[i]}
                    fill={Object.values(chartColors)[i]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 10, color: "#9ca3af" }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
