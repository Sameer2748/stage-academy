"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { AIAnalysis } from "@prisma/client";

interface ComparisonViewProps {
  current: AIAnalysis;
  previous?: AIAnalysis | null;
}

export default function ComparisonView({ current, previous }: ComparisonViewProps) {
  const data = [
    { subject: "Overall", A: current.overallScore, B: previous?.overallScore || 0 },
    { subject: "Tonality", A: current.tonalityScore, B: previous?.tonalityScore || 0 },
    { subject: "Pause", A: current.pauseScore, B: previous?.pauseScore || 0 },
    { subject: "Storytelling", A: current.storytellingScore, B: previous?.storytellingScore || 0 },
    { subject: "Volume", A: current.volumeScore, B: previous?.volumeScore || 0 },
  ];

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl">Progress Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#888888", fontSize: 13 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                name="Current Session"
                dataKey="A"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.5}
              />
              {previous && (
                <Radar
                  name="Previous Session"
                  dataKey="B"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              )}
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}
                itemStyle={{ color: "#0f172a" }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
