"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { Activity, BarChart2 } from "lucide-react";

interface DashboardChartsProps {
  data: any[]; // Recent sessions array
  type: "filler" | "radar";
}

export default function DashboardCharts({ data, type }: DashboardChartsProps) {
  if (type === "filler") {
    // Process data for filler line chart
    const chartData = [...data]
      .reverse()
      .map((session) => ({
         date: format(new Date(session.date), "MMM dd"),
         fullDate: format(new Date(session.date), "MMM dd, yyyy"),
         count: session.transcript?.totalFillers || 0,
         target: 5, // Hardcoded target
      }));

    return (
      <Card className="bg-white border-slate-200 h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Filler Word Trend (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px" }}
                  labelStyle={{ color: "#9ca3af" }}
                  itemStyle={{ color: "#f9fafb" }}
                />
                <ReferenceLine y={5} label={{ position: "insideTopLeft", value: "Target (5)", fill: "#ef4444", fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Filler Words"
                  stroke="#6366f1"
                  strokeWidth={3}
                  activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#ffffff", strokeWidth: 3 }}
                  dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm">
              Not enough data to show trends.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Radar chart processing
  const latestSessionWithScore = data.find((s) => s.aiAnalysis?.overallScore);
  const previousSessionWithScore = data.find((s) => s.id !== latestSessionWithScore?.id && s.aiAnalysis?.overallScore);

  const radarData = [
    {
      subject: "Volume",
      A: latestSessionWithScore?.aiAnalysis?.volumeScore || 0,
      B: previousSessionWithScore?.aiAnalysis?.volumeScore || 0,
      fullMark: 10,
    },
    {
      subject: "Tonality",
      A: latestSessionWithScore?.aiAnalysis?.tonalityScore || 0,
      B: previousSessionWithScore?.aiAnalysis?.tonalityScore || 0,
      fullMark: 10,
    },
    {
      subject: "Pause",
      A: latestSessionWithScore?.aiAnalysis?.pauseScore || 0,
      B: previousSessionWithScore?.aiAnalysis?.pauseScore || 0,
      fullMark: 10,
    },
    {
      subject: "Story",
      A: latestSessionWithScore?.aiAnalysis?.storytellingScore || 0,
      B: previousSessionWithScore?.aiAnalysis?.storytellingScore || 0,
      fullMark: 10,
    },
    {
      subject: "Confidence",
      A: latestSessionWithScore?.aiAnalysis?.confidenceScore || 0,
      B: previousSessionWithScore?.aiAnalysis?.confidenceScore || 0,
      fullMark: 10,
    },
  ];

  return (
    <Card className="bg-white border-slate-200 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-purple-600" />
          Score Radar (Latest vs Previous)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        {latestSessionWithScore ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#6b7280" tick={{ fontSize: 10 }} />
              {previousSessionWithScore && (
                <Radar
                  name="Previous"
                  dataKey="B"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.2}
                />
              )}
              <Radar
                name="Latest"
                dataKey="A"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.5}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500 text-sm">
            Not enough data to show radar.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
