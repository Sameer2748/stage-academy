"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface AiInsightCardProps {
  insight: string;
}

export default function AiInsightCard({ insight }: AiInsightCardProps) {
  return (
    <Card className="col-span-3 relative overflow-hidden bg-[#111111] border-[#2a2a2a]">
      {/* Animated gradient border effect via pseudo-element container */}
      <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
      
      <CardContent className="pt-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="bg-purple-500/20 p-2 rounded-lg shrink-0 border border-purple-500/30">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-purple-100 flex items-center gap-2">
              AI Insight of the Day
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
