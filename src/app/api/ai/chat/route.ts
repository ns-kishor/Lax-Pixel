import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
];

interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const sessions = new Map<string, ChatHistoryItem[]>();

async function getLiveStoreContext() {
  try {
    const [allProducts, categories] = await Promise.all([
      db.product.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          price: true,
          comparePrice: true,
          salesCount: true,
          rating: true,
          stock: true,
          category: { select: { name: true } },
        },
      }),
      db.category.findMany({ select: { name: true } }),
    ]);

    const recent = allProducts.slice(0, 6).map(p => `• ${p.name} ($${p.price}) - ${p.category?.name || 'General'}`).join('\n');
    
    const bestSellers = [...allProducts]
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 6)
      .map(p => `• ${p.name} ($${p.price}) - ${p.salesCount || 0} sold, Rating: ${p.rating}★`)
      .join('\n');

    const lowPrice = [...allProducts]
      .sort((a, b) => a.price - b.price)
      .slice(0, 5)
      .map(p => `• ${p.name} ($${p.price})`)
      .join('\n');

    const bestDiscounts = allProducts
      .filter(p => p.comparePrice && p.comparePrice > p.price)
      .map(p => {
        const off = Math.round((1 - p.price / p.comparePrice!) * 100);
        return `• ${p.name} (Now $${p.price}, Was $${p.comparePrice} - ${off}% OFF)`;
      })
      .slice(0, 6)
      .join('\n');

    const catList = categories.map(c => c.name).join(', ');

    return `
[Lax Pixel Store Knowledge]:
- Categories: ${catList}
- Newly Added / Recent Products:
${recent}

- Best Selling / Popular Products:
${bestSellers}

- Budget Friendly / Lowest Price Products:
${lowPrice}

- High Discount / Special Offers:
${bestDiscounts || 'Current discounts updated daily.'}

- Store Policies & FAQs:
1. Delivery: Nationwide express shipping across all 64 districts in Bangladesh. Typically takes 2-3 business days. Real-time order tracking available under the Track Order page.
2. Exchange & Returns: 7-day hassle-free easy exchange policy. If size, fit, or condition doesn't match, customers can request an exchange with zero hassle.
3. Payment Methods: bKash, Nagad, Rocket, Upay, mCash, GPay, Cellfin, Mukto-Pay, Nexus-Pay, Pathao-Pay, and Cash on Delivery (COD). For manual mobile banking, customer inputs Transaction ID & Sender Phone Number.
4. Seller Accounts: Anyone can register as a seller from the 'Become a Seller' page. Requires business info and payment of the admin verification fee. Admin reviews and approves the seller profile before product listing.
5. Customer Support Channels:
   - WhatsApp Support
   - Telegram Support
   - Gmail: nextstep1199@gmail.com
   - Messenger Support
   - 24/7 AI Smart Assistant
`;
  } catch (e) {
    return `Store: Lax Pixel - Luxury & Lifestyle Ecommerce in Bangladesh. Delivery all over 64 districts, 7-day exchange guarantee.`;
  }
}

