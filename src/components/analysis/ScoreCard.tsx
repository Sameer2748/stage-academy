"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BrainCircuit, Mic, Activity, Eye, Zap } from "lucide-react";
import { AIAnalysis } from "@prisma/client";

interface ScoreCardProps {
  analysis: AIAnalysis;
  previous?: AIAnalysis | null;
}

export default function ScoreCard({ analysis, previous }: ScoreCardProps) {
  const scores = [
    { label: "Overall", value: analysis.overallScore, icon: BrainCircuit, color: "bg-indigo-500" },
    { label: "Tonality", value: analysis.tonalityScore, icon: Mic, color: "bg-green-500" },
    { label: "Pause", value: analysis.pauseScore, icon: Activity, color: "bg-blue-500" },
    { label: "Storytelling", value: analysis.storytellingScore, icon: Eye, color: "bg-orange-500" },
    { label: "Volume", value: analysis.volumeScore, icon: Zap, color: "bg-purple-500" },
  ];

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl">Performance Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {scores.map((score, i) => {
          const Icon = score.icon;
          const prevScore = previous ? (previous as any)[Object.keys(analysis).find(k => (analysis as any)[k] === score.value && k.includes('Score')) || ''] : null;
          const diff = prevScore ? (score.value - prevScore).toFixed(1) : null;
          const isPositive = diff && Number(diff) > 0;
          
          return (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-center text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-500" />
                  {score.label}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{score.value.toFixed(1)}/10</span>
                  {diff && (
                    <span className={`text-xs ${isPositive ? 'text-green-600' : Number(diff) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                      {isPositive ? '+' : ''}{diff}
                    </span>
                  )}
                </div>
              </div>
              <Progress value={score.value * 10} className="h-2 bg-slate-100" indicatorClassName={score.color} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
