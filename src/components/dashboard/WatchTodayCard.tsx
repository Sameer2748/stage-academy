"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, BookOpen, Clock } from "lucide-react";
import Link from "next/link";

interface WatchTodayCardProps {
  video: {
    title: string;
    moduleName: string;
    phase: string;
    duration: number | null;
  } | null;
  isWatched: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const phaseVariant: Record<string, "phase-volume" | "phase-tonality" | "phase-pause" | "phase-storytelling" | "secondary"> = {
  VOLUME: "phase-volume",
  TONALITY: "phase-tonality",
  PAUSE: "phase-pause",
  STORYTELLING: "phase-storytelling",
  INTRO: "secondary",
  BONUS: "secondary",
  QA: "secondary",
  COACHING: "secondary",
  BEYOND: "secondary",
};

export default function WatchTodayCard({ video, isWatched }: WatchTodayCardProps) {
  if (!video) {
    return null;
  }

  return (
    <Card className="p-5 bg-white border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold">Watch Today</h3>
        {isWatched && (
          <Badge variant="success" className="ml-auto gap-1 text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> Watched
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shrink-0">
          <Play className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">
            {video.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={phaseVariant[video.phase] || "secondary"}
              className="text-[9px]"
            >
              {video.moduleName}
            </Badge>
            {video.duration && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(video.duration)}
              </span>
            )}
          </div>
        </div>
        {!isWatched && (
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 gap-1 shrink-0"
            asChild
          >
            <Link href="/library">
              <Play className="w-3 h-3" /> Watch
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
