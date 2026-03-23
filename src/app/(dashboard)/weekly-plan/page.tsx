"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  Mic,
  Eye,
  BookOpen,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Save,
  ChevronRight,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type TaskType = "record" | "review" | "watch" | "exercise" | "note";

interface DayTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  focusArea: string;
  completed: boolean;
  sessionId?: string;
}

interface DayPlan {
  day: number;
  title: string;
  tasks: DayTask[];
}

interface WeekPlan {
  id: string;
  weekNumber: number;
  phase: string;
  days: DayPlan[];
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TASK_ICONS: Record<TaskType, React.ReactNode> = {
  record: <Mic className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
  watch: <BookOpen className="w-4 h-4" />,
  exercise: <Target className="w-4 h-4" />,
  note: <Pencil className="w-4 h-4" />,
};

const TASK_COLORS: Record<TaskType, string> = {
  record: "text-red-400 bg-red-500/10 border-red-500/20",
  review: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  watch: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  exercise: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  note: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

const FOCUS_AREAS = ["volume", "tonality", "pause", "storytelling", "general"];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function getStorageKey(weekNumber: number) {
  return `week-plan-${weekNumber}`;
}

function loadPlan(weekNumber: number): WeekPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(getStorageKey(weekNumber));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function savePlanToStorage(plan: WeekPlan) {
  localStorage.setItem(getStorageKey(plan.weekNumber), JSON.stringify(plan));
}

function createEmptyWeek(weekNumber: number): WeekPlan {
  return {
    id: generateId(),
    weekNumber,
    phase: weekNumber <= 3 ? "VOLUME" : weekNumber <= 6 ? "TONALITY" : weekNumber <= 9 ? "PAUSE" : "STORYTELLING",
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      title: "",
      tasks: [],
    })),
  };
}

