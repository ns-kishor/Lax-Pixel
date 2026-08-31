'use client';

import { useEffect } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, X, ShoppingBag, ArrowRight, Trash2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function CartView() {
  const { cart, setCart, user, setView, showToast, setGlobalLoading } = useStore();

  useEffect(() => {
    if (!user) return;
    fetch('/api/cart', { headers: authHeaders(useStore.getState) }).then(r => r.json()).then(setCart);
  }, [user?.id]);

  const updateQty = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await fetch(`/api/cart?productId=${productId}`, { method: 'DELETE', headers: authHeaders(useStore.getState) });
    } else {
      await fetch('/api/cart', { method: 'PUT', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId, quantity }) });
    }
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    setCart(await res.json());
  };

  const clearCart = async () => {
    await fetch('/api/cart', { method: 'DELETE', headers: authHeaders(useStore.getState) });
    setCart([]);
    showToast('Cart cleared', 'info');
  };

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal > 2000 ? 0 : 50;
  const tax = subtotal * 0.01;
  const total = subtotal + shipping + tax;

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Sign in to view your bag</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Your bag is empty</p>
          <p className="text-sm text-muted-foreground mt-1">Discover our curated collections</p>
          <Button className="mt-6 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('shop')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-light tracking-tight">Shopping Bag ({cart.length})</h1>
          <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={clearCart}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div key={item.id} layout exit={{ opacity: 0, x: -20 }} className="flex gap-4 p-4 rounded-xl bg-secondary border border-border">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-background shrink-0 relative">
                    <Image src={safeImgSrc(item.product.image)} alt={item.product.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{item.product.category?.name}</p>
                        <h3 className="text-sm font-medium tracking-wide mt-0.5 cursor-pointer hover:text-gradient" onClick={() => useStore.getState().selectProduct(item.product)}>{item.product.name}</h3>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => updateQty(item.productId, 0)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm font-light mt-2">${(item.product.price * item.quantity).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex items-center border border-border rounded-lg">
                        <button className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-l-lg" onClick={() => updateQty(item.productId, item.quantity - 1)}><Minus className="w-3 h-3" /></button>
                        <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                        <button className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-r-lg" onClick={() => updateQty(item.productId, item.quantity + 1)}><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-xl bg-secondary border border-border space-y-4">
              <h3 className="text-sm font-medium tracking-wide">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? <span className="text-green-400">Free</span> : `$${shipping}`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
              <Separator className="bg-secondary" />
              <div className="flex justify-between text-lg font-light"><span>Total</span><span>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              {shipping > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary text-[10px] text-muted-foreground">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>Add ${(2000 - subtotal).toLocaleString()} more for free express shipping</span>
                </div>
              )}
              <Button className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90" onClick={() => setView('checkout')}>
                Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
