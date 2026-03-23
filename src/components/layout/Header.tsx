"use client";

import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "./NotificationBell";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/record": "Record",
  "/sessions": "Sessions",
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
  const title = getPageTitle(pathname);
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#2a2a2a] bg-[#0a0a0a]/80 backdrop-blur-sm px-6">
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        <p className="text-xs text-zinc-500">{today}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/record")}
          className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          title="Quick Record"
        >
          <Mic className="h-5 w-5" />
        </Button>

        <NotificationBell />
      </div>
    </header>
  );
}
