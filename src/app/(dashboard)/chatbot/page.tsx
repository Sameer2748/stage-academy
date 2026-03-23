"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User,
  Loader2,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

interface SessionOption {
  id: string;
  title: string;
  weekNumber: number;
  dayNumber: number;
}

const suggestedQuestions = {
  session: [
    "Analyse my filler words in this session",
    "What was my best moment?",
    "Compare this to my previous session",
    "How can I improve my score?",
  ],
  general: [
    "What should I focus on this week?",
    "Am I on track for the next phase?",
    "Generate a drill for tomorrow",
    "Give me tips for reducing filler words",
    "Explain the vocal archetypes",
    "How do I use pauses more effectively?",
  ],
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [contextType, setContextType] = useState("none");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load recent sessions for context
    fetch("/api/sessions?pageSize=20")
      .then((res) => res.json())
      .then((data) => {
        setSessions(
          (data.sessions || []).map((s: SessionOption) => ({
            id: s.id,
            title: s.title,
            weekNumber: s.weekNumber,
            dayNumber: s.dayNumber,
          }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Load chat history
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || streaming) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "USER",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setStreaming(true);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ASSISTANT",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        abortRef.current = new AbortController();
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: content.trim() }],
            sessionId: contextType === "session" ? sessionId : undefined,
            contextType,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("Chat request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream reader");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullText += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg.role === "ASSISTANT") {
                      lastMsg.content = fullText;
                    }
                    return updated;
                  });
                }
              } catch {
                // Not JSON, treat as plain text
                fullText += data;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === "ASSISTANT") {
                    lastMsg.content = fullText;
                  }
                  return updated;
                });
              }
            }
          }
        }

        // Play TTS if voice is enabled
        if (voiceEnabled && fullText) {
          playTTS(fullText);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === "ASSISTANT" && !lastMsg.content) {
              lastMsg.content =
                "Sorry, I encountered an error. Please try again.";
            }
            return updated;
          });
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [contextType, sessionId, streaming, voiceEnabled]
  );

  const playTTS = async (text: string) => {
    try {
      setIsSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch {
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const currentSuggestions =
    contextType === "session" ? suggestedQuestions.session : suggestedQuestions.general;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">AI Coach</h2>
            <p className="text-xs text-zinc-500">
              Powered by Grok — trained on Stage Academy methodology
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={contextType} onValueChange={setContextType}>
            <SelectTrigger className="w-[140px] bg-[#111111] border-[#2a2a2a] text-xs h-8">
              <SelectValue placeholder="Context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Context</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="all">All Sessions</SelectItem>
            </SelectContent>
          </Select>
          {contextType === "session" && (
            <Select
              value={sessionId || ""}
              onValueChange={(v) => setSessionId(v)}
            >
              <SelectTrigger className="w-[180px] bg-[#111111] border-[#2a2a2a] text-xs h-8">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    W{s.weekNumber}D{s.dayNumber}: {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="icon"
            className={`h-8 w-8 border-[#2a2a2a] ${voiceEnabled ? "bg-indigo-500/20 text-indigo-400" : ""}`}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">
              Your AI Speaking Coach
            </h3>
            <p className="text-sm text-zinc-500 max-w-md mb-6">
              Ask me anything about your speaking performance, the Stage Academy
              curriculum, or get personalized coaching advice.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {currentSuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a2a] bg-[#111111] text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === "USER" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "ASSISTANT" && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "USER"
                  ? "bg-indigo-600 text-white"
                  : "bg-[#111111] border border-[#2a2a2a] text-zinc-200"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content || (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                )}
              </div>
              <p
                className={`text-[10px] mt-1 ${
                  msg.role === "USER" ? "text-indigo-200" : "text-zinc-600"
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {msg.role === "USER" && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-zinc-700 text-white text-xs">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isSpeaking && (
          <div className="flex items-center gap-2 text-xs text-indigo-400">
            <Volume2 className="w-4 h-4 animate-pulse" />
            Speaking...
          </div>
        )}
      </div>

      {/* Suggested Chips */}
      {messages.length > 0 && !streaming && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-[#2a2a2a]">
          {currentSuggestions.slice(0, 3).map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-[#2a2a2a] bg-[#111111] text-zinc-500 hover:text-white hover:border-indigo-500/50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-[#2a2a2a]">
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className={`h-10 w-10 shrink-0 border-[#2a2a2a] ${
              isListening
                ? "bg-red-500/20 text-red-400 border-red-500/50"
                : ""
            }`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI coach..."
            className="min-h-[40px] max-h-[120px] bg-[#111111] border-[#2a2a2a] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700"
            disabled={!input.trim() || streaming}
            onClick={() => sendMessage(input)}
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
