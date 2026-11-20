'use client';

import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from '@/components/ui/sheet';
import {
  Search, ShoppingBag, User, Menu, Heart, Sparkles, X, ChevronDown, Store, LogOut, Package, Settings, Sun, Moon, ArrowRight, ShieldCheck, Truck, RefreshCw
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const {
    view, setView, user, logout, cartCount, mobileMenuOpen, setMobileMenuOpen,
    searchQuery, setSearchQuery, wishlistIds, sellerProfile, setShopSort, setShopCategory,
  } = useStore();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchOpen]);

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

  const navigateTo = (destination: any, options?: Record<string, string>) => {
    if (options?.sort) setShopSort(options.sort);
    if (options?.category) setShopCategory(options.category);
    setView(destination, options);
  };

  const cc = cartCount();
  const wc = wishlistIds.size;

  const navLinks = [
    { label: 'Home', onClick: () => setView('home'), active: view === 'home' },
    { label: 'Shop', onClick: () => { setShopCategory(''); setShopSort('createdAt'); setView('shop'); }, active: view === 'shop' && !window.location.search.includes('popular') },
    { label: 'New Arrivals', onClick: () => navigateTo('shop', { sort: 'createdAt' }), active: false },
    { label: 'Best Sellers', onClick: () => navigateTo('shop', { sort: 'popular' }), active: false },
    { label: 'Support', onClick: () => setView('support'), active: view === 'support' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* Top Slim Announcement Bar */}
      <div className="bg-[#111111] text-[#FFFFFF] dark:bg-[#000000] dark:text-[#EAEAEA] text-[10px] sm:text-[11px] tracking-[0.16em] uppercase py-1.5 px-4 sm:px-8 border-b border-border/20">
        <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-4 text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="w-3 h-3 text-white" /> Delivery All Over Bangladesh (৳150)
            </span>
            <span className="text-white/40">•</span>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-white" /> 7-Day Easy Exchange Policy
            </span>
          </div>

          <div className="w-full sm:w-auto text-center sm:text-right flex items-center justify-center sm:justify-end gap-3 text-white/90">
            <span className="sm:hidden font-medium">Nationwide Delivery ৳150 • 7-Day Exchange</span>
            <button
              onClick={() => setView('tracking')}
              className="hidden sm:inline-flex items-center gap-1 text-white/80 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Track Order
            </button>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="hidden sm:inline text-white/70 font-mono text-[10px]">BDT (৳)</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className={`transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-xs' : 'bg-background/90 backdrop-blur-sm border-b border-border/60'}`}>
        <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Mobile menu trigger */}
            <div className="lg:hidden flex items-center">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-foreground hover:bg-secondary -ml-2" aria-label="Open menu">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-background border-r border-border p-0 flex flex-col justify-between">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="flex flex-col h-full overflow-y-auto">
                    {/* Drawer Header */}
                    <div className="p-6 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="/White mood.png" alt="Lax Pixel" className="h-8 w-auto object-contain block dark:hidden" />
                        <img src="/Dark mood.png" alt="Lax Pixel" className="h-8 w-auto object-contain hidden dark:block" />
                        <span className="text-base font-light tracking-[0.25em] uppercase">Lax Pixel</span>
                      </div>
                    </div>

                    {/* Nav Items */}
                    <nav className="p-5 space-y-1.5 flex-1">
                      <button
                        onClick={() => { setView('home'); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-md text-xs tracking-[0.15em] uppercase transition-colors ${view === 'home' ? 'bg-foreground text-background font-medium' : 'text-foreground hover:bg-secondary'}`}
                      >
                        Home
                      </button>
                      <button
                        onClick={() => { setShopCategory(''); setShopSort('createdAt'); setView('shop'); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-md text-xs tracking-[0.15em] uppercase transition-colors ${view === 'shop' ? 'bg-foreground text-background font-medium' : 'text-foreground hover:bg-secondary'}`}
                      >
                        All Products / Shop
                      </button>
                      <button
                        onClick={() => { navigateTo('shop', { sort: 'createdAt' }); setMobileMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 rounded-md text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        New Arrivals
                      </button>
                      <button
                        onClick={() => { navigateTo('shop', { sort: 'popular' }); setMobileMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 rounded-md text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        Best Sellers
                      </button>
                      <button
                        onClick={() => { setView('support'); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-md text-xs tracking-[0.15em] uppercase transition-colors ${view === 'support' ? 'bg-foreground text-background font-medium' : 'text-foreground hover:bg-secondary'}`}
                      >
                        Customer Support
                      </button>

                      <div className="pt-3 pb-1 border-t border-border mt-3">
                        <p className="px-4 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-2">My Lax Pixel</p>
                        <button
                          onClick={() => { setView('tracking'); setMobileMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 rounded-md text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3"
                        >
                          <Package className="w-4 h-4 text-foreground" /> Track Order
                        </button>
                        {user ? (
                          <>
                            <button
                              onClick={() => { setView('account'); setMobileMenuOpen(false); }}
                              className="w-full text-left px-4 py-2.5 rounded-md text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3"
                            >
                              <User className="w-4 h-4 text-foreground" /> Account & Profile
                            </button>
                            <button
                              onClick={() => { setView('orders'); setMobileMenuOpen(false); }}
                              className="w-full text-left px-4 py-2.5 rounded-md text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3"
                            >
                              <Package className="w-4 h-4 text-foreground" /> My Orders
                            </button>
                            {user.role === 'SELLER' && (
                              <button
                                onClick={() => { setView('seller-dashboard'); setMobileMenuOpen(false); }}
                                className="w-full text-left px-4 py-2.5 rounded-md text-xs tracking-wider uppercase text-foreground bg-secondary font-medium flex items-center gap-3"
                              >
                                <Store className="w-4 h-4 text-foreground" /> Seller Dashboard
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => { setView('auth'); setMobileMenuOpen(false); }}
                            className="w-full text-left px-4 py-2.5 rounded-md text-xs tracking-wider uppercase text-foreground font-medium hover:bg-secondary flex items-center gap-3"
                          >
                            <User className="w-4 h-4 text-foreground" /> Sign In / Register
                          </button>
                        )}
                      </div>
                    </nav>

                    {/* Drawer Footer */}
                    <div className="p-5 border-t border-border space-y-3 bg-secondary/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Theme Mode</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                          className="h-8 px-3 text-xs gap-2 border-border"
                        >
                          {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                          {theme === 'dark' ? 'Dark' : 'Light'}
                        </Button>
                      </div>
                      {user && (
                        <button
                          onClick={() => { logout(); setMobileMenuOpen(false); }}
                          className="w-full text-center py-2.5 text-xs tracking-wider uppercase text-destructive font-medium border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors"
                        >
                          Sign Out
                        </button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Brand Logo */}
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-3 group focus:outline-none"
              aria-label="Lax Pixel Home"
            >
              <div className="h-9 sm:h-11 flex items-center justify-center transition-transform duration-300 group-hover:scale-102">
                <img src="/White mood.png" alt="Lax Pixel" className="h-9 sm:h-11 w-auto object-contain block dark:hidden" />
                <img src="/Dark mood.png" alt="Lax Pixel" className="h-9 sm:h-11 w-auto object-contain hidden dark:block" />
              </div>
              <span className="text-base sm:text-xl font-light tracking-[0.28em] uppercase hidden sm:block text-foreground">
                Lax Pixel
              </span>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7 xl:gap-9">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={link.onClick}
                  className={`text-xs tracking-[0.18em] uppercase transition-colors relative py-1 ${
                    link.active
                      ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px] after:bg-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </button>
              ))}

              {user?.role === 'SELLER' && (
                <button
                  onClick={() => setView('seller-dashboard')}
                  className={`text-xs tracking-[0.18em] uppercase transition-colors flex items-center gap-1.5 py-1 ${
                    view === 'seller-dashboard' || view === 'seller-products' || view === 'seller-orders'
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" /> Seller
                </button>
              )}
            </nav>

            {/* Search Input - Desktop */}
            <div className={`hidden md:flex items-center transition-all duration-300 ${searchFocused ? 'w-72 lg:w-96' : 'w-48 lg:w-64'}`}>
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search products..."
                  className="pl-9 pr-8 h-9 bg-secondary/80 border-border rounded-full text-xs tracking-wide focus:bg-background focus:border-foreground/40 transition-all placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </form>
            </div>

            {/* Quick Actions (Right Icons) */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile Search Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="md:hidden text-foreground hover:bg-secondary"
                aria-label="Toggle search"
              >
                {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-foreground hover:bg-secondary hidden sm:inline-flex"
                title="Toggle theme"
              >
                <Sun className="w-4 h-4 dark:hidden" />
                <Moon className="w-4 h-4 hidden dark:block" />
              </Button>

              {/* Track Order Icon */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView('tracking')}
                className="text-foreground hover:bg-secondary relative hidden sm:inline-flex"
                title="Track Order"
              >
                <Package className="w-4.5 h-4.5" />
              </Button>

              {/* Wishlist Icon */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (user ? setView('account') : setView('auth'))}
                className="text-foreground hover:bg-secondary relative"
                title="Wishlist"
              >
                <Heart className="w-4.5 h-4.5" />
                {wc > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-bold">
                    {wc}
                  </span>
                )}
              </Button>

              {/* Shopping Bag Icon */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView('cart')}
                className="text-foreground hover:bg-secondary relative"
                title="Shopping Bag"
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                {cc > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-bold">
                    {cc}
                  </span>
                )}
              </Button>

              {/* Account Dropdown / Sign In Trigger */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="text-foreground hover:bg-secondary ml-1"
                    aria-label="User menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-lg shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] tracking-widest uppercase rounded bg-secondary text-foreground font-semibold border border-border">
                          {user.role}
                        </span>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => { setView('account'); setUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3 transition-colors"
                        >
                          <User className="w-4 h-4" /> Account & Profile
                        </button>
                        <button
                          onClick={() => { setView('orders'); setUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3 transition-colors"
                        >
                          <Package className="w-4 h-4" /> My Orders
                        </button>
                        {user.role === 'SELLER' && (
                          <button
                            onClick={() => { setView('seller-dashboard'); setUserMenuOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-xs tracking-wider uppercase text-foreground font-semibold hover:bg-secondary flex items-center gap-3 transition-colors"
                          >
                            <Store className="w-4 h-4" /> Seller Dashboard
                          </button>
                        )}
                        <button
                          onClick={() => { setView('tracking'); setUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-3 transition-colors"
                        >
                          <Package className="w-4 h-4" /> Track Order
                        </button>
                      </div>
                      <div className="border-t border-border pt-1">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs tracking-wider uppercase text-destructive hover:bg-destructive/10 flex items-center gap-3 transition-colors font-medium"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setView('auth')}
                  className="hidden sm:inline-flex h-9 px-4 text-xs tracking-[0.16em] uppercase rounded-md border-border hover:bg-foreground hover:text-background transition-all font-medium"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search Input Drawer */}
          {mobileSearchOpen && (
            <div className="md:hidden pb-3.5 pt-1 border-t border-border/40 animate-in slide-in-from-top-2 duration-200">
              <form
                onSubmit={(e) => {
                  handleSearch(e);
                  setMobileSearchOpen(false);
                }}
                className="relative w-full"
              >
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={mobileSearchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search luxury products, fashion..."
                  className="pl-10 pr-10 h-10 bg-secondary/80 border-border rounded-md text-xs tracking-wide focus:bg-background"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
