'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Lock, CreditCard, Truck, Upload, X, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentMethod {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  proofRequired: string | null;
  instructions: string | null;
  active: boolean;
  sortOrder: number;
}

export function CheckoutView() {
  const { cart, user, setView, showToast, setOrders, setCart } = useStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [step, setStep] = useState<'checkout' | 'payment' | 'success'>('checkout');
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    shippingAddress: user?.address || '',
    shippingCity: user?.city || '',
    shippingCountry: user?.country || '',
    shippingZip: user?.zipCode || '',
  });

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal > 2000 ? 0 : 50;
  const tax = subtotal * 0.01;
  const total = subtotal + shipping + tax;

  useEffect(() => {
    fetch('/api/payment-methods').then(r => r.json()).then(d => {
      if (d.methods) setPaymentMethods(d.methods);
    });
  }, []);

  const isCod = selectedMethod?.name === 'Cash on Delivery' || selectedMethod?.name === 'COD';
  const needsProof = selectedMethod?.proofRequired && !isCod;

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const goToPayment = () => {
    if (!form.shippingAddress || !form.shippingCity || !form.shippingCountry) {
      showToast('Please fill in all required shipping fields', 'error'); return;
    }
    if (!selectedMethod) { showToast('Please select a payment method', 'error'); return; }
    setStep('payment');
  };

  const confirmOrder = async () => {
    if (needsProof && !proofPreview) {
      showToast('Please upload payment proof', 'error'); return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        items: cart.map(i => ({ productId: i.productId, productName: i.product.name, productImage: safeImgSrc(i.product.image), price: i.product.price, quantity: i.quantity })),
        ...form,
        paymentMethodId: selectedMethod?.id,
        paymentMethod: selectedMethod?.name,
      };

      if (needsProof && proofPreview) {
        body.paymentProofImage = proofPreview;
      }

      const res = await fetch('/api/orders', {
        method: 'POST', headers: authHeaders(useStore.getState),
        body: JSON.stringify(body),
      });
      const order = await res.json();
      if (order.error) { showToast(order.error, 'error'); return; }
      if (order.id) {
        setCreatedOrder(order);
        setStep('success');
        setCart([]);
        fetch('/api/orders', { headers: authHeaders(useStore.getState) }).then(r => r.json()).then(setOrders);
        showToast('Order placed successfully!');
      }
    } catch {
      showToast('Failed to place order', 'error');
    }
    setLoading(false);
  };

  if (cart.length === 0 && !loading && step !== 'success') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-light">No items to checkout</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('shop')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 'success' && createdOrder) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-light tracking-tight mb-2">Order Placed!</h1>
          <p className="text-sm text-muted-foreground mb-6">Your order has been {needsProof ? 'submitted for payment verification' : 'confirmed'}.</p>
          <div className="p-4 rounded-xl bg-secondary border border-border space-y-2 text-left mb-6">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Order Number</span><span>{createdOrder.orderNumber}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tracking Code</span><span className="font-mono tracking-wider">{createdOrder.trackingCode}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span>${createdOrder.totalAmount?.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payment</span><span>{createdOrder.paymentMethod}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant="outline" className="text-[10px]">{createdOrder.paymentStatus}</Badge></div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-border text-xs tracking-wider" onClick={() => setView('orders')}>View Orders</Button>
            <Button className="flex-1 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('shop')}>Continue Shopping</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Payment proof screen
  if (step === 'payment') {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <button onClick={() => setStep('checkout')} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
            <Truck className="w-3.5 h-3.5 rotate-180" /> Back to Shipping
          </button>

          <h1 className="text-3xl font-light tracking-tight mb-2">Payment</h1>
          <p className="text-sm text-muted-foreground mb-8">
            {isCod ? 'Pay when your order is delivered.' : `Complete your payment using ${selectedMethod?.name}.`}
          </p>

          {/* Payment method details */}
          <div className="p-6 rounded-xl bg-secondary border border-border mb-6">
            <div className="flex items-center gap-3 mb-4">
              {selectedMethod?.icon && <span className="text-2xl">{selectedMethod.icon}</span>}
              <div>
                <h3 className="text-sm font-medium">{selectedMethod?.name}</h3>
                {selectedMethod?.description && <p className="text-xs text-muted-foreground">{selectedMethod.description}</p>}
              </div>
            </div>
            {selectedMethod?.instructions && (
              <div className="p-3 rounded-lg bg-background border border-border text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{selectedMethod.instructions}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment proof upload (not for COD) */}
          {needsProof && (
            <div className="p-6 rounded-xl bg-secondary border border-border mb-6">
              <h3 className="text-sm font-medium tracking-wide mb-1">Upload Payment Proof</h3>
              <p className="text-[10px] text-muted-foreground mb-4">Upload a screenshot or receipt of your {selectedMethod?.name} transaction.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProofChange} />
              {proofPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={proofPreview} alt="Payment proof" className="w-full max-h-64 object-contain bg-background" />
                  <button onClick={() => { setProofPreview(null); setProofFile(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 hover:border-muted-foreground transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Click to upload screenshot or receipt</p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</p>
                </button>
              )}
            </div>
          )}

          {/* Order summary on payment page */}
          <div className="p-4 rounded-xl bg-secondary border border-border mb-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping}`}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${tax.toFixed(2)}</span></div>
            <Separator className="bg-secondary" />
            <div className="flex justify-between text-lg font-light"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <Button className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90" onClick={confirmOrder} disabled={Boolean(loading || (needsProof && !proofPreview))}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCod ? 'Confirm Order' : 'Submit & Confirm Order'}
          </Button>
        </div>
      </div>
    );
  }

  // Main checkout (shipping + payment method selection)
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

            {/* Payment Method Selection */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4" />
                <h2 className="text-sm font-medium tracking-wide">Payment Method</h2>
              </div>
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payment methods available.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {paymentMethods.map(m => {
                    const isCodMethod = m.name === 'Cash on Delivery' || m.name === 'COD';
                    const isSelected = selectedMethod?.id === m.id;
                    return (
                      <button key={m.id} onClick={() => setSelectedMethod(m)}
                        className={`p-3 rounded-lg border text-center transition-all ${isSelected ? 'border-foreground bg-secondary' : 'border-border hover:border'}`}>
                        {m.icon && <span className="text-xl block mb-1">{m.icon}</span>}
                        <p className="text-[10px] tracking-wider leading-tight">{m.name}</p>
                        {isCodMethod && <p className="text-[9px] text-muted-foreground mt-1">No proof needed</p>}
                        {m.proofRequired && !isCodMethod && <p className="text-[9px] text-muted-foreground mt-1">Proof required</p>}
                      </button>
                    );
                  })}
                </div>
              )}
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
              <Button className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90" onClick={goToPayment}>
                Continue to Payment <Lock className="w-3.5 h-3.5 ml-2" />
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">Secured with 256-bit encryption</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
