"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { apiFetch, isApiError } from "@/lib/api";
import type { Merchant } from "@/types/merchant";
import type { ChatMessage } from "@/types/ai";

const quickActions = [
  "Why was this merchant rated this grade?",
  "What are the main risk factors?",
  "Compare to industry benchmark",
  "What would improve their score?",
  "Run a what-if scenario with 20% revenue increase",
  "Generate a credit report summary",
];

interface MerchantListResponse {
  merchants: Merchant[];
  total: number;
}

export default function ChatPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "I'm CreditMind AI Co-Pilot, your assistant for SME credit analysis. I can help you understand merchant profiles, explain credit scores, compare industry benchmarks, and run what-if scenarios.\n\nSelect a merchant from the left panel, then ask me anything about their credit profile!",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<MerchantListResponse>("/api/merchants")
      .then((data) => setMerchants(data.merchants))
      .catch((error) => {
        if (isApiError(error)) {
          console.error("Chat merchant list API error:", {
            code: error.code,
            status: error.status,
            message: error.message,
          });
          return;
        }
        console.error(error);
      });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const question = input;
    setInput("");
    setIsTyping(true);

    try {
      const data = await apiFetch<{ response: string; merchantId: string | null }>(
        "/api/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message: question,
            merchantId: selectedMerchant,
          }),
        }
      );

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.response,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const message =
        isApiError(error) && error.status
          ? `[${error.code} - ${error.status}] ${error.message}`
          : isApiError(error)
          ? `[${error.code}] ${error.message}`
          : "Sorry, I encountered an error. Please try again.";

      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const merchant = selectedMerchant
    ? merchants.find((m) => m.id === selectedMerchant)
    : null;

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6">
      {/* Merchant selector sidebar */}
      <Card className="w-72 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Select Merchant</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full px-3 pb-3">
            <div className="space-y-1.5">
              {merchants.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMerchant(m.id)}
                  className={`w-full text-left rounded-lg p-3 transition-colors ${
                    selectedMerchant === m.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.category}</p>
                    </div>
                  </div>
                  {m.latestScore && (
                    <div className="flex items-center gap-2 mt-1.5 ml-6">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {m.latestScore.grade}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Score: {m.latestScore.score}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">CreditMind AI Co-Pilot</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {merchant
                    ? `Analyzing: ${merchant.name}`
                    : "Select a merchant to begin analysis"}
                </p>
              </div>
            </div>
            {merchant?.latestScore && (
              <Badge variant="outline" className="text-sm">
                Grade {merchant.latestScore.grade} — Score {merchant.latestScore.score}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={
                    msg.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }
                >
                  {msg.role === "assistant" ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content.split("**").map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={j}>{part}</strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Quick actions */}
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {quickActions.slice(0, 4).map((action) => (
            <button
              key={action}
              onClick={() => {
                setInput(action);
              }}
              className="text-xs rounded-full border px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about merchant credit profile, risks, or run scenarios..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
