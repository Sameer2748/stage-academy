"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface TodayCardProps {
  plan: any; // Today's DayPlan
  phase: string;
  week: number;
  hasRecorded: boolean;
  latestSessionId?: string;
  latestScore?: number | null;
}

export default function TodayCard({
  plan,
  phase,
  week,
  hasRecorded,
  latestSessionId,
  latestScore,
}: TodayCardProps) {
  if (!plan) {
    return (
      <Card className="col-span-4 bg-muted/40 h-full border-dashed">
        <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">No Plan for Today</h3>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have a specific task scheduled for today. Take a break!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 relative overflow-hidden h-full border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-background to-background">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Today&apos;s Task
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30">
                Phase: {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </Badge>
              <span>•</span>
              <span>
                Week {week}, Day {plan.dayNumber || plan.day}
              </span>
            </div>
          </div>
          {hasRecorded && latestScore !== undefined && latestScore !== null && (
            <Badge variant="outline" className="text-lg py-1 px-3 border-green-500/30 text-green-400 bg-green-500/10">
              Score: {latestScore.toFixed(1)}/10
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{plan.title}</h3>
          <p className="text-muted-foreground">{plan.recordingPrompt || plan.description}</p>
        </div>

        {plan.focusSkill && (
          <div className="space-y-1">
            <span className="text-sm font-medium">Focus Skill: </span>
            <span className="text-sm text-indigo-400">{plan.focusSkill}</span>
          </div>
        )}

        <div className="pt-4 flex gap-4">
          {!hasRecorded ? (
            <Button size="lg" className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" asChild>
              <Link href={`/record?day=${plan.dayNumber || plan.day}`}>
                <Mic className="h-4 w-4" /> Start Recording
              </Link>
            </Button>
          ) : (
            <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-green-500/30 hover:bg-green-500/10 hover:text-green-400" asChild>
              <Link href={`/sessions/${latestSessionId}`}>
                <CheckCircle2 className="h-4 w-4" /> Review Session
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
