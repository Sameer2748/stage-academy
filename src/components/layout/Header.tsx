"use client";

import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Mic, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "./NotificationBell";
import { useTheme } from "@/lib/theme-context";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/record": "Record",
  "/sessions": "Sessions",
  "/daily-planner": "Daily Planner",
  "/ai-planner": "AI Planner",
  "/weekly-plan": "Weekly Plan",
  "/library": "Library",
  "/progress": "Progress",
  "/analytics": "Analytics",
  "/chatbot": "AI Coach",
  "/calendar": "Calendar",
  "/settings": "Settings",
  "/admin": "Admin",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];

  // Check prefix matches for nested routes
  for (const [route, title] of Object.entries(routeTitles)) {
    if (pathname.startsWith(route + "/")) return title;
  }

  return "Stage Academy";
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const title = getPageTitle(pathname);
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-400">{today}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/record")}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
          title="Quick Record"
        >
          <Mic className="h-5 w-5" />
        </Button>

        <NotificationBell />
      </div>
    </header>
  );
}
