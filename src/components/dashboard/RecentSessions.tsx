"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Mic2 } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionWithRelations } from "@/types";

interface RecentSessionsProps {
  sessions: any[]; // Using any to avoid complex nested Prisma types for now
}

export default function RecentSessions({ sessions }: RecentSessionsProps) {
  function getScoreColor(score?: number) {
    if (!score) return "bg-gray-500/10 text-gray-400";
    if (score >= 8) return "bg-green-500/10 text-green-400 border-green-500/20";
    if (score >= 6) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <Card className="col-span-3 bg-[#111111] border-[#2a2a2a] flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Mic2 className="h-5 w-5 text-indigo-400" /> Recent Sessions
        </CardTitle>
        <CardDescription>Your last 5 recordings</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">No sessions recorded yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 p-4 pt-0">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 group"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm leading-none group-hover:text-indigo-400 transition-colors">
                      {session.title || `Week ${session.weekNumber} Day ${session.dayNumber}`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(session.duration)}
                      </span>
                      <span>•</span>
                      <span>{new Date(session.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Fillers: {session.transcript?.totalFillers ?? 0}</span>
                    </div>
                  </div>
                  {session.aiAnalysis?.overallScore ? (
                    <Badge variant="outline" className={`ml-auto font-bold ${getScoreColor(session.aiAnalysis.overallScore)}`}>
                      {session.aiAnalysis.overallScore.toFixed(1)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-auto text-xs px-2 py-0">
                      Processing
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
