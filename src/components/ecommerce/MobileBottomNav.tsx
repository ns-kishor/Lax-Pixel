'use client';

import { useStore } from '@/lib/store';
import { Home, Compass, ShoppingBag, Heart, User, Store } from 'lucide-react';
import { motion } from 'framer-motion';

export function MobileBottomNav() {
  const { view, setView, user, cartCount, wishlistIds } = useStore();

  // If in admin views or checkout view, hide mobile bottom nav for distraction-free checkout
  if (view === 'admin' || view === 'admin-login' || view === 'checkout') {
    return null;
  }

  const cc = cartCount();
  const wc = wishlistIds.size;

  const isHome = view === 'home';
  const isShop = view === 'shop' || view === 'seller-store';
  const isCart = view === 'cart';
  const isWishlist = view === 'account' && false; // Or dedicated saved tab
  const isAccount = view === 'account' || view === 'auth' || view === 'orders' || view === 'seller-dashboard';

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/90 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] transition-all duration-300 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => setView('home')}
          className="flex flex-col items-center justify-center h-full w-full relative transition-all active:scale-95"
          aria-label="Home"
        >
          <div className="relative">
            <Home
              className={`w-5 h-5 transition-colors ${
                isHome ? 'text-foreground stroke-[2.5]' : 'text-muted-foreground stroke-[1.8]'
              }`}
            />
          </div>
          <span
            className={`text-[10px] tracking-wide mt-1 transition-colors ${
              isHome ? 'font-semibold text-foreground' : 'text-muted-foreground font-normal'
            }`}
          >
            Home
          </span>
          {isHome && (
            <motion.div
              layoutId="mobileNavIndicator"
              className="absolute top-1 w-5 h-0.5 rounded-full bg-foreground"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </button>

        {/* 2. Shop / Explore */}
        <button
          type="button"
          onClick={() => {
            useStore.getState().setShopCategory('');
            useStore.getState().setSearchQuery('');
            setView('shop');
          }}
          className="flex flex-col items-center justify-center h-full w-full relative transition-all active:scale-95"
          aria-label="Shop"
        >
          <div className="relative">
            <Compass
              className={`w-5 h-5 transition-colors ${
                isShop ? 'text-foreground stroke-[2.5]' : 'text-muted-foreground stroke-[1.8]'
              }`}
            />
          </div>
          <span
            className={`text-[10px] tracking-wide mt-1 transition-colors ${
              isShop ? 'font-semibold text-foreground' : 'text-muted-foreground font-normal'
            }`}
          >
            Shop
          </span>
          {isShop && (
            <motion.div
              layoutId="mobileNavIndicator"
              className="absolute top-1 w-5 h-0.5 rounded-full bg-foreground"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </button>

        {/* 3. Shopping Bag / Cart */}
        <button
          type="button"
          onClick={() => setView('cart')}
          className="flex flex-col items-center justify-center h-full w-full relative transition-all active:scale-95"
          aria-label="Cart"
        >
          <div className="relative">
            <ShoppingBag
              className={`w-5 h-5 transition-colors ${
                isCart ? 'text-foreground stroke-[2.5]' : 'text-muted-foreground stroke-[1.8]'
              }`}
            />
            {cc > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center shadow-xs">
                {cc > 99 ? '99+' : cc}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] tracking-wide mt-1 transition-colors ${
              isCart ? 'font-semibold text-foreground' : 'text-muted-foreground font-normal'
            }`}
          >
            Bag
          </span>
          {isCart && (
            <motion.div
              layoutId="mobileNavIndicator"
              className="absolute top-1 w-5 h-0.5 rounded-full bg-foreground"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </button>

        {/* 4. Wishlist / Saved */}
        <button
          type="button"
          onClick={() => {
            if (!user) {
              setView('auth');
            } else {
              setView('account');
            }
          }}
          className="flex flex-col items-center justify-center h-full w-full relative transition-all active:scale-95"
          aria-label="Wishlist"
        >
          <div className="relative">
            <Heart
              className={`w-5 h-5 transition-colors ${
                wc > 0 ? 'text-foreground stroke-[2.5]' : 'text-muted-foreground stroke-[1.8]'
              }`}
            />
            {wc > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-foreground text-background text-[9px] font-semibold flex items-center justify-center shadow-xs">
                {wc}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] tracking-wide mt-1 transition-colors ${
              wc > 0 ? 'text-foreground font-medium' : 'text-muted-foreground font-normal'
            }`}
          >
            Saved
          </span>
        </button>

        {/* 5. Account / Profile */}
        <button
          type="button"
          onClick={() => {
            if (!user) {
              setView('auth');
            } else {
              setView('account');
            }
          }}
          className="flex flex-col items-center justify-center h-full w-full relative transition-all active:scale-95"
          aria-label="Account"
        >
          <div className="relative">
            {user ? (
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-semibold transition-colors ${
                  isAccount
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-secondary text-foreground'
                }`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User
                className={`w-5 h-5 transition-colors ${
                  isAccount ? 'text-foreground stroke-[2.5]' : 'text-muted-foreground stroke-[1.8]'
                }`}
              />
            )}
          </div>
          <span
            className={`text-[10px] tracking-wide mt-1 transition-colors truncate max-w-[50px] ${
              isAccount ? 'font-semibold text-foreground' : 'text-muted-foreground font-normal'
            }`}
          >
            {user ? (user.role === 'SELLER' ? 'Seller' : 'Account') : 'Sign In'}
          </span>
          {isAccount && (
            <motion.div
              layoutId="mobileNavIndicator"
              className="absolute top-1 w-5 h-0.5 rounded-full bg-foreground"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </button>
      </div>
    </nav>
  );
}
