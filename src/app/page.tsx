'use client';

import { useEffect } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Header } from '@/components/ecommerce/Header';
import { HomeView } from '@/components/ecommerce/HomeView';
import { ShopView } from '@/components/ecommerce/ShopView';
import { ProductView } from '@/components/ecommerce/ProductView';
import { CartView } from '@/components/ecommerce/CartView';
import { CheckoutView } from '@/components/ecommerce/CheckoutView';
import { OrdersView, OrderDetailView } from '@/components/ecommerce/OrdersView';
import { AuthView } from '@/components/ecommerce/AuthView';
import { TrackingView } from '@/components/ecommerce/TrackingView';
import { AccountView } from '@/components/ecommerce/AccountView';
import { SellerDashboard } from '@/components/ecommerce/SellerDashboard';
import { AIChat } from '@/components/ecommerce/AIChat';
import { Footer } from '@/components/ecommerce/Footer';
import { Toast } from '@/components/ecommerce/Toast';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ViewRouter() {
  const { view } = useStore();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
        {view === 'home' && <HomeView />}
        {view === 'shop' && <ShopView />}
        {view === 'product' && <ProductView />}
        {view === 'cart' && <CartView />}
        {view === 'checkout' && <CheckoutView />}
        {view === 'orders' && <OrdersView />}
        {view === 'order-detail' && <OrderDetailView />}
        {view === 'auth' && <AuthView />}
        {view === 'tracking' && <TrackingView />}
        {view === 'account' && <AccountView />}
        {view === 'seller-dashboard' && <SellerDashboard />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function Page() {
  const { globalLoading, setCategories, setProducts, user } = useStore();

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  // Load user's cart if logged in
  useEffect(() => {
    if (!user) return;
    const loadUserCart = async () => {
      try {
        const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
        useStore.getState().setCart(await res.json());
        const wRes = await fetch('/api/wishlist', { headers: authHeaders(useStore.getState) });
        const wItems = await wRes.json();
        useStore.getState().setWishlist(wItems.map((w: any) => w.productId));
      } catch {}
    };
    loadUserCart();
  }, [user?.id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {globalLoading && (
          <div className="fixed inset-0 z-40 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        <ViewRouter />
      </main>
      <Footer />
      <AIChat />
      <Toast />
    </div>
  );
}
