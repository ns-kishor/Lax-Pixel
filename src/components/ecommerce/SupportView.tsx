'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  MessageCircle,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mail,
  Truck,
  RotateCcw,
  CreditCard,
  UserCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  Bot,
  User,
  Trash2,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function SupportView() {
  const { setView } = useStore();
  const [activeTab, setActiveTab] = useState<'all' | 'faq' | 'contact' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // AI Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'স্বাগতম Lax Pixel কাস্টমার সাপোর্টে! 🌟\n\nআমি আপনার ২৪/৭ এআই শপিং ও সাপোর্ট অ্যাসিস্ট্যান্ট।\n\nআমি আপনাকে কীভাবে সাহায্য করতে পারি? আপনি আমাদের নতুন প্রোডাক্ট, বেস্ট সেলিং কালেকশন, সেরা ডিসকাউন্ট অফার, ৬৪ জেলায় ডেলিভারি, ৭ দিনের সহজ এক্সচেঞ্জ পলিসি কিংবা যেকোনো সাধারণ বিষয়ে জিজ্ঞাসা করতে পারেন।',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSendMessage = async (msgText?: string) => {
    const textToSend = (msgText || inputMessage).trim();
    if (!textToSend || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          sessionId: 'support-chat-session',
        }),
      });

      const data = await res.json();
      const replyContent =
        data.response ||
        'ধন্যবাদ আপনার বার্তার জন্য। আমরা আপনার অনুরোধটি প্রসেস করছি। আরও তথ্যের জন্য সরাসরি আমাদের কাস্টমার কেয়ারে যোগাযোগ করতে পারেন।';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: replyContent,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'দুঃখিত, সংযোগে কিছুটা বিলম্ব হচ্ছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন অথবা সরাসরি আমাদের WhatsApp / Gmail এ যোগাযোগ করুন।',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = async () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'চ্যাট হিস্ট্রি ক্লিয়ার করা হয়েছে। নতুন করে যেকোনো প্রশ্ন করতে পারেন!',
        timestamp: new Date(),
      },
    ]);
    try {
      await fetch('/api/ai/chat?sessionId=support-chat-session', { method: 'DELETE' });
    } catch {}
  };

  const faqs = [
    {
      category: 'ডেলিভারি ও ট্র্যাকিং',
      icon: Truck,
      q: 'অর্ডার করার পর ডেলিভারি পেতে কতদিন সময় লাগে এবং কীভাবে ট্র্যাক করব?',
      a: 'আমরা সমগ্র বাংলাদেশের ৬৪টি জেলাতেই নির্ভরযোগ্য এক্সপ্রেস হোম ডেলিভারি দিয়ে থাকি। সাধারণত ঢাকা সিটির মধ্যে ২৪ থেকে ৪৮ ঘণ্টা এবং ঢাকার বাইরে ২ থেকে ৩ কার্যদিবসের মধ্যে ডেলিভারি সম্পন্ন হয়। অর্ডার প্লেস করার পর আপনি একটি অর্ডার নম্বর পাবেন। আমাদের ওয়েবসাইটের "Track Order" পেজে গিয়ে অর্ডার নম্বর ইনপুট দিয়ে মুহূর্তেই লাইভ স্ট্যাটাস দেখতে পারবেন।',
    },
    {
      category: 'পেমেন্ট ও ভেরিফিকেশন',
      icon: CreditCard,
      q: 'বিকাশ, নগদ বা রকেটে পেমেন্ট করার পর ট্রানজেকশন আইডি কীভাবে সাবমিট করব?',
      a: 'চেকআউট পেজে আপনার পছন্দের মোবাইল ব্যাংকিং মেথড (bKash, Nagad, Rocket, Upay, Cellfin ইত্যাদি) সিলেক্ট করুন। স্ক্রিনে দেওয়া মার্চেন্ট/পার্সোনাল নম্বরে সেন্ড মানি বা পেমেন্ট সম্পন্ন করুন। এরপর যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বর এবং প্রাপ্ত ট্রানজেকশন আইডি (TrxID) নির্দিষ্ট বক্সে লিখে অর্ডার সাবমিট করুন। Cash on Delivery সিলেক্ট করলে কোনো ট্রানজেকশন আইডি প্রয়োজন নেই।',
    },
    {
      category: 'এক্সচেঞ্জ ও রিপ্লেসমেন্ট',
      icon: RotateCcw,
      q: 'প্রোডাক্ট হাতে পাওয়ার পর সাইজ বা কালার না মিললে কীভাবে এক্সচেঞ্জ করব?',
      a: 'Lax Pixel দিচ্ছে সহজ ৭ দিনের এক্সচেঞ্জ পলিসি (7-Day Easy Exchange Policy)। ডেলিভারি পাওয়ার ৭ দিনের মধ্যে সাইজ বা ফিটিংয়ের সমস্যা হলে নির্দ্বিধায় আমাদের কাস্টমার কেয়ারে (WhatsApp বা ইমেইল) মেসেজ করুন। কোনো প্রকার ঝামেলা ছাড়াই আমরা দ্রুততম সময়ে আপনার প্রোডাক্টটি এক্সচেঞ্জ করে পৌঁছে দেব।',
    },
    {
      category: 'লগইন ও ওটিপি',
      icon: ShieldAlert,
      q: 'অ্যাকাউন্ট ভেরিফিকেশনের জন্য ইমেইলে ওটিপি কোড না আসলে করণীয় কী?',
      a: 'ম্যানুয়ালি অ্যাকাউন্ট খোলার সময় আপনার জিমেইলে স্বয়ংক্রিয়ভাবে ৬ সংখ্যার কোড পাঠানো হয়। কোডটি না পেলে অনুগ্রহ করে আপনার জিমেইলের "Spam" বা "Promotions" ফোল্ডার চেক করুন। ১ মিনিট অপেক্ষা করার পর স্ক্রিনে "Resend Code" বাটন ভেসে উঠবে, সেখানে ক্লিক করে নতুন ওটিপি কোড নিতে পারেন।',
    },
    {
      category: 'সেলার অ্যাকাউন্ট',
      icon: UserCheck,
      q: 'বিক্রেতা (Seller) হিসেবে রেজিস্ট্রেশন ও এপ্রুভাল পাওয়ার নিয়ম কী?',
      a: 'আমাদের ফুটার বা অ্যাকাউন্ট সেকশন থেকে "Become a Seller" অপশনে যান। আপনার প্রতিষ্ঠানের নাম, যোগাযোগের নম্বর, ট্রেড লাইসেন্স বা প্রয়োজনীয় তথ্য দিয়ে ফর্ম ফিলাপ করুন এবং এডমিন নির্ধারিত ভেরিফিকেশন ফি প্রদান করে সাবমিট করুন। আমাদের এডমিন টিম ১২-২৪ ঘণ্টার মধ্যে তথ্য যাচাই করে আপনার সেলার অ্যাকাউন্টটি ভেরিফাই ও সক্রিয় করে দিবে।',
    },
    {
      category: 'অর্ডার বাতিল ও রিফান্ড',
      icon: HelpCircle,
      q: 'প্লেস করা অর্ডার কীভাবে বাতিল করব এবং টাকা কীভাবে রিফান্ড পাব?',
      a: 'আপনার অর্ডারটি কুরিয়ারে ডিসপ্যাচ হওয়ার পূর্বে আমাদের কাস্টমার সাপোর্টে (WhatsApp / Gmail) জানালে তা সাথে সাথে বাতিল করা সম্ভব। প্রিপেইড অর্ডারের ক্ষেত্রে যে মেথডে টাকা পরিশোধ করেছিলেন সেখানে ২৪ থেকে ৪৮ ঘণ্টার মধ্যে ১০০% রিফান্ড পাঠিয়ে দেওয়া হবে।',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const contactChannels = [
    {
      name: 'WhatsApp',
      subtitle: 'সরাসরি কাস্টমার কেয়ার এজেন্টের সাথে চ্যাট করুন',
      badge: 'Fastest Response',
      color: 'hover:border-emerald-500/50',
      actionLabel: 'Chat on WhatsApp',
      link: 'https://wa.me/8801700000000?text=Hello%20Lax%20Pixel%20Support',
      icon: (
        <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.5C9.32 7.5 8.97 7.58 8.68 7.9C8.39 8.21 7.56 8.99 7.56 10.56C7.56 12.14 8.71 13.66 8.87 13.87C9.03 14.08 11.13 17.32 14.34 18.71C15.1 19.04 15.69 19.24 16.15 19.39C16.92 19.63 17.61 19.6 18.16 19.52C18.78 19.43 20.06 18.74 20.33 17.99C20.6 17.23 20.6 16.58 20.52 16.45C20.44 16.32 20.23 16.24 19.92 16.08C19.61 15.93 18.06 15.17 17.77 15.06C17.48 14.96 17.28 14.9 17.07 15.22C16.86 15.53 16.26 16.24 16.08 16.45C15.9 16.66 15.72 16.68 15.41 16.53C15.1 16.37 14.11 16.05 12.93 15C12.01 14.18 11.39 13.17 11.21 12.86C11.03 12.55 11.19 12.39 11.35 12.23C11.49 12.1 11.66 11.88 11.82 11.69C11.98 11.5 12.03 11.37 12.14 11.16C12.24 10.95 12.19 10.77 12.11 10.61C12.03 10.45 11.42 8.95 11.16 8.33C10.91 7.73 10.65 7.81 10.46 7.8C10.28 7.8 10.07 7.79 9.87 7.79L9.53 7.5Z" />
        </svg>
      ),
    },
    {
      name: 'Telegram',
      subtitle: 'টেলিগ্রাম চ্যানেলে বা সাপোর্টে যোগাযোগ করুন',
      badge: '24/7 Channel',
      color: 'hover:border-sky-500/50',
      actionLabel: 'Open Telegram',
      link: 'https://t.me/LaxPixelSupport',
      icon: (
        <svg className="w-6 h-6 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .36z" />
        </svg>
      ),
    },
    {
      name: 'Gmail',
      subtitle: 'অফিশিয়াল মেইল করুন: nextstep1199@gmail.com',
      badge: 'Official Email',
      color: 'hover:border-red-500/50',
      actionLabel: 'Send Email',
      link: 'mailto:nextstep1199@gmail.com?subject=Support%20Request%20-%20Lax%20Pixel',
      icon: (
        <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      ),
    },
    {
      name: 'Messenger',
      subtitle: 'ফেসবুক পেজ ইনবক্সে সরাসরি মেসেজ দিন',
      badge: 'Facebook Chat',
      color: 'hover:border-blue-500/50',
      actionLabel: 'Open Messenger',
      link: 'https://m.me/laxpixel',
      icon: (
        <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.48 5.43 3.78 7.03V22l3.82-2.1c.78.22 1.6.34 2.4.34 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.09 12.09l-2.67-2.85-5.21 2.85 5.73-6.09 2.67 2.85 5.21-2.85-5.73 6.09z" />
        </svg>
      ),
    },
    {
      name: 'Ai Chat',
      subtitle: 'প্রোডাক্ট, ডিসকাউন্ট, ডেলিভারি ও সাধারণ চ্যাটিং সাহায্য',
      badge: 'Instant 24/7',
      color: 'hover:border-foreground/40',
      actionLabel: 'Start AI Chat',
      action: () => {
        chatContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      },
      icon: <Sparkles className="w-6 h-6 text-foreground" />,
    },
  ];

  const quickPrompts = [
    '✨ নতুন কি কি প্রোডাক্ট যুক্ত হয়েছে?',
    '🔥 বেস্ট সেলিং প্রোডাক্টগুলো দেখাও',
    '🏷️ সেরা ডিসকাউন্টের প্রোডাক্টগুলো কী কী?',
    '💰 সবচেয়ে কম দামি প্রোডাক্টগুলো দেখাও',
    '📦 পুরো বাংলাদেশে ডেলিভারি চার্জ ও সময় কত?',
    '🔄 প্রোডাক্ট ৭ দিনে কীভাবে এক্সচেঞ্জ করব?',
  ];

  return (
    <div className="min-h-screen py-10 sm:py-14 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
        {/* ─── Header ────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="secondary" className="text-[10px] tracking-[0.25em] uppercase px-3 py-1 font-medium">
            Help & Customer Care
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-foreground">
            Get Support
          </h1>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            সাধারণ সমস্যার সমাধান খুঁজুন, সরাসরি আমাদের কাস্টমার কেয়ার প্রতিনিধির সাথে কথা বলুন অথবা যেকোনো সাহায্যের জন্য ২৪/৭ এআই শপিং অ্যাসিস্ট্যান্ট ব্যবহার করুন।
          </p>

          {/* Search Bar for FAQs */}
          <div className="relative max-w-md mx-auto pt-4">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 translate-y-[-50%] text-muted-foreground" />
            <Input
              type="text"
              placeholder="আপনার সমস্যার কথা লিখুন (যেমন: ডেলিভারি, এক্সচেঞ্জ, পেমেন্ট)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card/80 border-border text-xs rounded-xl"
            />
          </div>
        </div>

        {/* ─── Channel 1 to 5: Customer Care Contact Options ─────── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-light tracking-tight">সরাসরি কাস্টমার কেয়ারে যোগাযোগ</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                আপনার যেকোনো সমস্যা বা প্রশ্নের তাৎক্ষণিক সমাধানের জন্য নিচের মাধ্যমগুলো বেছে নিন
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {contactChannels.map((c, i) => (
              <div
                key={i}
                className={`group relative rounded-2xl border border-border bg-card/90 p-5 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md ${c.color}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      {c.icon}
                    </div>
                    <Badge variant="secondary" className="text-[9px] tracking-wider font-medium">
                      {c.badge}
                    </Badge>
                  </div>
                  <h3 className="text-base font-medium text-foreground tracking-tight">{c.name}</h3>
                  <p className="text-xs text-muted-foreground font-light mt-1 leading-relaxed">
                    {c.subtitle}
                  </p>
                </div>

                <div className="pt-4 mt-2">
                  {c.link ? (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center h-9 px-3 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all gap-1.5"
                    >
                      {c.actionLabel} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-9 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all gap-1.5"
                      onClick={c.action}
                    >
                      {c.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Common Problems & Solutions (FAQ Accordion) ──────── */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-light tracking-tight">সাধারণ সমস্যা ও সমাধান</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              অর্ডার, পেমেন্ট, ডেলিভারি ও রিটার্ন সংক্রান্ত বহুল জিজ্ঞাসিত প্রশ্নাবলী
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFaqs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-border bg-card/80 p-5 transition-all duration-200"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full flex items-start justify-between text-left gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <faq.icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <span className="text-[10px] tracking-widest uppercase font-semibold text-muted-foreground">
                          {faq.category}
                        </span>
                        <h4 className="text-sm font-medium text-foreground mt-0.5 leading-snug">
                          {faq.q}
                        </h4>
                      </div>
                    </div>
                    <div className="shrink-0 text-muted-foreground mt-1">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground font-light leading-relaxed pl-12">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              আপনার সার্চ করা বিষয়ের সাথে কোনো প্রশ্ন মেলেনি। নিচে এআই চ্যাটে আপনার প্রশ্নটি লিখুন।
            </div>
          )}
        </div>

        {/* ─── 24/7 AI Smart Assistant Embedded Section ─────────── */}
        <div ref={chatContainerRef} className="pt-4">
          <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-lg">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-border bg-secondary/50 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center font-semibold shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-wide text-foreground">
                      Lax Pixel 24/7 AI Support & Shopping Assistant
                    </h3>
                    <Badge variant="outline" className="text-[9px] uppercase border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                      Online
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-light">
                    Powered by Google Gemini • রিয়েল-টাইম প্রোডাক্ট রিকমেন্ডেশন ও কাস্টমার কেয়ার
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground border-border rounded-lg gap-1.5"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Chat
                </Button>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-6 py-3 bg-secondary/20 border-b border-border/60 overflow-x-auto no-scrollbar flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-foreground" /> Quick Ask:
              </span>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isSending}
                  className="shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary text-foreground/90 transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Container */}
            <div className="p-4 sm:p-6 min-h-[360px] max-h-[520px] overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border text-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-foreground text-background font-normal'
                        : 'bg-secondary/70 border border-border text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex items-start gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border text-foreground">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-secondary/70 border border-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-border bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  type="text"
                  placeholder="আপনার প্রশ্নটি এখানে লিখুন (যেমন: নতুন প্রোডাক্ট কি আছে? বা এক্সচেঞ্জ নিয়মাবলী)..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isSending}
                  className="h-11 bg-secondary/50 border-border text-xs rounded-xl flex-1 focus-visible:ring-1"
                />
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="h-11 px-5 bg-foreground text-background text-xs tracking-wider uppercase rounded-xl hover:bg-foreground/90 disabled:opacity-50 shrink-0 font-medium"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Send
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* ─── Direct Shopping Back CTA ───────────────────────── */}
        <div className="text-center pt-4 pb-8">
          <Button
            variant="outline"
            className="text-xs tracking-widest uppercase border-border rounded-xl px-6 h-11 hover:bg-secondary font-medium"
            onClick={() => setView('shop')}
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-2" /> Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
}