export default function WeeklyPlanPage() {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [addingTaskDay, setAddingTaskDay] = useState<number | null>(null);
  const [newTask, setNewTask] = useState<Partial<DayTask>>({ type: "record", title: "", description: "", focusArea: "general" });
  const [editingDayTitle, setEditingDayTitle] = useState("");

  useEffect(() => {
    const saved = loadPlan(currentWeek);
    setPlan(saved || createEmptyWeek(currentWeek));
  }, [currentWeek]);

  const saveCurrentPlan = (updatedPlan: WeekPlan) => {
    setPlan(updatedPlan);
    savePlanToStorage(updatedPlan);
  };

  const updateDayTitle = (dayNum: number, title: string) => {
    if (!plan) return;
    const updated = {
      ...plan,
      days: plan.days.map((d) => (d.day === dayNum ? { ...d, title } : d)),
    };
    saveCurrentPlan(updated);
    setEditingDay(null);
  };

  const addTask = (dayNum: number) => {
    if (!plan || !newTask.title) return;
    const task: DayTask = {
      id: generateId(),
      type: newTask.type as TaskType,
      title: newTask.title,
      description: newTask.description || "",
      focusArea: newTask.focusArea || "general",
      completed: false,
    };
    const updated = {
      ...plan,
      days: plan.days.map((d) =>
        d.day === dayNum ? { ...d, tasks: [...d.tasks, task] } : d
      ),
    };
    saveCurrentPlan(updated);
    setAddingTaskDay(null);
    setNewTask({ type: "record", title: "", description: "", focusArea: "general" });
  };

  const removeTask = (dayNum: number, taskId: string) => {
    if (!plan) return;
    const updated = {
      ...plan,
      days: plan.days.map((d) =>
        d.day === dayNum ? { ...d, tasks: d.tasks.filter((t) => t.id !== taskId) } : d
      ),
    };
    saveCurrentPlan(updated);
  };

  const toggleTask = (dayNum: number, taskId: string) => {
    if (!plan) return;
    const updated = {
      ...plan,
      days: plan.days.map((d) =>
        d.day === dayNum
          ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)) }
          : d
      ),
    };
    saveCurrentPlan(updated);
  };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      VOLUME: "bg-blue-600/20 text-blue-400 border-blue-500/30",
      TONALITY: "bg-purple-600/20 text-purple-400 border-purple-500/30",
      PAUSE: "bg-amber-600/20 text-amber-400 border-amber-500/30",
      STORYTELLING: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    };
    return colors[phase] || "bg-zinc-600/20 text-zinc-400 border-zinc-500/30";
  };

  const jsDay = new Date().getDay();
  const todayDayNum = jsDay === 0 ? 7 : jsDay;

  if (!plan) return null;

  const totalTasks = plan.days.reduce((s, d) => s + d.tasks.length, 0);
  const completedTasks = plan.days.reduce((s, d) => s + d.tasks.filter((t) => t.completed).length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Weekly Plan</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Plan your practice sessions for each day
          </p>
        </div>
        {/* Week Selector */}
        <div className="flex items-center gap-1 bg-[#111] border border-[#2a2a2a] rounded-lg p-1 overflow-x-auto">
          {[...Array(12)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentWeek(i + 1)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                currentWeek === i + 1
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-500 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              W{i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Week Info Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#111] border border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <div>
            <span className="text-sm font-medium text-white">Week {currentWeek}</span>
            <span className={`ml-3 text-[10px] px-2 py-0.5 rounded-full font-medium border ${getPhaseColor(plan.phase)}`}>
              {plan.phase}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{completedTasks}/{totalTasks} tasks done</span>
          {totalTasks > 0 && (
            <div className="w-24 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Day Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plan.days.map((day) => {
          const isToday = day.day === todayDayNum;
          const dayCompleted = day.tasks.length > 0 && day.tasks.every((t) => t.completed);

          return (
            <div
              key={day.day}
              className={`rounded-xl border p-4 transition-all ${
                isToday
                  ? "bg-indigo-500/5 border-indigo-500/30 ring-1 ring-indigo-500/20"
                  : dayCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-[#111] border-[#2a2a2a]"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isToday ? "text-indigo-400" : "text-white"}`}>
                    {DAY_NAMES[day.day - 1]}
                  </span>
                  {isToday && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">
                      TODAY
                    </span>
                  )}
                  {dayCompleted && day.tasks.length > 0 && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Day Title */}
              {editingDay === day.day ? (
                <div className="flex gap-2 mb-3">
                  <input
                    value={editingDayTitle}
                    onChange={(e) => setEditingDayTitle(e.target.value)}
                    placeholder="Day title..."
                    className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateDayTitle(day.day, editingDayTitle);
                      if (e.key === "Escape") setEditingDay(null);
                    }}
                  />
                  <button onClick={() => updateDayTitle(day.day, editingDayTitle)} className="text-emerald-400 hover:text-emerald-300">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingDay(day.day); setEditingDayTitle(day.title); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 mb-3 flex items-center gap-1 transition-colors"
                >
                  {day.title || "Click to add title..."}
                  <Pencil className="w-3 h-3" />
                </button>
              )}

              {/* Tasks List */}
              <div className="space-y-2 mb-3">
                {day.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border ${TASK_COLORS[task.type]} ${
                      task.completed ? "opacity-50" : ""
                    }`}
                  >
                    <button onClick={() => toggleTask(day.day, task.id)} className="mt-0.5 shrink-0">
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {TASK_ICONS[task.type]}
                        <span className={`text-xs font-medium ${task.completed ? "line-through" : ""}`}>
                          {task.title}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                      {task.focusArea !== "general" && (
                        <span className="text-[9px] text-zinc-600 uppercase">{task.focusArea}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {task.type === "record" && !task.completed && (
                        <button
                          onClick={() => router.push(`/weekly-plan/day/${day.day}?week=${currentWeek}&task=${task.id}`)}
                          className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                          title="Go to record"
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeTask(day.day, task.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Task */}
              {addingTaskDay === day.day ? (
                <div className="space-y-2 p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
                  <div className="flex gap-2">
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}
                      className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="record">Record</option>
                      <option value="review">Review</option>
                      <option value="watch">Watch Video</option>
                      <option value="exercise">Exercise</option>
                      <option value="note">Note</option>
                    </select>
                    <select
                      value={newTask.focusArea}
                      onChange={(e) => setNewTask({ ...newTask, focusArea: e.target.value })}
                      className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {FOCUS_AREAS.map((fa) => (
                        <option key={fa} value={fa}>{fa}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title..."
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTask(day.day);
                      if (e.key === "Escape") setAddingTaskDay(null);
                    }}
                  />
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Description (e.g., 'Check tonality variations in this recording')..."
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => addTask(day.day)} className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAddingTaskDay(null)} className="border-[#2a2a2a] text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTaskDay(day.day)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[#2a2a2a] text-xs text-zinc-600 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Task
                </button>
              )}

              {/* Quick Action: Go to Day Detail */}
              {day.tasks.length > 0 && (
                <button
                  onClick={() => router.push(`/weekly-plan/day/${day.day}?week=${currentWeek}`)}
                  className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  View Day Detail <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
