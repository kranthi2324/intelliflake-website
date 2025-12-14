// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
//import { callLLM } from '@/lib/callLLM';
import { callLLM } from '../../../lib/callLLM';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  userId?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      );
    }

    const replyText = await callLLM({
      messages: body.messages,
      userId: body.userId,
      meta: body.metadata,
    });

    return NextResponse.json(
      { reply: replyText },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/chat error', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}

