'use client';

import { useState, useEffect } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Lock, CreditCard, Truck, Info, CheckCircle2, Loader2, LogIn, Phone, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [step, setStep] = useState<'checkout' | 'payment' | 'success'>('checkout');
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  const [form, setForm] = useState({
    phone: user?.phone || '',
    shippingAddress: user?.address || '',
    shippingCity: user?.city || '',
    shippingCountry: user?.country || 'Bangladesh',
    shippingZip: user?.zipCode || '',
  });

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal > 2000 ? 0 : 50;
  const tax = subtotal * 0.01;
  const total = subtotal + shipping + tax;

  useEffect(() => {
    fetch('/api/payment-methods')
      .then((r) => r.json())
      .then((d) => {
        if (d.methods && Array.isArray(d.methods)) {
          setPaymentMethods(d.methods);
          if (d.methods.length > 0 && !selectedMethod) {
            setSelectedMethod(d.methods[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        phone: prev.phone || user.phone || '',
        shippingAddress: prev.shippingAddress || user.address || '',
        shippingCity: prev.shippingCity || user.city || '',
        shippingCountry: prev.shippingCountry || user.country || 'Bangladesh',
        shippingZip: prev.shippingZip || user.zipCode || '',
      }));
    }
  }, [user]);

  const isCod = selectedMethod?.name === 'cash_on_delivery' ||
                selectedMethod?.name === 'Cash on Delivery' ||
                selectedMethod?.name === 'COD';

  const goToPayment = () => {
    if (!user) {
      showToast('Please sign in to proceed with checkout', 'error');
      setView('auth');
      return;
    }
    if (!form.phone.trim()) {
      showToast('Please enter your contact phone number', 'error');
      return;
    }
    if (!form.shippingAddress.trim() || !form.shippingCity.trim() || !form.shippingCountry.trim()) {
      showToast('Please fill in all required shipping fields', 'error');
      return;
    }
    if (!selectedMethod) {
      showToast('Please select a payment method', 'error');
      return;
    }
    setStep('payment');
  };

  const confirmOrder = async () => {
    if (!user) {
      showToast('Please sign in to place an order', 'error');
      setView('auth');
      return;
    }
    if (!form.phone.trim()) {
      showToast('Contact phone number is required', 'error');
      setStep('checkout');
      return;
    }

    if (!isCod) {
      if (!transactionId.trim()) {
        showToast('Please enter the Transaction ID (TrxID)', 'error');
        return;
      }
      if (!senderNumber.trim()) {
        showToast('Please enter the sender phone number', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        items: cart.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          productImage: safeImgSrc(i.product.image),
          price: i.product.price,
          quantity: i.quantity,
        })),
        phone: form.phone.trim(),
        shippingAddress: form.shippingAddress.trim(),
        shippingCity: form.shippingCity.trim(),
        shippingCountry: form.shippingCountry.trim(),
        shippingZip: form.shippingZip.trim(),
        paymentMethodId: selectedMethod?.id,
        paymentMethod: selectedMethod?.name,
        transactionId: isCod ? undefined : transactionId.trim(),
        senderNumber: isCod ? undefined : senderNumber.trim(),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders(useStore.getState),
        body: JSON.stringify(body),
      });
      const order = await res.json();
      if (!res.ok || order.error) {
        showToast(order.error || 'Failed to place order', 'error');
        setLoading(false);
        return;
      }
      if (order.id) {
        setCreatedOrder(order);
        setStep('success');
        setCart([]);
        fetch('/api/orders', { headers: authHeaders(useStore.getState) })
          .then((r) => r.json())
          .then(setOrders)
          .catch(() => {});
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
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('shop')}>
            Continue Shopping
          </Button>
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
          <h1 className="text-2xl font-light tracking-tight mb-2">Order Placed Successfully!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {!isCod ? 'Your order has been submitted for payment verification.' : 'Your order has been confirmed.'}
          </p>
          <div className="p-4 rounded-xl bg-secondary border border-border space-y-2 text-left mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number</span>
              <span>{createdOrder.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tracking Code</span>
              <span className="font-mono tracking-wider">{createdOrder.trackingCode}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span>৳ {createdOrder.totalAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method</span>
              <span>{createdOrder.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contact Phone</span>
              <span className="font-mono">{form.phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-[10px]">{createdOrder.paymentStatus}</Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-border text-xs tracking-wider" onClick={() => setView('orders')}>
              View Orders
            </Button>
            <Button className="flex-1 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('shop')}>
              Continue Shopping
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Payment details screen (Step 2)
  if (step === 'payment') {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <button onClick={() => setStep('checkout')} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Shipping Details
          </button>

          <h1 className="text-3xl font-light tracking-tight mb-2">Payment Confirmation</h1>
          <p className="text-sm text-muted-foreground mb-8">
            {isCod ? 'Pay when your order is delivered to your doorstep.' : `Complete your payment via ${selectedMethod?.name}.`}
          </p>

          {/* Selected Payment Method Details */}
          <div className="p-6 rounded-xl bg-secondary border border-border mb-6">
            <div className="flex items-center gap-3 mb-4">
              {selectedMethod?.icon && (
                <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-background border border-border">
                  {selectedMethod.icon.startsWith('/') || selectedMethod.icon.startsWith('http') ? (
                    <img src={selectedMethod.icon} alt={selectedMethod.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-2xl">{selectedMethod.icon}</span>
                  )}
                </div>
              )}
              <div>
                <h3 className="text-base font-medium">{selectedMethod?.name}</h3>
                {selectedMethod?.description && <p className="text-xs text-muted-foreground">{selectedMethod.description}</p>}
              </div>
            </div>

            {selectedMethod?.instructions && (
              <div className="p-3.5 rounded-lg bg-background border border-border text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
                  <span>{selectedMethod.instructions}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Proof Requirements */}
          {isCod ? (
            <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 mb-6 text-sm">
              <p className="font-medium mb-1">ক্যাশ অন ডেলিভারি (Cash on Delivery)</p>
              <p className="text-xs text-muted-foreground">
                অগ্রিম কোনো টাকা বা ট্রানজেকশন আইডি প্রদান করতে হবে না। পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে ক্যাশ পরিশোধ করুন।
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-secondary border border-border mb-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium tracking-wide">পেমেন্ট ভেরিফিকেশন তথ্য</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  কোনো স্ক্রিনশট আপলোড করার প্রয়োজন নেই। শুধুমাত্র টাকা পাঠানোর ট্রানজেকশন আইডি (TrxID) এবং আপনার প্রেরক মোবাইল নাম্বার প্রদান করুন।
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                    Transaction ID (TrxID) *
                  </Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 9J8B7C6D5E"
                    className="mt-1.5 h-10 bg-background border-border font-mono text-xs uppercase"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">পেমেন্ট সম্পন্ন হওয়ার পর পাওয়া Transaction ID দিন</p>
                </div>

                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                    Sender Phone Number * (যে নাম্বার থেকে টাকা পাঠিয়েছেন)
                  </Label>
                  <Input
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="mt-1.5 h-10 bg-background border-border font-mono text-xs"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">টাকা প্রেরকের মোবাইল নাম্বার</p>
                </div>
              </div>
            </div>
          )}

          {/* Order summary on payment page */}
          <div className="p-4 rounded-xl bg-secondary border border-border mb-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳ {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `৳ ${shipping}`}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>৳ {tax.toFixed(2)}</span></div>
            <Separator className="bg-border" />
            <div className="flex justify-between text-lg font-light"><span>Total</span><span>৳ {total.toFixed(2)}</span></div>
          </div>

          <Button
            className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90"
            onClick={confirmOrder}
            disabled={Boolean(loading || (!isCod && (!transactionId.trim() || !senderNumber.trim())))}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCod ? 'Confirm Order' : 'Submit & Confirm Order'}
          </Button>
        </div>
      </div>
    );
  }

  // Main checkout (shipping details + payment method selection)
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-light tracking-tight mb-8">Checkout</h1>

        {!user && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 shrink-0" />
              <span>You are checking out as a guest. Please sign in to link this order to your account.</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8 border-amber-500/30 shrink-0" onClick={() => setView('auth')}>
              Sign In
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Shipping & Contact Details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 mb-5">
                <Truck className="w-4 h-4" />
                <h2 className="text-sm font-medium tracking-wide">Shipping & Contact Details</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contact Phone Number *
                  </Label>
                  <Input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1.5 h-10 bg-background border-border text-sm"
                    placeholder="e.g. +880 1XXXXXXXXX"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">অর্ডার সংক্রান্ত যোগাযোগের জন্য আপনার সক্রিয় ফোন নাম্বার দিন</p>
                </div>

                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Address *</Label>
                  <Input
                    required
                    value={form.shippingAddress}
                    onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                    className="mt-1.5 h-10 bg-background border-border text-sm"
                    placeholder="House/Apartment, Street, Area"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City *</Label>
                    <Input
                      required
                      value={form.shippingCity}
                      onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                      className="mt-1.5 h-10 bg-background border-border text-sm"
                      placeholder="Dhaka, Chittagong, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">ZIP Code</Label>
                    <Input
                      value={form.shippingZip}
                      onChange={(e) => setForm({ ...form, shippingZip: e.target.value })}
                      className="mt-1.5 h-10 bg-background border-border text-sm"
                      placeholder="1207"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country *</Label>
                  <Input
                    required
                    value={form.shippingCountry}
                    onChange={(e) => setForm({ ...form, shippingCountry: e.target.value })}
                    className="mt-1.5 h-10 bg-background border-border text-sm"
                    placeholder="Bangladesh"
                  />
                </div>
              </div>
            </motion.div>

            {/* Payment Method Selection */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4" />
                <h2 className="text-sm font-medium tracking-wide">Select Payment Method (পেমেন্ট মাধ্যম)</h2>
              </div>
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payment methods available.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {paymentMethods.map((m) => {
                    const isCodMethod = m.name === 'cash_on_delivery' || m.name === 'Cash on Delivery' || m.name === 'COD';
                    const isSelected = selectedMethod?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethod(m)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all text-center ${
                          isSelected
                            ? 'border-foreground bg-background ring-1 ring-foreground shadow-sm'
                            : 'border-border bg-card hover:border-muted-foreground/40'
                        }`}
                      >
                        {m.icon && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                            {m.icon.startsWith('/') || m.icon.startsWith('http') ? (
                              <img src={m.icon} alt={m.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-2xl">{m.icon}</span>
                            )}
                          </div>
                        )}
                        <p className="text-xs font-medium leading-tight">{m.name}</p>
                        {isCodMethod ? (
                          <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">Cash on Delivery</span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground">TrxID Needed</span>
                        )}
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
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{item.product.name} x{item.quantity}</span>
                    <span className="shrink-0">৳ {(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator className="bg-border" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳ {subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `৳ ${shipping}`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>৳ {tax.toFixed(2)}</span></div>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between text-lg font-light"><span>Total</span><span>৳ {total.toFixed(2)}</span></div>
              <Button
                className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90"
                onClick={goToPayment}
              >
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
