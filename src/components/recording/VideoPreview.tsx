"use client";

import { useRef, useEffect } from "react";
import { Play, Volume2 } from "lucide-react";

interface VideoPreviewProps {
  src: string;
  isVideo: boolean;
}

export default function VideoPreview({ src, isVideo }: VideoPreviewProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.src = src;
    }
  }, [src]);

  if (!isVideo) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full rounded-xl bg-white border border-slate-200 p-8 gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200">
          <Volume2 className="w-8 h-8 text-indigo-600" />
        </div>
        <p className="text-sm text-gray-400">Audio Recording</p>
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={src}
          controls
          className="w-full max-w-md [&::-webkit-media-controls-panel]:bg-slate-100 [&::-webkit-media-controls-current-time-display]:text-slate-900 [&::-webkit-media-controls-time-remaining-display]:text-slate-900"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black border border-slate-200">
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        src={src}
        controls
        playsInline
        className="w-full aspect-video object-cover"
      >
        <track kind="captions" />
      </video>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-16 pointer-events-none flex items-end pb-2 px-3">
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <Play className="w-3 h-3" />
          <span>Preview</span>
        </div>
      </div>
    </div>
  );
}
