'use client';

import { useStore } from '@/lib/store';
import { Sparkles, Facebook, Instagram, Youtube, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '1234567890'; // Replace with actual number

function SocialIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-200"
    >
      {children}
    </a>
  );
}

export function Footer() {
  const { setView } = useStore();

  const shopLinks = [
    { label: 'All Products', sort: 'createdAt' },
    { label: 'New Arrivals', sort: 'createdAt' },
    { label: 'Bestsellers', sort: 'popular' },
    { label: 'Sale', sort: 'discount' },
  ];

  const supportLinks = [
    { label: 'Track Order', action: () => setView('tracking') },
    { label: 'Contact', action: () => setView('content', { slug: 'contact' }) },
    { label: 'FAQ', action: () => setView('content', { slug: 'faq' }) },
    { label: 'Returns', action: () => setView('content', { slug: 'returns' }) },
  ];

  const companyLinks = [
    { label: 'About Lax Pixel', slug: 'about' },
    { label: 'Become a Seller', action: () => setView('auth') },
    { label: 'Privacy Policy', slug: 'privacy' },
    { label: 'Terms of Service', slug: 'terms' },
  ];

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 flex items-center justify-center">
                <img src="/White mood.png" alt="Lax Pixel" className="h-9 w-auto object-contain block dark:hidden" />
                <img src="/Dark mood.png" alt="Lax Pixel" className="h-9 w-auto object-contain hidden dark:block" />
              </div>
              <span className="text-sm font-extralight tracking-[0.3em]">Lax Pixel</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5">
              AI-powered luxury ecommerce. Curated collections and intelligent shopping.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-2">
              <SocialIcon href="https://facebook.com/laxpixel">
                <Facebook className="w-3.5 h-3.5" />
              </SocialIcon>
              <SocialIcon href="https://instagram.com/laxpixel">
                <Instagram className="w-3.5 h-3.5" />
              </SocialIcon>
              <SocialIcon href="https://youtube.com/@laxpixel">
                <Youtube className="w-3.5 h-3.5" />
              </SocialIcon>
              <SocialIcon href="https://tiktok.com/@laxpixel">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.28 8.28 0 0 0 4.76 1.5v-3.4a4.85 4.85 0 0 1-1-.28z"/></svg>
              </SocialIcon>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-medium mb-4">Shop</h4>
            <div className="space-y-2.5">
              {shopLinks.map(l => (
                <button
                  key={l.label}
                  onClick={() => setView('shop', { sort: l.sort })}
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-medium mb-4">Support</h4>
            <div className="space-y-2.5">
              {supportLinks.map(l => (
                <button
                  key={l.label}
                  onClick={l.action}
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </button>
              ))}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-medium mb-4">Company</h4>
            <div className="space-y-2.5">
              {companyLinks.map(l => (
                <button
                  key={l.label}
                  onClick={() => l.action ? l.action() : setView('content', { slug: l.slug! })}
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground">© 2025 Lax Pixel. All rights reserved.</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            Powered by <Sparkles className="w-3 h-3" /> AI Intelligence
          </p>
        </div>
      </div>
    </footer>
  );
}
