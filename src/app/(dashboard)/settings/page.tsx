"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bell,
  Bot,
  Mail,
  BookOpen,
  User,
  Save,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SettingsData {
  reminderTime: string;
  reminderDaysOfWeek: number[];
  timezone: string;
  emailSummaryEnabled: boolean;
  voiceEnabled: boolean;
  elevenLabsVoiceId: string | null;
  weekStartDay: number;
  currentPhase: string;
  currentWeek: number;
  currentDay: number;
  startDate: string;
  calendarConnected: boolean;
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    reminderTime: "09:00",
    reminderDaysOfWeek: [1, 2, 3, 4, 5],
    timezone: "UTC",
    emailSummaryEnabled: true,
    voiceEnabled: true,
    elevenLabsVoiceId: null,
    weekStartDay: 1,
    currentPhase: "VOLUME",
    currentWeek: 1,
    currentDay: 1,
    startDate: new Date().toISOString().split("T")[0],
    calendarConnected: false,
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/notifications?settings=true");
      const data = await res.json();
      if (data.settings) {
        setSettings((prev) => ({
          ...prev,
          ...data.settings,
          reminderDaysOfWeek:
            typeof data.settings.reminderDaysOfWeek === "string"
              ? JSON.parse(data.settings.reminderDaysOfWeek)
              : data.settings.reminderDaysOfWeek || [1, 2, 3, 4, 5],
        }));
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    setSettings((prev) => ({
      ...prev,
      reminderDaysOfWeek: prev.reminderDaysOfWeek.includes(day)
        ? prev.reminderDaysOfWeek.filter((d) => d !== day)
        : [...prev.reminderDaysOfWeek, day],
    }));
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/sessions?export=json");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stage-academy-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handle error
    }
  };

  const sendTestNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Stage Academy Tracker", {
        body: "Test notification - your reminders are working!",
        icon: "/favicon.ico",
      });
    } else if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification("Stage Academy Tracker", {
            body: "Test notification - your reminders are working!",
          });
        }
      });
    }
  };

  const sendTestEmail = async () => {
    try {
      await fetch("/api/email/weekly-summary", { method: "POST" });
    } catch {
      // handle error
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save All"}
        </Button>
      </div>

      <Tabs defaultValue="reminders">
        <TabsList className="bg-[#111111] border border-[#2a2a2a]">
          <TabsTrigger value="reminders" className="gap-2 text-xs">
            <Bell className="w-3 h-3" /> Reminders
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 text-xs">
            <Bot className="w-3 h-3" /> AI & Voice
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 text-xs">
            <Mail className="w-3 h-3" /> Email
          </TabsTrigger>
          <TabsTrigger value="course" className="gap-2 text-xs">
            <BookOpen className="w-3 h-3" /> Course
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2 text-xs">
            <User className="w-3 h-3" /> Account
          </TabsTrigger>
        </TabsList>

        {/* Reminders Tab */}
        <TabsContent value="reminders">
          <Card className="p-6 bg-[#111111] border-[#2a2a2a] space-y-6">
            <div>
              <Label className="text-xs text-zinc-400">Daily Reminder Time</Label>
              <Input
                type="time"
                value={settings.reminderTime}
                onChange={(e) =>
                  setSettings({ ...settings, reminderTime: e.target.value })
                }
                className="bg-[#0a0a0a] border-[#2a2a2a] w-40 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">
                Reminder Days
              </Label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleReminderDay(day.value)}
                    className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                      settings.reminderDaysOfWeek.includes(day.value)
                        ? "bg-indigo-600 text-white"
                        : "bg-[#0a0a0a] border border-[#2a2a2a] text-zinc-500"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) =>
                  setSettings({ ...settings, timezone: v })
                }
              >
                <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] w-64 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#2a2a2a]"
              onClick={sendTestNotification}
            >
              Send Test Notification
            </Button>
          </Card>
        </TabsContent>

        {/* AI & Voice Tab */}
        <TabsContent value="ai">
          <Card className="p-6 bg-[#111111] border-[#2a2a2a] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">AI Voice Responses</Label>
                <p className="text-xs text-zinc-500 mt-1">
                  AI Coach will speak responses using ElevenLabs
                </p>
              </div>
              <Switch
                checked={settings.voiceEnabled}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, voiceEnabled: v })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">
                ElevenLabs Voice ID
              </Label>
              <Input
                value={settings.elevenLabsVoiceId || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    elevenLabsVoiceId: e.target.value || null,
                  })
                }
                placeholder="Leave empty for default"
                className="bg-[#0a0a0a] border-[#2a2a2a] mt-1"
              />
            </div>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <Card className="p-6 bg-[#111111] border-[#2a2a2a] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Weekly Summary Email</Label>
                <p className="text-xs text-zinc-500 mt-1">
                  Receive a weekly progress email every Sunday at 8 PM
                </p>
              </div>
              <Switch
                checked={settings.emailSummaryEnabled}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, emailSummaryEnabled: v })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Email Address</Label>
              <Input
                value={session?.user?.email || ""}
                disabled
                className="bg-[#0a0a0a] border-[#2a2a2a] mt-1 opacity-50"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#2a2a2a]"
              onClick={sendTestEmail}
            >
              Send Test Email
            </Button>
          </Card>
        </TabsContent>

        {/* Course Tab */}
        <TabsContent value="course">
          <Card className="p-6 bg-[#111111] border-[#2a2a2a] space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-zinc-400">Current Phase</Label>
                <Select
                  value={settings.currentPhase}
                  onValueChange={(v) =>
                    setSettings({ ...settings, currentPhase: v })
                  }
                >
                  <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VOLUME">Volume</SelectItem>
                    <SelectItem value="TONALITY">Tonality</SelectItem>
                    <SelectItem value="PAUSE">Pause</SelectItem>
                    <SelectItem value="STORYTELLING">Storytelling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Current Week</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={settings.currentWeek}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      currentWeek: Number(e.target.value),
                    })
                  }
                  className="bg-[#0a0a0a] border-[#2a2a2a] mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Current Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={settings.currentDay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      currentDay: Number(e.target.value),
                    })
                  }
                  className="bg-[#0a0a0a] border-[#2a2a2a] mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Course Start Date</Label>
              <Input
                type="date"
                value={settings.startDate}
                onChange={(e) =>
                  setSettings({ ...settings, startDate: e.target.value })
                }
                className="bg-[#0a0a0a] border-[#2a2a2a] w-48 mt-1"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setResetDialogOpen(true)}
            >
              <AlertTriangle className="w-4 h-4" /> Reset Progress
            </Button>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card className="p-6 bg-[#111111] border-[#2a2a2a] space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="text-lg">
                  {session?.user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{session?.user?.name || "User"}</p>
                <p className="text-sm text-zinc-500">
                  {session?.user?.email || ""}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm">Google Account</span>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm">Google Calendar</span>
                </div>
                <Badge variant={settings.calendarConnected ? "success" : "secondary"}>
                  {settings.calendarConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#2a2a2a] gap-2"
                onClick={handleExport}
              >
                <Download className="w-4 h-4" /> Export All Data
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset Progress Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-[#111111] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Reset Progress
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              This will reset your course progress to Week 1, Day 1. Your
              recordings and sessions will NOT be deleted.
            </p>
            <p className="text-sm">
              Type <strong className="text-white">RESET</strong> to confirm.
            </p>
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="Type RESET"
              className="bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setResetConfirm("");
              }}
              className="border-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resetConfirm !== "RESET"}
              onClick={async () => {
                try {
                  await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...settings,
                      resetProgress: true,
                    }),
                  });
                  window.location.reload();
                } catch {
                  // handle error
                }
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
