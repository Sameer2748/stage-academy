"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { AIAnalysis, Transcript } from "@prisma/client";

interface FeedbackPanelProps {
  analysis: AIAnalysis;
  transcript: Transcript | null;
}

export default function FeedbackPanel({ analysis, transcript }: FeedbackPanelProps) {
  const strengths = (analysis.strengthsList as string[]) || [];
  const weaknesses = (analysis.improvementsList as string[]) || [];
  const suggestions = analysis.nextSessionTip ? [analysis.nextSessionTip] : [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="bg-[#111111] border-[#2a2a2a] md:col-span-2">
        <CardHeader>
          <CardTitle className="text-xl">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {analysis.detailedFeedback}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#111111] border-[#2a2a2a]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {strengths.map((str, i) => (
              <li key={i} className="flex gap-3 text-sm text-green-100/70 items-start">
                <span className="text-green-400 mt-1">•</span>
                <span className="flex-1">{str}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-[#111111] border-[#2a2a2a]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Areas to Improve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {weaknesses.map((weak, i) => (
              <li key={i} className="flex gap-3 text-sm text-orange-100/70 items-start">
                <span className="text-orange-400 mt-1">•</span>
                <span className="flex-1">{weak}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      
      <Card className="bg-[#111111] border-[#2a2a2a] md:col-span-2">
         <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
               <Lightbulb className="w-5 h-5 text-yellow-400" />
               Actionable Suggestions
            </CardTitle>
         </CardHeader>
         <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
               {suggestions.map((sug, i) => (
                  <div key={i} className="bg-[#2a2a2a]/30 p-4 rounded-lg text-sm text-muted-foreground border border-[#2a2a2a]/50">
                     {sug}
                  </div>
               ))}
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
