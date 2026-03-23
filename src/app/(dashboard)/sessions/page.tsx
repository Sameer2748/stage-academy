"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SlidersHorizontal,
  Download,
  Trash2,
  Calendar,
  Clock,
  Mic,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface SessionItem {
  id: string;
  title: string;
  date: string;
  weekNumber: number;
  dayNumber: number;
  phase: string;
  duration: number | null;
  status: string;
  aiAnalysis: {
    overallScore: number;
  } | null;
  transcript: {
    totalFillers: number;
    wordsPerMinute: number;
  } | null;
}

const phaseVariant: Record<string, "phase-volume" | "phase-tonality" | "phase-pause" | "phase-storytelling"> = {
  VOLUME: "phase-volume",
  TONALITY: "phase-tonality",
  PAUSE: "phase-pause",
  STORYTELLING: "phase-storytelling",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-500/20";
  if (score >= 6) return "bg-amber-500/20";
  return "bg-red-500/20";
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sort: sortBy,
      });
      if (search) params.set("search", search);
      if (phaseFilter !== "all") params.set("phase", phaseFilter);

      const res = await fetch(`/api/sessions?${params}`);
      const data = await res.json();
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, phaseFilter, sortBy]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const totalPages = Math.ceil(total / pageSize);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/sessions?export=csv");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sessions-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sessions</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {total} recording{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#2a2a2a] bg-[#111111] gap-2"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" asChild>
            <Link href="/record">
              <Mic className="w-4 h-4" /> New Recording
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-[#111111] border-[#2a2a2a]"
          />
        </div>
        <Select
          value={phaseFilter}
          onValueChange={(v) => {
            setPhaseFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-[#111111] border-[#2a2a2a]">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="VOLUME">Volume</SelectItem>
            <SelectItem value="TONALITY">Tonality</SelectItem>
            <SelectItem value="PAUSE">Pause</SelectItem>
            <SelectItem value="STORYTELLING">Storytelling</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-[#111111] border-[#2a2a2a]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="score-desc">Highest Score</SelectItem>
            <SelectItem value="score-asc">Lowest Score</SelectItem>
            <SelectItem value="fillers-asc">Fewest Fillers</SelectItem>
            <SelectItem value="fillers-desc">Most Fillers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 bg-[#111111] border-[#2a2a2a]">
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-3 w-1/2 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 bg-[#111111] border-[#2a2a2a] text-center">
          <Mic className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">No sessions found</h3>
          <p className="text-sm text-zinc-500 mb-4">
            {search || phaseFilter !== "all"
              ? "Try adjusting your filters"
              : "Start your first recording to begin tracking progress"}
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href="/record">Start Recording</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card className="p-5 bg-[#111111] border-[#2a2a2a] hover:border-indigo-500/50 transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white truncate group-hover:text-indigo-300 transition-colors">
                      {session.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(session.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span>W{session.weekNumber}D{session.dayNumber}</span>
                    </div>
                  </div>
                  {session.aiAnalysis && (
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold ${scoreBg(session.aiAnalysis.overallScore)} ${scoreColor(session.aiAnalysis.overallScore)}`}
                    >
                      {session.aiAnalysis.overallScore.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={phaseVariant[session.phase] || "secondary"}>
                    {session.phase}
                  </Badge>
                  {session.duration && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {formatDuration(session.duration)}
                    </span>
                  )}
                  {session.transcript && (
                    <span className="text-xs text-orange-400">
                      {session.transcript.totalFillers} fillers
                    </span>
                  )}
                  {session.status === "PROCESSING" && (
                    <Badge variant="warning">Processing</Badge>
                  )}
                  {session.status === "FAILED" && (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="border-[#2a2a2a] bg-[#111111]"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-[#2a2a2a] bg-[#111111]"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
