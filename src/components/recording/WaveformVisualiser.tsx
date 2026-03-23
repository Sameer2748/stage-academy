"use client";

import { useRef, useEffect } from "react";

interface WaveformVisualiserProps {
  audioData: Uint8Array;
  isActive: boolean;
  barCount?: number;
}

const BAR_COUNT = 32;

export default function WaveformVisualiser({
  audioData,
  isActive,
  barCount = BAR_COUNT,
}: WaveformVisualiserProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isActive) {
      // Reset bars to idle state
      barsRef.current.forEach((bar) => {
        if (bar) {
          bar.style.height = "4px";
        }
      });
      return;
    }

    const step = Math.max(1, Math.floor(audioData.length / barCount));

    for (let i = 0; i < barCount; i++) {
      const bar = barsRef.current[i];
      if (!bar) continue;

      const dataIndex = Math.min(i * step, audioData.length - 1);
      const value = audioData[dataIndex] || 0;
      // Map 0-255 to a height between 4px (idle) and 48px (max)
      const normalised = value / 255;
      const height = Math.max(4, normalised * 48);
      bar.style.height = `${height}px`;
    }
  }, [audioData, isActive, barCount]);

  return (
    <div className="flex items-center justify-center gap-[3px] h-14 px-4">
      {Array.from({ length: barCount }).map((_, i) => {
        // Gradient from indigo to purple across bars
        const ratio = i / (barCount - 1);
        const r = Math.round(99 + (147 - 99) * ratio);
        const g = Math.round(102 + (51 - 102) * ratio);
        const b = Math.round(241 + (234 - 241) * ratio);

        return (
          <div
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className="w-[6px] rounded-full transition-[height] duration-75 ease-out"
            style={{
              height: "4px",
              backgroundColor: `rgb(${r}, ${g}, ${b})`,
              minHeight: "4px",
            }}
          />
        );
      })}
    </div>
  );
}
