'use client';

import { useStore } from '@/lib/store';
import { Facebook, Instagram, Youtube, MessageCircle, ShieldCheck, Truck, ArrowRight, Store, Package, HelpCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '8801402585503'; // Verified support line

function SocialIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-all duration-200"
    >
      {children}
    </a>
  );
}

export function Footer() {
  const { setView } = useStore();

  return (
    <footer className="border-t border-border mt-auto bg-card text-foreground">
      {/* Top Value Strip */}
      <div className="border-b border-border bg-secondary/30 py-6">
        <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-foreground stroke-[1.8] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Nationwide Delivery</p>
              <p className="text-[11px] text-muted-foreground">Across all 64 districts (৳150)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-foreground stroke-[1.8] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">100% Authentic</p>
              <p className="text-[11px] text-muted-foreground">Curated quality pieces</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-foreground stroke-[1.8] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">7-Day Exchange</p>
              <p className="text-[11px] text-muted-foreground">Hassle-free replacement</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-foreground stroke-[1.8] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Multi-Vendor Market</p>
              <p className="text-[11px] text-muted-foreground">Verified trusted merchants</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 xl:gap-12">
          {/* Brand Pillar */}
          <div className="col-span-2 md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 flex items-center justify-center">
                <img src="/White mood.png" alt="Lax Pixel" className="h-9 w-auto object-contain block dark:hidden" />
                <img src="/Dark mood.png" alt="Lax Pixel" className="h-9 w-auto object-contain hidden dark:block" />
              </div>
              <span className="text-base font-light tracking-[0.25em] uppercase text-foreground">Lax Pixel</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-light max-w-sm">
              Lax Pixel is Bangladesh&apos;s premier fashion & lifestyle marketplace. Connecting discerning shoppers with curated collections from top verified merchants.
            </p>
            <div className="pt-1">
              <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-foreground mb-2.5">Follow Us</p>
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
          </div>

          {/* Shop Pillar */}
          <div>
            <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-foreground mb-4">Shop</h4>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <button onClick={() => { useStore.getState().setShopCategory(''); setView('shop'); }} className="block hover:text-foreground transition-colors">
                All Products
              </button>
              <button onClick={() => { useStore.getState().setShopCategory(''); useStore.getState().setShopSort('createdAt'); setView('shop', { sort: 'createdAt' }); }} className="block hover:text-foreground transition-colors">
                New Arrivals
              </button>
              <button onClick={() => { useStore.getState().setShopCategory(''); useStore.getState().setShopSort('popular'); setView('shop', { sort: 'popular' }); }} className="block hover:text-foreground transition-colors">
                Best Sellers
              </button>
              <button onClick={() => setView('shop')} className="block hover:text-foreground transition-colors">
                Curated Collections
              </button>
            </div>
          </div>

          {/* Customer Support Pillar */}
          <div>
            <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-foreground mb-4">Support</h4>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <button onClick={() => setView('tracking')} className="block hover:text-foreground transition-colors">
                Track Order
              </button>
              <button onClick={() => setView('content', { slug: 'returns' })} className="block hover:text-foreground transition-colors">
                Returns & Exchange
              </button>
              <button onClick={() => setView('support')} className="block hover:text-foreground transition-colors">
                Support Center
              </button>
              <button onClick={() => setView('content', { slug: 'faq' })} className="block hover:text-foreground transition-colors">
                FAQ
              </button>
              <button onClick={() => setView('content', { slug: 'contact' })} className="block hover:text-foreground transition-colors">
                Contact Us
              </button>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp Support
              </a>
            </div>
          </div>

          {/* Sellers & Policies Pillar */}
          <div>
            <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-foreground mb-4">Marketplace</h4>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <button onClick={() => setView('auth')} className="block hover:text-foreground transition-colors font-medium text-foreground">
                Become a Seller
              </button>
              <button onClick={() => setView('auth')} className="block hover:text-foreground transition-colors">
                Seller Login
              </button>
              <button onClick={() => setView('content', { slug: 'about' })} className="block hover:text-foreground transition-colors">
                About Lax Pixel
              </button>
              <button onClick={() => setView('content', { slug: 'privacy' })} className="block hover:text-foreground transition-colors">
                Privacy Policy
              </button>
              <button onClick={() => setView('content', { slug: 'terms' })} className="block hover:text-foreground transition-colors">
                Terms of Service
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Lax Pixel. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px]">bKash • Nagad • Rocket • Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
