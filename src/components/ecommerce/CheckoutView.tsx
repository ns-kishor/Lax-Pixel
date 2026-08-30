'use client';

import { useState } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Check, Lock, CreditCard, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

export function CheckoutView() {
  const { cart, user, setView, showToast, setOrders, setCart } = useStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shippingAddress: user?.address || '',
    shippingCity: user?.city || '',
    shippingCountry: user?.country || '',
    shippingZip: user?.zipCode || '',
    paymentMethod: 'CREDIT_CARD',
  });

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal > 2000 ? 0 : 50;
  const tax = subtotal * 0.01;
  const total = subtotal + shipping + tax;

  const placeOrder = async () => {
    if (!form.shippingAddress || !form.shippingCity || !form.shippingCountry) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: authHeaders(useStore.getState),
        body: JSON.stringify({ items: cart.map(i => ({ productId: i.productId, productName: i.product.name, productImage: i.product.image, price: i.product.price, quantity: i.quantity })), ...form }),
      });
      const order = await res.json();
      if (order.id) {
        setCart([]);
        setView('orders');
        showToast('Order placed successfully!');
        fetch('/api/orders', { headers: authHeaders(useStore.getState) }).then(r => r.json()).then(setOrders);
      }
    } catch {
      showToast('Failed to place order', 'error');
    }
    setLoading(false);
  };

  if (cart.length === 0 && !loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-light">No items to checkout</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('shop')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-light tracking-tight mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Shipping */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 mb-5">
                <Truck className="w-4 h-4" />
                <h2 className="text-sm font-medium tracking-wide">Shipping Address</h2>
              </div>
              <div className="space-y-4">
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Address *</Label><Input value={form.shippingAddress} onChange={e => setForm({ ...form, shippingAddress: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" placeholder="Street address" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City *</Label><Input value={form.shippingCity} onChange={e => setForm({ ...form, shippingCity: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                  <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">ZIP Code</Label><Input value={form.shippingZip} onChange={e => setForm({ ...form, shippingZip: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
                </div>
                <div><Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country *</Label><Input value={form.shippingCountry} onChange={e => setForm({ ...form, shippingCountry: e.target.value })} className="mt-1.5 h-10 bg-secondary border-border text-sm" /></div>
              </div>
            </motion.div>

            {/* Payment */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4" />
                <h2 className="text-sm font-medium tracking-wide">Payment</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER'].map(m => (
                  <button key={m} onClick={() => setForm({ ...form, paymentMethod: m })}
                    className={`p-3 rounded-lg border text-center text-[10px] tracking-wider transition-colors ${form.paymentMethod === m ? 'border-foreground bg-secondary' : 'border-border hover:border'}`}>
                    {m.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 p-6 rounded-xl bg-secondary border border-border space-y-4">
              <h3 className="text-sm font-medium tracking-wide">Order Summary</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{item.product.name} x{item.quantity}</span>
                    <span className="shrink-0">${(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator className="bg-secondary" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping}`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${tax.toFixed(2)}</span></div>
              </div>
              <Separator className="bg-secondary" />
              <div className="flex justify-between text-lg font-light"><span>Total</span><span>${total.toFixed(2)}</span></div>
              <Button className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90" onClick={placeOrder} disabled={loading}>
                {loading ? 'Processing...' : <><Lock className="w-3.5 h-3.5 mr-2" /> Place Order</>}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">Secured with 256-bit encryption</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
