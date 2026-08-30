'use client';

import { useEffect } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { parseUrl } from '@/lib/navigator';
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
import { ContentView } from '@/components/ecommerce/ContentView';
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
        {view === 'content' && <ContentView />}
        {view === 'seller-products' && <SellerDashboard />}
        {view === 'seller-orders' && <SellerDashboard />}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Restore view from URL (used by popstate handler and initial load).
 * Handles fetching product/order data when navigating back to those views.
 */
function restoreViewFromUrl() {
  const { view, params } = parseUrl(window.location.pathname, window.location.search);
  const store = useStore.getState();

  // Sync search query from URL
  if (params.q) store.setSearchQuery(params.q);
  if (params.category) store.setShopCategory(params.category);
  if (params.sort) store.setShopSort(params.sort);

  // Product view — find product from store or fetch
  if (view === 'product' && params.id) {
    const product = store.products.find(p => p.id === params.id);
    if (product) {
      store.setState({ selectedProduct: product, view: 'product' });
    } else if (store.products.length > 0) {
      // Products loaded but not found — go home
      store._setViewDirect('home');
    } else {
      // Products not loaded yet — set view, ProductView will handle missing product
      store.setState({ view: 'product' });
    }
    return;
  }

  // Order detail view — find order from store or fetch
  if (view === 'order-detail' && params.id) {
    const order = store.orders.find(o => o.id === params.id);
    if (order) {
      store.setState({ selectedOrder: order, view: 'order-detail' });
    } else if (store.user) {
      fetch(`/api/tracking?orderId=${params.id}`, { headers: authHeaders(store) })
        .then(r => r.json())
        .then(data => {
          if (data.id) store.setState({ selectedOrder: data, view: 'order-detail' });
          else store._setViewDirect('orders');
        })
        .catch(() => store._setViewDirect('orders'));
    } else {
      store._setViewDirect('orders');
    }
    return;
  }

  store._setViewDirect(view);
}

export default function Page() {
  const { globalLoading, setCategories, setProducts, user } = useStore();

  // ─── Load initial data ────────────────────────────────────
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
    fetch('/api/products').then(r => r.json()).then((products) => {
      setProducts(products);
      // After products are loaded, restore the view from URL
      // (in case it was a product page that needed products to resolve)
      restoreViewFromUrl();
    });
  }, []);

  // ─── Browser history listener (Back / Forward buttons) ────
  useEffect(() => {
    const handlePopState = () => {
      restoreViewFromUrl();
    };

    window.addEventListener('popstate', handlePopState);

    // Ensure the current URL has a proper history state
    // (needed if the page was loaded on `/` without any prior pushState)
    const { pathname } = window.location;
    const isHome = pathname === '/' || pathname === '';

    if (isHome) {
      window.history.replaceState({ view: 'home' }, '', '/');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ─── Load user's cart if logged in ────────────────────────
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
