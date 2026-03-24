"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, SendHorizontal, Bot, User } from "lucide-react";
import { ChatMessage } from "@prisma/client";

interface TranscriptChatProps {
  sessionId: string;
}

export default function TranscriptChat({ sessionId }: TranscriptChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages on load
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
             setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    fetchHistory();
  }, [sessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: "temp-" + Date.now(),
      sessionId,
      role: "USER",
      content: input,
      createdAt: new Date()
    } as ChatMessage;

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           sessionId,
           contextType: "session",
           messages: [...messages.map(m => ({ role: m.role.toLowerCase(), content: m.content })), { role: "user", content: userMessage.content }],
        }),
      });

      if (!res.ok || !res.body) throw new Error("API failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let aiResponseContent = "";
      const aiTempId = "temp-ai-" + Date.now();

      setMessages((prev) => [...prev, {
        id: aiTempId,
        sessionId,
        role: "ASSISTANT",
        content: "",
        createdAt: new Date()
      } as ChatMessage]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.choices?.[0]?.delta?.content || "";
                aiResponseContent += text;
                setMessages(prev => prev.map(m => m.id === aiTempId ? { ...m, content: aiResponseContent } : m));
              } catch (e) {}
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      // Optional: Add an error message to the UI
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200 flex flex-col h-[500px]">
      <CardHeader className="border-b border-slate-200 py-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          AI Coach Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
               <Bot className="w-12 h-12 mb-3" />
               <p className="text-sm">Ask your AI Coach anything about this recording.</p>
            </div>
          ) : (
             messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === "USER" 
                      ? "bg-indigo-600 text-white rounded-br-sm" 
                      : "bg-slate-100 border border-slate-200 text-slate-700 rounded-bl-sm"
                    }`}
                  >
                     <div className="flex items-center gap-2 mb-1 opacity-70">
                       {msg.role === "USER" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                       <span className="text-xs font-medium tracking-wide">
                          {msg.role === "USER" ? "You" : "Coach"}
                       </span>
                     </div>
                     <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
             ))
          )}
          
          {isLoading && (
             <div className="flex justify-start">
               <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Coach is typing...</span>
               </div>
             </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-slate-200 p-3">
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g., How was my tone around the 2-minute mark?"
            className="flex-1 bg-black border-slate-200"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            <SendHorizontal className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
