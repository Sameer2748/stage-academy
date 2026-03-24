"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { COURSE_MODULES, PDF_RESOURCES, CourseVideo, CourseModule } from "@/lib/course-data";
import {
  Play,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  FileText,
  ExternalLink,
  Download,
  File,
  Clock,
  FolderOpen,
} from "lucide-react";

const phaseColors: Record<string, string> = {
  INTRO: "bg-slate-200 text-slate-700",
  VOLUME: "bg-blue-50 text-blue-600 border border-blue-200",
  TONALITY: "bg-purple-50 text-purple-600 border border-purple-200",
  PAUSE: "bg-amber-50 text-amber-600 border border-amber-200",
  STORYTELLING: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  BONUS: "bg-pink-600/20 text-pink-600 border border-pink-500/30",
  QA: "bg-cyan-600/20 text-cyan-600 border border-cyan-500/30",
  COACHING: "bg-orange-50 text-orange-600 border border-orange-200",
  BEYOND: "bg-indigo-50 text-indigo-600 border border-indigo-200",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getModuleTotalDuration(mod: CourseModule): number {
  return mod.videos.reduce((sum, v) => sum + (v.duration || 0), 0);
}

export default function LibraryPage() {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [showPdfSection, setShowPdfSection] = useState(false);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState<number | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("watched-videos");
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch { return new Set(); }
    }
    return new Set();
  });

  // Persist watched videos to localStorage
  useEffect(() => {
    localStorage.setItem("watched-videos", JSON.stringify([...watchedVideos]));
  }, [watchedVideos]);

  const selectedModule = selectedModuleIndex !== null ? COURSE_MODULES[selectedModuleIndex] : null;
  const selectedVideo = selectedModule && selectedVideoIndex !== null ? selectedModule.videos[selectedVideoIndex] : null;
  const selectedPdf = selectedPdfIndex !== null ? PDF_RESOURCES[selectedPdfIndex] : null;

  const totalVideos = COURSE_MODULES.reduce((sum, m) => sum + m.videoCount, 0);
  const totalWatched = watchedVideos.size;
  const overallProgress = totalVideos > 0 ? (totalWatched / totalVideos) * 100 : 0;

  const toggleWatched = (videoId: string) => {
    setWatchedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const goToPrevVideo = () => {
    if (selectedModule && selectedVideoIndex !== null && selectedVideoIndex > 0) {
      setSelectedVideoIndex(selectedVideoIndex - 1);
      setSelectedPdfIndex(null);
      setShowPdfSection(false);
    }
  };

  const goToNextVideo = () => {
    if (selectedModule && selectedVideoIndex !== null && selectedVideoIndex < selectedModule.videos.length - 1) {
      setSelectedVideoIndex(selectedVideoIndex + 1);
      setSelectedPdfIndex(null);
      setShowPdfSection(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden -m-6">
      {/* Left Sidebar - Module List */}
      <div className="w-72 lg:w-80 border-r border-slate-200 flex flex-col bg-white shrink-0">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-sm mb-1">Course Library</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{totalWatched}/{totalVideos} videos watched</span>
          </div>
          <Progress value={overallProgress} className="h-1 mt-2" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {/* PDF Resources */}
            {PDF_RESOURCES.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => {
                    setShowPdfSection(!showPdfSection);
                    setSelectedModuleIndex(null);
                    setSelectedVideoIndex(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    showPdfSection ? "bg-slate-100 border border-slate-200" : "hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-slate-700">PDF Resources</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{PDF_RESOURCES.length} files</span>
                  </div>
                </button>
                {showPdfSection && (
                  <div className="mt-1 ml-3 space-y-0.5">
                    {PDF_RESOURCES.map((pdf, i) => (
                      <button
                        key={pdf.driveFileId}
                        onClick={() => {
                          setSelectedPdfIndex(i);
                          setSelectedVideoIndex(null);
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                          selectedPdfIndex === i
                            ? "bg-indigo-50 text-indigo-500"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <File className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="text-[11px] truncate">{pdf.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="h-px bg-slate-200 mx-2 my-2" />
              </div>
            )}

            {/* Modules */}
            {COURSE_MODULES.map((mod, modIdx) => {
              const isActive = selectedModuleIndex === modIdx;
              const moduleWatched = mod.videos.filter((v) => watchedVideos.has(v.driveFileId)).length;
              const moduleDuration = getModuleTotalDuration(mod);

              return (
                <div key={mod.folderId}>
                  <button
                    onClick={() => {
                      setSelectedModuleIndex(isActive ? null : modIdx);
                      setSelectedVideoIndex(null);
                      setSelectedPdfIndex(null);
                      setShowPdfSection(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isActive ? "bg-slate-100 border border-slate-200" : "hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${phaseColors[mod.phase] || phaseColors.INTRO}`}>
                        {mod.phase}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-tight">{mod.folderName}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3" /> {mod.videoCount} videos
                      </span>
                      {moduleDuration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(moduleDuration)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress
                        value={mod.videoCount > 0 ? (moduleWatched / mod.videoCount) * 100 : 0}
                        className="h-0.5 flex-1"
                      />
                      <span className="text-[10px] text-slate-400">{moduleWatched}/{mod.videoCount}</span>
                    </div>
                  </button>

                  {/* Expanded video list */}
                  {isActive && (
                    <div className="mt-1 ml-3 space-y-0.5 mb-2">
                      {mod.videos.map((video, vidIdx) => {
                        const isWatched = watchedVideos.has(video.driveFileId);
                        const isSelected = selectedVideoIndex === vidIdx;
                        return (
                          <button
                            key={video.driveFileId}
                            onClick={() => {
                              setSelectedVideoIndex(vidIdx);
                              setSelectedPdfIndex(null);
                              setShowPdfSection(false);
                            }}
                            className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                              isSelected
                                ? "bg-indigo-50 text-indigo-500"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {isWatched ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="text-[11px] truncate flex-1">{video.title}</span>
                            {video.duration && (
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatDuration(video.duration)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Video/PDF Player */}
      <div className="flex-1 overflow-y-auto bg-white">
        {selectedPdf ? (
          /* PDF Viewer */
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{selectedPdf.title}</h3>
              <Button variant="outline" className="border-slate-200 gap-2" asChild>
                <a href={selectedPdf.downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4" /> Download PDF
                </a>
              </Button>
            </div>
            <div className="relative bg-black rounded-xl overflow-hidden border border-slate-200" style={{ height: "calc(100vh - 180px)" }}>
              <iframe
                src={selectedPdf.embedUrl}
                width="100%"
                height="100%"
                allow="autoplay"
                allowFullScreen
                className="absolute inset-0"
              />
            </div>
          </div>
        ) : selectedVideo ? (
          /* Video Player */
          <div className="p-6 space-y-5">
            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-200">
              <iframe
                src={selectedVideo.embedUrl}
                width="100%"
                height="100%"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="absolute inset-0"
              />
            </div>

            {/* Video Info & Actions */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{selectedVideo.title}</h3>
                {selectedModule && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${phaseColors[selectedModule.phase] || phaseColors.INTRO}`}>
                      {selectedModule.phase}
                    </span>
                    <span className="text-xs text-slate-400">{selectedModule.folderName}</span>
                    {selectedVideo.duration && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(selectedVideo.duration)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {watchedVideos.has(selectedVideo.driveFileId) ? (
                  <Button
                    onClick={() => toggleWatched(selectedVideo.driveFileId)}
                    className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600/30 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Watched
                  </Button>
                ) : (
                  <Button
                    onClick={() => toggleWatched(selectedVideo.driveFileId)}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Watched
                  </Button>
                )}
                <Button variant="outline" size="icon" className="border-slate-200" asChild>
                  <a href={selectedVideo.viewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 gap-2"
                onClick={goToPrevVideo}
                disabled={selectedVideoIndex === null || selectedVideoIndex <= 0}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <span className="text-xs text-slate-400">
                {selectedVideoIndex !== null && selectedModule
                  ? `${selectedVideoIndex + 1} of ${selectedModule.videos.length}`
                  : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 gap-2"
                onClick={goToNextVideo}
                disabled={
                  selectedVideoIndex === null ||
                  !selectedModule ||
                  selectedVideoIndex >= selectedModule.videos.length - 1
                }
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              Stage Academy Course Library
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Browse through {COURSE_MODULES.length} modules with {totalVideos} videos.
              Select a module from the sidebar to start learning.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left max-w-xs">
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-2xl font-bold text-indigo-600">{COURSE_MODULES.length}</p>
                <p className="text-[11px] text-slate-400">Modules</p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-2xl font-bold text-emerald-600">{totalVideos}</p>
                <p className="text-[11px] text-slate-400">Videos</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
