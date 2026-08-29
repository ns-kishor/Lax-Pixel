import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { productName, productDetails, type } = await req.json();
    const zai = await ZAI.create();

    let systemPrompt = '';
    if (type === 'description') {
      systemPrompt = 'You are a luxury copywriter for NOIR ecommerce. Write a compelling, elegant product description in 2-3 sentences. Focus on craftsmanship, materials, and exclusivity. Do not use emojis.';
    } else if (type === 'tags') {
      systemPrompt = 'Generate 5-8 relevant SEO tags for this luxury product. Return as comma-separated lowercase words only, no explanation.';
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `Product: ${productName}. ${productDetails || ''}` },
      ],
      thinking: { type: 'disabled' },
    });

    return NextResponse.json({ result: completion.choices[0]?.message?.content || '' });
  } catch {
    return NextResponse.json({ result: '' });
  }
}
