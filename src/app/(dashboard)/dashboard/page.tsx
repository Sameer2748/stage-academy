"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { COURSE_MODULES } from "@/lib/course-data";
import {
  Mic,
  TrendingUp,
  Calendar,
  Target,
  BookOpen,
  Play,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  BarChart3,
  Flame,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [weekPlan, setWeekPlan] = useState<any>(null);
  const [currentWeek, setCurrentWeek] = useState(1);

  const [totalRecordings, setTotalRecordings] = useState(0);
  const [totalReviewed, setTotalReviewed] = useState(0);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then((data) => {
        if (data.watchedVideoIds) setWatchedVideos(new Set(data.watchedVideoIds));
        if (data.currentWeek) setCurrentWeek(data.currentWeek);
        if (data.weeklyPlan) setWeekPlan(data.weeklyPlan);
        setTotalRecordings(data.totalRecordings || 0);
        setTotalReviewed(data.totalReviewed || 0);
      })
      .catch(() => {});
  }, []);

  const totalVideos = COURSE_MODULES.reduce((sum, m) => sum + m.videoCount, 0);
  const totalWatched = watchedVideos.size;
  const videoProgress = totalVideos > 0 ? Math.round((totalWatched / totalVideos) * 100) : 0;

  // Count today's tasks
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const dayNum = today === 0 ? 7 : today; // Convert to 1-7 Mon-Sun
  const todayPlan = weekPlan?.days?.find((d: any) => d.day === dayNum);
  const todayTasks = todayPlan?.tasks || [];
  const completedTasks = todayTasks.filter((t: any) => t.completed).length;

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-slate-400 mt-1">Week {currentWeek} — Here&apos;s your training overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Videos Watched", value: `${totalWatched}/${totalVideos}`, sub: `${videoProgress}% complete`, icon: Play, color: "indigo" },
          { label: "Today's Tasks", value: `${completedTasks}/${todayTasks.length}`, sub: todayTasks.length === 0 ? "No tasks planned" : `${todayTasks.length - completedTasks} remaining`, icon: Target, color: "emerald" },
          { label: "Recordings", value: totalRecordings.toString(), sub: `${totalReviewed} reviewed`, icon: Mic, color: "red" },
          { label: "Current Week", value: `W${currentWeek}`, sub: "of 12 weeks", icon: Calendar, color: "purple" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg bg-${stat.color}-50 border border-${stat.color}-200 flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-slate-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Plan */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" /> Today&apos;s Plan — {DAY_NAMES[dayNum - 1]}
              </h3>
              <Link
                href={`/weekly-plan/day/${dayNum}?week=${currentWeek}`}
                className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
              >
                Open Day <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No tasks planned for today</p>
                <Link href="/weekly-plan" className="text-xs text-indigo-600 hover:text-indigo-500 mt-2 inline-block">
                  Set up your weekly plan →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200">
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                      {task.title}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{task.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Week Overview */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" /> Week {currentWeek} Overview
              </h3>
              <Link href="/weekly-plan" className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                View Plan <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAY_NAMES.map((name, i) => {
                const dayPlan = weekPlan?.days?.find((d: any) => d.day === i + 1);
                const tasks = dayPlan?.tasks || [];
                const done = tasks.filter((t: any) => t.completed).length;
                const isToday = i + 1 === dayNum;
                return (
                  <Link
                    key={name}
                    href={`/weekly-plan/day/${i + 1}?week=${currentWeek}`}
                    className={`text-center p-3 rounded-lg border transition-all hover:border-slate-300 ${
                      isToday ? "border-indigo-300 bg-indigo-50" : "border-slate-200"
                    }`}
                  >
                    <p className={`text-[10px] font-medium mb-1 ${isToday ? "text-indigo-600" : "text-slate-400"}`}>{name}</p>
                    <p className="text-lg font-bold text-slate-900">{tasks.length > 0 ? `${done}/${tasks.length}` : "—"}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{tasks.length > 0 ? "tasks" : "empty"}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: "/weekly-plan", label: "Weekly Plan", desc: "Plan your practice", icon: Calendar, color: "purple" },
                { href: `/weekly-plan/day/${dayNum}?week=${currentWeek}`, label: "Record Session", desc: "Start recording", icon: Mic, color: "red" },
                { href: "/library", label: "Course Library", desc: "Watch videos", icon: BookOpen, color: "blue" },
                { href: "/progress", label: "Progress", desc: "Track your growth", icon: TrendingUp, color: "emerald" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg bg-${action.color}-50 border border-${action.color}-200 flex items-center justify-center`}>
                    <action.icon className={`w-4 h-4 text-${action.color}-600`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{action.label}</p>
                    <p className="text-[10px] text-slate-400">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                </Link>
              ))}
            </div>
          </div>

          {/* Video Progress */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-600" /> Course Progress
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Videos watched</span>
                  <span className="text-slate-900">{videoProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{totalWatched} watched</span>
                <span>{totalVideos - totalWatched} remaining</span>
              </div>
            </div>
          </div>

          {/* AI Tip */}
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> AI Tip
            </h3>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Consistency is key to improving your communication skills. Try to practice daily, even if it&apos;s just 5 minutes. Focus on one area at a time — volume, tonality, pause, or storytelling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
