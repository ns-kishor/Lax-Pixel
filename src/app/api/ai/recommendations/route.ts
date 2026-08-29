import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, userHistory } = await req.json();
    const products = await db.product.findMany({
      include: { category: true },
      take: 20,
    });

    const productContext = products.map(p => 
      `${p.name} ($${p.price}) - ${p.category.name} - Rating: ${p.rating} - Tags: ${p.tags}`
    ).join('\n');

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{
        role: 'assistant',
        content: `You are a luxury product recommendation engine for NOIR. Based on the customer query and their browsing history, recommend the most suitable products. Respond with a JSON array of product names only, no explanation. Pick 1-4 products.

Available products:
${productContext}

Customer query: ${query || 'General luxury recommendations'}
Customer history: ${userHistory || 'New customer'}`,
      }, {
        role: 'user',
        content: 'Recommend products based on the above context. Return only a JSON array of product names.',
      }],
      thinking: { type: 'disabled' },
    });

    const text = completion.choices[0]?.message?.content || '[]';
    const match = text.match(/\[[\s\S]*?\]/);
    const names = match ? JSON.parse(match[0]) : [];
    const recommended = products.filter(p => names.some((n: string) => p.name.toLowerCase().includes(n.toLowerCase())));
    return NextResponse.json(recommended.length > 0 ? recommended : products.slice(0, 4));
  } catch {
    const fallback = await db.product.findMany({ where: { featured: true }, take: 4, include: { category: true } });
    return NextResponse.json(fallback);
  }
}
