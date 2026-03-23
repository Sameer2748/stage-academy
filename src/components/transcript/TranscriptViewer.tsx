"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transcript } from "@prisma/client";
import { useState } from "react";

interface TranscriptViewerProps {
  transcript: Transcript;
}

export default function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [highlightFillers, setHighlightFillers] = useState(true);
  const paragraphs = transcript.paragraphs as any[] || [];
  
  const fillerWordKeys = transcript.fillerWordCount 
    ? Object.keys(transcript.fillerWordCount) 
    : [];

  // Helper to render text with filler words highlighted
  const renderText = (text: string) => {
    if (!highlightFillers || fillerWordKeys.length === 0) return text;
    
    // Create a regex to match filler words as whole words
    const regex = new RegExp(`\\b(${fillerWordKeys.join('|')})\\b`, 'gi');
    
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      if (fillerWordKeys.includes(part.toLowerCase())) {
        return <span key={i} className="bg-orange-500/20 text-orange-400 px-1 rounded-sm mx-0.5">{part}</span>;
      }
      return part;
    });
  };

  return (
    <Card className="bg-[#111111] border-[#2a2a2a] flex flex-col h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl">Transcript</CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-white transition-colors">
            <input 
               type="checkbox" 
               checked={highlightFillers} 
               onChange={() => setHighlightFillers(!highlightFillers)}
               className="accent-indigo-500 bg-[#222] border-[#444] rounded"
            />
            Highlight Fillers ({transcript.totalFillers})
          </label>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 relative">
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#111111] to-transparent z-10 pointer-events-none" />
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-6 pt-2">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, pIdx) => (
                <div key={pIdx} className="group">
                  <div className="flex gap-4">
                    <span className="text-xs text-muted-foreground font-mono w-12 pt-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      {Math.floor(p.start / 60)}:{(Math.floor(p.start % 60)).toString().padStart(2, '0')}
                    </span>
                    <p className="text-sm leading-relaxed text-gray-300 flex-1">
                      {p.sentences.map((s: any, sIdx: number) => (
                        <span key={sIdx} className="mr-1">
                          {renderText(s.text)}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-relaxed text-gray-300">
                 {renderText(transcript.fullText)}
              </p>
            )}
          </div>
        </ScrollArea>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#111111] to-transparent z-10 pointer-events-none" />
      </CardContent>
    </Card>
  );
}
