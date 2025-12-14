export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CallLLMArgs = {
  messages: ChatMessage[];
  userId?: string;
  metadata?: Record<string, unknown>;
};

export async function callLLM(args: CallLLMArgs): Promise<string> {
  const lastUserMessage = [...args.messages]
    .reverse()
    .find((m) => m.role === 'user');

  const text =
    lastUserMessage?.content ?? 'Hello from placeholder callLLM()';

  return `Echo from server: ${text}`;
}
