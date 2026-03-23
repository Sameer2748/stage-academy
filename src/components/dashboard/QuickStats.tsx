import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, CheckCircle, TrendingDown, TrendingUp, Trophy } from "lucide-react";

interface QuickStatsProps {
  streak: number;
  completion: string;
  avgScore: string;
  fillers: number;
  fillerTrend: number;
}

export default function QuickStats({
  streak,
  completion,
  avgScore,
  fillers,
  fillerTrend,
}: QuickStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Trophy className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{streak} days</div>
          <p className="text-xs text-muted-foreground">Keep it up!</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completion} days</div>
          <p className="text-xs text-muted-foreground">Weekly completion rate</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
          <Activity className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgScore}/10</div>
          <p className="text-xs text-muted-foreground">Based on recent sessions</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Filler Words</CardTitle>
          {fillerTrend > 0 ? (
            <TrendingUp className="h-4 w-4 text-red-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-green-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fillers}</div>
          <p className="text-xs space-x-1">
            <span
              className={fillerTrend > 0 ? "text-red-500" : "text-green-500"}
            >
              {fillerTrend > 0 ? `+${fillerTrend}` : fillerTrend}
            </span>{" "}
            <span className="text-muted-foreground">from last session</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
