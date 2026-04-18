export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  merchantId: string;
  merchantName: string;
  messages: ChatMessage[];
  createdAt: string;
}
