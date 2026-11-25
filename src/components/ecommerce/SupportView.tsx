'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Truck,
  RotateCcw,
  CreditCard,
  UserCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  ShoppingBag,
  PhoneCall,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SupportView() {
  const { setView } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setSettings(data);
        }
      })
      .catch(() => {});
  }, []);

  const whatsappNum = settings.social_whatsapp ? settings.social_whatsapp.replace(/\D/g, '') : '8801700000000';

  const faqs = [
    {
      category: 'Delivery & Tracking',
      icon: Truck,
      q: 'How long does delivery take after ordering, and how do I track it?',
      a: 'We provide reliable express home delivery across all 64 districts in Bangladesh. Typically, delivery is completed within 24 to 48 hours within Dhaka city and within 2 to 3 business days outside Dhaka. After placing your order, you will receive an order number. Simply visit the "Track Order" page on our website and enter your order number to view real-time status.',
    },
    {
      category: 'Payment & Verification',
      icon: CreditCard,
      q: 'How do I submit my Transaction ID after paying via bKash, Nagad, or Rocket?',
      a: 'Select your preferred mobile payment method (bKash, Nagad, Rocket, Upay, Cellfin, etc.) on the checkout page. Complete the payment or send money to the displayed account number. Then enter the phone number you paid from and the Transaction ID (TrxID) in the respective fields and submit. If you choose Cash on Delivery, no transaction ID is needed.',
    },
    {
      category: 'Exchange & Replacement',
      icon: RotateCcw,
      q: 'How do I exchange a product if the size or color does not fit?',
      a: 'Lax Pixel offers a hassle-free 7-Day Easy Exchange Policy. If you experience any size or fitting issues within 7 days of delivery, simply message our customer support on WhatsApp or email. We will quickly exchange and deliver your replacement item without hassle.',
    },
    {
      category: 'Login & Verification',
      icon: ShieldAlert,
      q: 'What should I do if I do not receive the email OTP code for verification?',
      a: 'A 6-digit verification code is automatically sent to your registered Gmail address. If you do not see it in your inbox, please check your Spam or Promotions folder. After waiting 1 minute, a "Resend Code" button will appear on the screen to request a fresh code.',
    },
    {
      category: 'Seller Account',
      icon: UserCheck,
      q: 'What are the rules and procedure for seller registration and approval?',
      a: 'Navigate to "Become a Seller" from our footer or account section. Fill in your business name, contact details, trade license, or requested info, and submit the verification fee. Our admin team will verify and activate your seller account within 12-24 hours.',
    },
    {
      category: 'Cancellation & Refund',
      icon: HelpCircle,
      q: 'How do I cancel a placed order and receive a refund?',
      a: 'If your order has not yet been dispatched to the courier, contact our customer support on WhatsApp or Gmail to cancel it immediately. For prepaid orders, a 100% refund will be issued to your payment source within 24 to 48 hours.',
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
      name: 'WhatsApp Support',
      subtitle: 'Chat directly with a customer care agent for quick help',
      badge: 'Fastest Response',
      color: 'hover:border-foreground/40',
      actionLabel: 'Chat on WhatsApp',
      link: `https://wa.me/${whatsappNum}?text=Hello%20Lax%20Pixel%20Support`,
      icon: (
        <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.5C9.32 7.5 8.97 7.58 8.68 7.9C8.39 8.21 7.56 8.99 7.56 10.56C7.56 12.14 8.71 13.66 8.87 13.87C9.03 14.08 11.13 17.32 14.34 18.71C15.1 19.04 15.69 19.24 16.15 19.39C16.92 19.63 17.61 19.6 18.16 19.52C18.78 19.43 20.06 18.74 20.33 17.99C20.6 17.23 20.6 16.58 20.52 16.45C20.44 16.32 20.23 16.24 19.92 16.08C19.61 15.93 18.06 15.17 17.77 15.06C17.48 14.96 17.28 14.9 17.07 15.22C16.86 15.53 16.26 16.24 16.08 16.45C15.9 16.66 15.72 16.68 15.41 16.53C15.1 16.37 14.11 16.05 12.93 15C12.01 14.18 11.39 13.17 11.21 12.86C11.03 12.55 11.19 12.39 11.35 12.23C11.49 12.1 11.66 11.88 11.82 11.69C11.98 11.5 12.03 11.37 12.14 11.16C12.24 10.95 12.19 10.77 12.11 10.61C12.03 10.45 11.42 8.95 11.16 8.33C10.91 7.73 10.65 7.81 10.46 7.8C10.28 7.8 10.07 7.79 9.87 7.79L9.53 7.5Z" />
        </svg>
      ),
    },
    {
      name: 'Telegram Support',
      subtitle: 'Contact us via Telegram support or channel',
      badge: 'Direct Message',
      color: 'hover:border-foreground/40',
      actionLabel: 'Open Telegram',
      link: 'https://t.me/LaxPixelSupport',
      icon: (
        <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .36z" />
        </svg>
      ),
    },
    {
      name: 'Gmail Support',
      subtitle: 'Official Email: nextstep1199@gmail.com',
      badge: 'Official Email',
      color: 'hover:border-foreground/40',
      actionLabel: 'Send Email',
      link: 'mailto:nextstep1199@gmail.com?subject=Customer%20Support%20-%20Lax%20Pixel',
      icon: (
        <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      ),
    },
    {
      name: 'Messenger Support',
      subtitle: 'Direct message us on our Facebook page inbox',
      badge: 'Page Inbox',
      color: 'hover:border-foreground/40',
      actionLabel: 'Open Messenger',
      link: 'https://m.me/laxpixel',
      icon: (
        <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.48 5.43 3.78 7.03V22l3.82-2.1c.78.22 1.6.34 2.4.34 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.09 12.09l-2.67-2.85-5.21 2.85 5.73-6.09 2.67 2.85 5.21-2.85-5.73 6.09z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen py-10 sm:py-16 bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 space-y-12">
        {/* ─── Header ────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="secondary" className="text-[10px] tracking-[0.25em] uppercase px-3 py-1 font-medium">
            Customer Care & Help Center
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-foreground">
            Get Support
          </h1>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Find answers to common questions or reach out directly to our customer care team for assistance and inquiries.
          </p>

          {/* Search Bar for FAQs */}
          <div className="relative max-w-md mx-auto pt-3">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 translate-y-[-50%] text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search your issue (e.g. delivery, exchange, payment)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card/80 border-border text-xs rounded-xl"
            />
          </div>
        </div>

        {/* ─── Support Highlights ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card/60 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">Fast Response Time</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Quick replies during standard support hours</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">Nationwide Delivery</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Direct order tracking and express courier support</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">7-Day Exchange Policy</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Hassle-free, reliable replacement guarantee</p>
            </div>
          </div>
        </div>

        {/* ─── Direct Contact Channels (4 Options) ─────────────── */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-light tracking-tight">Direct Customer Care</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Connect with us instantly through your preferred channel below
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactChannels.map((c, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-border bg-card p-5 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:border-foreground/30"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      {c.icon}
                    </div>
                    <Badge variant="secondary" className="text-[9px] tracking-wider font-medium">
                      {c.badge}
                    </Badge>
                  </div>
                  <h3 className="text-base font-medium text-foreground tracking-tight">{c.name}</h3>
                  <p className="text-xs text-muted-foreground font-light mt-1.5 leading-relaxed">
                    {c.subtitle}
                  </p>
                </div>

                <div className="pt-5 mt-2">
                  <a
                    href={c.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center h-10 px-4 text-xs font-medium rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all gap-2"
                  >
                    {c.actionLabel} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Common Problems & Solutions (FAQ Accordion) ──────── */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-light tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Helpful answers regarding orders, payments, delivery, and returns
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
              No questions match your search query. Please contact us directly via WhatsApp or Gmail.
            </div>
          )}
        </div>

        {/* ─── Direct Shopping Back CTA ───────────────────────── */}
        <div className="text-center pt-6 pb-8">
          <Button
            variant="outline"
            className="text-xs tracking-widest uppercase border-border rounded-xl px-7 h-11 hover:bg-secondary font-medium"
            onClick={() => setView('shop')}
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-2" /> Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
}