async function callGemini(contents: any[]) {
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch {
      // try next model
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const sid = sessionId || 'support-session';
    const storeContext = await getLiveStoreContext();

    const systemPrompt = `You are the official AI Support & Shopping Assistant for "Lax Pixel" (ল্যাক্স পিক্সেল) - Bangladesh's premier luxury and lifestyle e-commerce platform.

Your goals:
1. Answer customer questions about website usage, orders, tracking, 64-district delivery, 7-day easy exchange guarantee, payment methods (bKash, Nagad, Rocket, COD, etc.), and seller registration.
2. Recommend products from our real-time catalog:
   - When asked for "নতুন প্রডাক্ট" (New arrivals), suggest from the Newly Added list.
   - When asked for "বেস্ট সেলিং" (Best sellers), suggest from the Best Selling list.
   - When asked for "কম দামি" (Budget friendly), suggest from the Lowest Price list.
   - When asked for "ডিসকাউন্ট" (Offers/Discounts), suggest from the Special Offers list.
   - For unique gifts or luxury items, give thoughtful recommendations.
3. Chat naturally, politely, and warmly with customers. Match the user's language: if they write in Bengali, reply in fluent, courteous Bengali. If English, reply in English.
4. Keep answers clear, nicely formatted with bullet points where appropriate, and easy to read.

Here is the current live store data:
${storeContext}
`;

    // Retrieve or initialize session history
    let history = sessions.get(sid) || [];

    // Format for Gemini API
    const contents = [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nCustomer: ${message}` }],
      },
    ];

    // If there is existing conversation history, append previous turns
    if (history.length > 0) {
      // Keep only recent 8 turns to stay snappy
      const recentHistory = history.slice(-8);
      contents.length = 0;
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'আমি Lax Pixel-এর অফিশিয়াল সাপোর্ট ও শপিং অ্যাসিস্ট্যান্ট। আমি আপনাকে কীভাবে সাহায্য করতে পারি?' }],
      });
      for (const h of recentHistory) {
        contents.push(h);
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    }

    let reply = await callGemini(contents);

    if (!reply) {
      // Smart local fallback if API temporarily down
      const lower = message.toLowerCase();
      if (lower.includes('ডেলিভারি') || lower.includes('delivery')) {
        reply = 'আমরা পুরো বাংলাদেশের ৬৪ টি জেলায় দ্রুত হোম ডেলিভারি দিয়ে থাকি। সাধারণত ২-৩ কার্যদিবসের মধ্যে ডেলিভারি সম্পন্ন হয়। আপনি আমাদের Track Order পেজ থেকে আপনার অর্ডারের লাইভ স্ট্যাটাস দেখতে পারবেন।';
      } else if (lower.includes('এক্সচেঞ্জ') || lower.includes('রিটার্ন') || lower.includes('exchange') || lower.includes('return')) {
        reply = 'আমাদের রয়েছে সহজ ৭ দিনের এক্সচেঞ্জ পলিসি (7-Day Easy Exchange Policy)। সাইজ বা প্রোডাক্টের কোনো সমস্যা থাকলে ডেলিভারির ৭ দিনের মধ্যে অতি সহজে পরিবর্তন করে নিতে পারবেন।';
      } else if (lower.includes('পেমেন্ট') || lower.includes('টাকা') || lower.includes('payment') || lower.includes('bkash')) {
        reply = 'আমরা বিকাশ, নগদ, রকেট, উপায়, এমক্যাশ, সেলফিন, মুক্ত-পে, নেক্সাস-পে, পাঠাও-পে এবং ক্যাশ অন ডেলিভারি (Cash on Delivery) সাপোর্ট করি।';
      } else if (lower.includes('সেলার') || lower.includes('বিক্রেতা') || lower.includes('seller')) {
        reply = 'আপনি সহজেই Lax Pixel-এ সেলার হতে পারেন! ওয়েবসাইটের "Become a Seller" অপশনে গিয়ে ফর্ম ফিলাপ করুন এবং ভেরিফিকেশন সম্পন্ন করে আপনার প্রোডাক্ট বিক্রয় শুরু করুন।';
      } else {
        reply = 'ধন্যবাদ Lax Pixel-এ যোগাযোগ করার জন্য! আমাদের নতুন প্রোডাক্ট, বেস্ট সেলিং কালেকশন, ডিসকাউন্ট অফার অথবা অর্ডার ও ডেলিভারি সংক্রান্ত যেকোনো তথ্য জানতে চাইলে নির্দ্বিধায় আমাকে জিজ্ঞাসা করুন।';
      }
    }

    // Save to session history
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: reply }] });
    if (history.length > 12) history = history.slice(-10);
    sessions.set(sid, history);

    return NextResponse.json({ response: reply });
  } catch (e: any) {
    return NextResponse.json({
      response: 'দুঃখিত, সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে আরেকবার চেষ্টা করুন অথবা সরাসরি আমাদের WhatsApp বা Gmail এ যোগাযোগ করুন।',
      error: String(e),
    });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get('sessionId') || 'support-session';
  sessions.delete(sid);
  return NextResponse.json({ success: true });
}
