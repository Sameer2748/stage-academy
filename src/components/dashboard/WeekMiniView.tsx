"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2 } from "lucide-react";

interface WeekMiniViewProps {
  days: any[];
  sessions: any[];
}

export default function WeekMiniView({ days, sessions }: WeekMiniViewProps) {
  // Map days to status
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <Card className="col-span-4 rounded-xl border border-[#2a2a2a] bg-[#111111] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[#2a2a2a]/50">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-400" /> This Week's Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-7 gap-2">
          {sortedDays.map((day) => {
            const hasRecorded = sessions.some((s) => s.dayNumber === day.dayNumber);
            
            return (
              <div
                key={day.dayNumber}
                className={`relative flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                  hasRecorded
                    ? "border-green-500/30 bg-green-500/10 hover:border-green-500/50"
                    : "border-[#2a2a2a] bg-black/20 hover:border-indigo-500/30"
                }`}
              >
                <span className="text-xs font-medium text-muted-foreground mb-1">
                  Day {day.dayNumber}
                </span>
                {hasRecorded ? (
                 <CheckCircle2 className="h-6 w-6 text-green-500 my-1" />
                ) : (
                 <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 my-1" />
                )}
                {hasRecorded && day.targetFillerCount && (
                  <span className="text-[10px] mt-1 break-words">Fillers: &lt;{day.targetFillerCount}</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
