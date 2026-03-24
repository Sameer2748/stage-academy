import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import ScoreCard from "@/components/analysis/ScoreCard";
import FeedbackPanel from "@/components/analysis/FeedbackPanel";
import ComparisonView from "@/components/analysis/ComparisonView";
import TranscriptViewer from "@/components/transcript/TranscriptViewer";
import TranscriptChat from "@/components/transcript/TranscriptChat";
import { Download, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const session = await prisma.session.findUnique({
    where: { id: params.id, userId: user.id },
    include: {
      transcript: true,
      aiAnalysis: true,
      dailyLog: true,
    },
  });

  if (!session) redirect("/sessions");

  // Get previous session for comparison
  const previousSession = await prisma.session.findFirst({
    where: {
      userId: user.id,
      createdAt: { lt: session.createdAt },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    include: { aiAnalysis: true },
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
           <div className="flex items-center gap-3 text-sm text-slate-500 mb-1">
             <Link href="/sessions" className="hover:text-indigo-600 transition-colors">← Back to Sessions</Link>
             <span>•</span>
             <span>Week {session.weekNumber} Day {session.dayNumber}</span>
             <Badge variant="secondary" className="bg-slate-200 text-xs">
               {session.phase}
             </Badge>
           </div>
           <h2 className="text-3xl font-bold tracking-tight">{session.title}</h2>
           <p className="text-sm text-slate-500">{format(new Date(session.date), "MMMM do, yyyy 'at' h:mm a")}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
           {session.aiAnalysis?.overallScore && (
             <Badge className="text-lg py-1 px-4 bg-indigo-500 hover:bg-indigo-600 font-bold mr-2">
               {session.aiAnalysis.overallScore.toFixed(1)}/10
             </Badge>
           )}
           <Button variant="outline" size="sm" className="border-slate-200 bg-white gap-2">
             <RefreshCw className="w-4 h-4" /> Re-analyse
           </Button>
           <Button variant="destructive" size="sm" className="gap-2">
             <Trash2 className="w-4 h-4" /> Delete
           </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Media & Feedback */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="rounded-xl overflow-hidden bg-black aspect-video border border-slate-200 flex items-center justify-center relative group">
             {/* Media Player placeholder - assume presigned URL is valid or video tag handles it */}
             {session.s3Url ? (
               <video src={session.s3Url} controls className="w-full h-full object-contain bg-black" />
             ) : (
               <div className="text-slate-500 text-sm">Media not available</div>
             )}
             <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               {session.s3Url && (
                 <Button variant="secondary" size="icon" className="h-8 w-8 bg-black/50 hover:bg-black/80" asChild>
                   <a href={session.s3Url} download><Download className="w-4 h-4 text-slate-900" /></a>
                 </Button>
               )}
             </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-500 px-1">
             <span>Duration: {formatDuration(session.duration || 0)}</span>
             <span>Size: {session.fileSize ? (Number(session.fileSize) / 1024 / 1024).toFixed(2) + " MB" : "Unknown"}</span>
          </div>

          {session.aiAnalysis ? (
             <FeedbackPanel analysis={session.aiAnalysis} transcript={session.transcript} />
          ) : (
            <div className="p-6 border border-slate-200 rounded-xl bg-white text-center text-slate-500">
              {session.status === "PROCESSING" ? "Analysis is currently processing..." : "No analysis available for this session."}
            </div>
          )}
          
          {session.transcript && (
             <TranscriptChat sessionId={session.id} />
          )}
        </div>

        {/* Right Column: Scores & Transcript */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
           {session.aiAnalysis && (
             <>
                <ScoreCard analysis={session.aiAnalysis} previous={previousSession?.aiAnalysis} />
                <ComparisonView current={session.aiAnalysis} previous={previousSession?.aiAnalysis} />
             </>
           )}
           
           {session.transcript ? (
             <TranscriptViewer transcript={session.transcript} />
           ) : (
             <div className="p-6 border border-slate-200 rounded-xl bg-white text-center text-slate-500">
                No transcript available.
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
