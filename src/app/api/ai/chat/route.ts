import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

const conversations = new Map<string, { role: string; content: string }[]>();

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, context } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const sid = sessionId || 'default';
    if (!conversations.has(sid)) {
      conversations.set(sid, [{
        role: 'assistant',
        content: `You are NOIR AI, the intelligent shopping assistant for NOIR - a premium luxury ecommerce platform. You help customers with:
- Product recommendations based on their preferences
- Finding specific products in our catalog
- Answering questions about products, materials, and craftsmanship
- Helping with order tracking and shipping
- Providing styling advice
- Explaining our luxury brand philosophy

Be concise, elegant, and knowledgeable. Use a refined tone matching our luxury brand. When recommending products, suggest specific items from our collection. Keep responses under 150 words unless detailed explanation is requested.

Current context: ${context || 'No specific context'}`,
      }]);
    }

    const history = conversations.get(sid)!;
    history.push({ role: 'user', content: message });

    // Trim history if too long
    if (history.length > 20) {
      conversations.set(sid, [history[0], ...history.slice(-18)]);
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: conversations.get(sid)!,
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I could not process your request.';
    conversations.get(sid)!.push({ role: 'assistant', content: response });

    return NextResponse.json({ response });
  } catch (e) {
    return NextResponse.json({ response: 'I apologize for the interruption. Please try again.', error: String(e) });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get('sessionId');
  if (sid) conversations.delete(sid);
  return NextResponse.json({ success: true });
}
