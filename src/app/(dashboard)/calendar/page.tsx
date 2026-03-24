"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Link2,
  Unlink,
  Plus,
  RefreshCw,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  scheduledAt: string;
  type: string;
  weekNumber: number | null;
  dayNumber: number | null;
  isRecorded: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export default function CalendarPage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const res = await fetch("/api/calendar/events");
      const data = await res.json();
      setConnected(data.connected ?? false);
      setEvents(data.events || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = () => {
    window.location.href = "/api/calendar/connect";
  };

  const createReminders = async () => {
    setCreating(true);
    try {
      await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderTime,
          daysOfWeek: selectedDays,
          weeks: 12,
        }),
      });
      await fetchCalendarData();
    } catch {
      // handle error
    } finally {
      setCreating(false);
    }
  };

  const syncPlan = async () => {
    setSyncing(true);
    try {
      await fetch("/api/calendar/sync", { method: "POST" });
      await fetchCalendarData();
    } catch {
      // handle error
    } finally {
      setSyncing(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-sm text-slate-400 mt-1">
            Sync your practice schedule with Google Calendar
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                connected
                  ? "bg-emerald-500/20 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Google Calendar</h3>
              <p className="text-xs text-slate-400">
                {connected
                  ? "Connected — events will sync automatically"
                  : "Connect to create recording reminders"}
              </p>
            </div>
          </div>
          {connected ? (
            <Badge variant="success" className="gap-1">
              <Link2 className="w-3 h-3" /> Connected
            </Badge>
          ) : (
            <Button
              onClick={connectCalendar}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Link2 className="w-4 h-4" /> Connect
            </Button>
          )}
        </div>
      </Card>

      {connected && (
        <>
          {/* Create Recording Reminders */}
          <Card className="p-6 bg-white border-slate-200">
            <h3 className="font-semibold text-sm mb-4">
              Create Recording Reminders
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-2 block">
                  Reminder Time
                </label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="bg-white border-slate-200 w-40"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">
                  Days of Week
                </label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                        selectedDays.includes(day.value)
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-slate-200 text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createReminders}
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {creating ? "Creating..." : "Create Reminders"}
                </Button>
                <Button
                  variant="outline"
                  onClick={syncPlan}
                  disabled={syncing}
                  className="border-slate-200 gap-2"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                  />
                  Sync Weekly Plan
                </Button>
              </div>
            </div>
          </Card>

          {/* Upcoming Events */}
          <Card className="p-6 bg-white border-slate-200">
            <h3 className="font-semibold text-sm mb-4">Upcoming Events</h3>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No upcoming events. Create recording reminders to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => {
                  const eventDate = new Date(event.scheduledAt);
                  const isPast = eventDate < new Date();
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isPast ? "opacity-50" : "hover:bg-slate-100"
                      }`}
                    >
                      {event.isRecorded ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {eventDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {eventDate.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          {event.weekNumber && (
                            <span>
                              W{event.weekNumber}D{event.dayNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      {!event.isRecorded && !isPast && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-200 text-xs shrink-0"
                          asChild
                        >
                          <a href="/record">Record</a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
