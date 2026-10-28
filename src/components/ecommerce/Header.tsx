'use client';

import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from '@/components/ui/sheet';
import {
  Search, ShoppingBag, User, Menu, Heart, Sparkles, X, ChevronDown, Store, LogOut, Package, Settings, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const {
    view, setView, user, logout, cartCount, mobileMenuOpen, setMobileMenuOpen,
    searchQuery, setSearchQuery, wishlistIds, sellerProfile,
  } = useStore();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setView('shop', { q: searchQuery.trim() });
    }
  };

  const cc = cartCount();
  const wc = wishlistIds.size;

  const navLinks = [
    { label: 'Home', view: 'home' as const },
    { label: 'Shop', view: 'shop' as const },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-border' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-secondary"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-background border-r border-border p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-border flex items-center gap-3">
                    <img src="/White mood.png" alt="Lax Pixel" className="w-8 h-8 object-contain block dark:hidden" />
                    <img src="/Dark mood.png" alt="Lax Pixel" className="w-8 h-8 object-contain hidden dark:block" />
                    <h2 className="text-lg font-light tracking-widest">Lax Pixel</h2>
                  </div>
                  <nav className="flex-1 p-4 space-y-1">
                    {navLinks.map(l => (
                      <button key={l.view} onClick={() => { setView(l.view); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm tracking-wide transition-colors ${view === l.view ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                        {l.label}
                      </button>
                    ))}
                    {user?.role === 'SELLER' && (
                      <button onClick={() => { setView('seller-dashboard'); setMobileMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 rounded-lg text-sm tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3">
                        <Store className="w-4 h-4" /> Seller Dashboard
                      </button>
                    )}
                    {user && (
                      <button onClick={() => { setView('orders'); setMobileMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 rounded-lg text-sm tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3">
                        <Package className="w-4 h-4" /> My Orders
                      </button>
                    )}
                  </nav>
                  <div className="p-4 border-t border-border">
                    <button onClick={() => { setView('tracking'); setMobileMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3">
                      <Search className="w-4 h-4" /> Track Order
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo */}
          <button onClick={() => setView('home')} className="flex items-center gap-3 group">
            <div className="w-9 h-9 relative flex items-center justify-center transition-all duration-300">
              <img src="/White mood.png" alt="Lax Pixel" className="w-9 h-9 object-contain block dark:hidden" />
              <img src="/Dark mood.png" alt="Lax Pixel" className="w-9 h-9 object-contain hidden dark:block" />
            </div>
            <span className="text-lg sm:text-xl font-extralight tracking-[0.3em] hidden sm:block">Lax Pixel</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map(l => (
              <button key={l.view} onClick={() => setView(l.view)}
                className={`text-xs tracking-[0.2em] uppercase transition-colors duration-200 ${view === l.view ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {l.label}
              </button>
            ))}
            {user?.role === 'SELLER' && (
              <button onClick={() => setView('seller-dashboard')}
                className={`text-xs tracking-[0.2em] uppercase transition-colors duration-200 flex items-center gap-1.5 ${view === 'seller-dashboard' || view === 'seller-products' || view === 'seller-orders' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Store className="w-3.5 h-3.5" /> Seller
              </button>
            )}
          </nav>

          {/* Search - Desktop */}
          <div className={`hidden md:flex items-center transition-all duration-300 ${searchFocused ? 'w-72' : 'w-48'}`}>
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search..."
                className="pl-9 pr-4 h-9 bg-secondary border-border rounded-full text-xs tracking-wide focus:bg-muted focus:border"
              />
            </form>
          </div>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-foreground hover:bg-secondary" title="Toggle theme">
            <Sun className="w-4 h-4 dark:hidden" />
            <Moon className="w-4 h-4 hidden dark:block" />
          </Button>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={() => setView('tracking')} className="text-foreground hover:bg-secondary relative" title="Track Order">
              <Package className="w-4.5 h-4.5" />
            </Button>

            {user && (
              <Button variant="ghost" size="icon" onClick={() => setView('account')} className="text-foreground hover:bg-secondary relative">
                <Heart className="w-4.5 h-4.5" />
                {wc > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-medium">{wc}</span>}
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={() => setView('cart')} className="text-foreground hover:bg-secondary relative">
              <ShoppingBag className="w-4.5 h-4.5" />
              {cc > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-medium">{cc}</span>}
            </Button>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <Button variant="ghost" size="icon" onClick={() => setUserMenuOpen(!userMenuOpen)} className="text-foreground hover:bg-secondary">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </Button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-2xl py-2 animate-fade-in">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] tracking-wider uppercase rounded bg-muted text-muted-foreground">{user.role}</span>
                    </div>
                    <button onClick={() => { setView('account'); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3">
                      <User className="w-4 h-4" /> Account
                    </button>
                    <button onClick={() => { setView('orders'); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3">
                      <Package className="w-4 h-4" /> My Orders
                    </button>
                    {user.role === 'SELLER' && (
                      <button onClick={() => { setView('seller-dashboard'); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3">
                        <Store className="w-4 h-4" /> Seller Dashboard
                      </button>
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      <button onClick={() => { logout(); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-secondary flex items-center gap-3">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setView('auth')} className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
