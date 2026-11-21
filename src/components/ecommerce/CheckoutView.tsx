'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Lock, CreditCard, Truck, Info, CheckCircle2, Loader2, LogIn, Phone, ArrowLeft, Ticket, Copy, Check } from 'lucide-react';
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
  sellerName?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
}

export function CheckoutView() {
  const { cart, selectedCartItemIds, setSelectedCartItemIds, user, setView, showToast, setOrders, setCart } = useStore();
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

  // Items selected for checkout from the cart
  const selectedItems = cart.filter((i) => (selectedCartItemIds || []).includes(i.id));
  const checkoutItems = selectedItems.length > 0 ? selectedItems : cart;

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null>(null);

  const [shippingFee, setShippingFee] = useState<number>(150);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.shipping_fee !== undefined && !isNaN(parseFloat(d.shipping_fee))) {
          setShippingFee(parseFloat(d.shipping_fee));
        }
      })
      .catch(() => {});
  }, []);

  const subtotal = checkoutItems.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const shipping = checkoutItems.length > 0 ? shippingFee : 0;
  const total = Math.max(0, subtotal - couponDiscount + shipping);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const itemsPayload = checkoutItems.map((i) => ({
        productId: i.productId,
        sellerId: i.product?.sellerId,
        price: i.product?.price || 0,
        quantity: i.quantity,
      }));

      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          type: 'PRODUCT',
          subtotal,
          items: itemsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Invalid coupon code', 'error');
        return;
      }

      setAppliedCoupon(data.coupon);
      showToast(`Coupon '${data.coupon.code}' applied! Saved ৳${data.coupon.discountAmount}`);
    } catch {
      showToast('Failed to validate coupon', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    showToast('Coupon removed');
  };

  // Stable key for product IDs to prevent unwanted re-fetching on user input
  const productIdsKey = useMemo(() => {
    return checkoutItems.map((i) => i.productId).filter(Boolean).sort().join(',');
  }, [checkoutItems]);

  useEffect(() => {
    const query = productIdsKey ? `?productIds=${encodeURIComponent(productIdsKey)}` : '';
    fetch(`/api/payment-methods${query}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.methods && Array.isArray(d.methods)) {
          setPaymentMethods(d.methods);
          // Preserve user-selected method if it exists in the fetched methods
          setSelectedMethod((current) => {
            if (current && d.methods.some((m: PaymentMethod) => m.id === current.id)) {
              return current;
            }
            return d.methods[0] || null;
          });
        }
      })
      .catch(() => {});
  }, [productIdsKey]);

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
        items: checkoutItems.map((i) => ({
          productId: i.productId,
          productName: i.product?.name,
          productImage: safeImgSrc(i.product?.image),
          price: i.product?.price,
          quantity: i.quantity,
          selectedColor: i.selectedColor || undefined,
          selectedSize: i.selectedSize || undefined,
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
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount: appliedCoupon ? appliedCoupon.discountAmount : undefined,
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
        // Remove only the purchased items from store cart
        const remainingCart = cart.filter((ci) => !checkoutItems.some((item) => item.id === ci.id));
        setCart(remainingCart);
        setSelectedCartItemIds([]);
        // Re-sync cart from DB
        fetch('/api/cart', { headers: authHeaders(useStore.getState) })
          .then((r) => r.json())
          .then((freshCart) => {
            if (Array.isArray(freshCart)) setCart(freshCart);
          })
          .catch(() => {});
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

  if (checkoutItems.length === 0 && !loading && step !== 'success') {
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
    const currentAccountNumber = selectedMethod?.accountNumber ||
      selectedMethod?.instructions?.match(/01[3-9]\d{8}/)?.[0] ||
      '';
    const currentAccountType = selectedMethod?.accountType ||
      (/merchant/i.test(selectedMethod?.instructions || '') ? 'MERCHANT' : 'PERSONAL');

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
            <div className="flex items-start sm:items-center gap-4 mb-4">
              {selectedMethod?.icon && (
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-background border border-border p-1.5 shadow-sm">
                  {selectedMethod.icon.startsWith('/') || selectedMethod.icon.startsWith('http') ? (
                    <img src={selectedMethod.icon} alt={selectedMethod.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">{selectedMethod.icon}</span>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight">{selectedMethod?.name}</h3>
                  {!isCod && (
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold border-primary/30 text-primary bg-primary/5">
                      {currentAccountType === 'PERSONAL'
                        ? 'Personal (পার্সোনাল)'
                        : currentAccountType === 'AGENT'
                        ? 'Agent (এজেন্ট)'
                        : 'Merchant (মার্চেন্ট)'}
                    </Badge>
                  )}
                </div>

                {/* Account Number & Account Type directly under payment method name */}
                {!isCod && currentAccountNumber && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-medium">অ্যাকাউন্ট নাম্বার:</span>
                      <span className="font-mono font-bold text-sm text-foreground bg-background px-2 py-0.5 rounded border border-border select-all inline-flex items-center gap-1.5">
                        {currentAccountNumber}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentAccountNumber);
                            showToast('অ্যাকাউন্ট নাম্বার কপি হয়েছে', 'success');
                          }}
                          className="text-[10px] text-primary hover:underline font-sans font-normal"
                          title="নাম্বার কপি করুন"
                        >
                          কপি
                        </button>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground font-medium">অ্যাকাউন্টের ধরণ:</span>
                      <span className="font-semibold text-foreground">
                        {currentAccountType === 'PERSONAL'
                          ? 'Personal (পার্সোনাল)'
                          : currentAccountType === 'AGENT'
                          ? 'Agent (এজেন্ট)'
                          : 'Merchant (মার্চেন্ট)'}
                      </span>
                    </div>
                  </div>
                )}

                {selectedMethod?.description && !currentAccountNumber && (
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedMethod.description}</p>
                )}
                {selectedMethod?.sellerName && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    পণ্য বিক্রেতা: <span className="text-foreground font-medium">{selectedMethod.sellerName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Prominent Payment Box for Non-COD */}
            {!isCod && currentAccountNumber && (
              <div className="p-4 rounded-xl bg-background border border-primary/30 space-y-3 mb-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      টাকা পাঠানোর নাম্বার ({currentAccountType === 'MERCHANT' ? 'Make Payment' : 'Send Money'}):
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      নিচের নাম্বারে টাকা পাঠিয়ে Transaction ID এবং প্রেরক নাম্বার দিন
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base sm:text-lg font-bold text-primary tracking-wider select-all bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                      {currentAccountNumber}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(currentAccountNumber);
                        showToast('অ্যাকাউন্ট নাম্বার কপি হয়েছে!', 'success');
                      }}
                      className="h-8 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10 font-medium"
                    >
                      <Copy className="w-3.5 h-3.5" /> কপি করুন
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border">
                  <span className="text-muted-foreground">অ্যাকাউন্টের ধরণ (Account Type):</span>
                  <span className="font-semibold text-foreground bg-secondary px-2.5 py-1 rounded text-xs border border-border">
                    {currentAccountType === 'PERSONAL'
                      ? 'Personal (পার্সোনাল - Send Money অপশন ব্যবহার করুন)'
                      : currentAccountType === 'AGENT'
                      ? 'Agent (এজেন্ট - Cash Out অপশন ব্যবহার করুন)'
                      : 'Merchant (মার্চেন্ট - Make Payment অপশন ব্যবহার করুন)'}
                  </span>
                </div>
              </div>
            )}

            {selectedMethod?.instructions && (
              <div className="p-3.5 rounded-lg bg-background/70 border border-border text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
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
            {appliedCoupon && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Coupon Discount ({appliedCoupon.code})</span>
                <span>-৳ {appliedCoupon.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `৳ ${shipping}`}</span></div>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 xl:px-12">
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
                    const mNumber = m.accountNumber || m.instructions?.match(/01[3-9]\d{8}/)?.[0];
                    const mType = m.accountType || (/merchant/i.test(m.instructions || '') ? 'MERCHANT' : 'PERSONAL');
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethod(m)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
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
                        <p className="text-xs font-semibold leading-tight">{m.name}</p>
                        {isCodMethod ? (
                          <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">Cash on Delivery</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] text-muted-foreground font-medium uppercase">
                              {mType === 'AGENT' ? 'Agent' : mType === 'MERCHANT' ? 'Merchant' : 'Personal'}
                            </span>
                            {mNumber && (
                              <span className="text-[9px] text-foreground font-mono font-medium">
                                {mNumber}
                              </span>
                            )}
                          </div>
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
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div className="min-w-0 mr-2">
                      <p className="text-muted-foreground truncate">{item.product?.name} x{item.quantity}</p>
                      {(item.selectedColor || item.selectedSize) && (
                        <p className="text-[10px] text-muted-foreground">
                          {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                          {item.selectedColor && item.selectedSize && <span> • </span>}
                          {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-medium">৳ {((item.product?.price || 0) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator className="bg-border" />

              {/* Coupon Code Input */}
              <div className="space-y-2">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                  <Ticket className="w-3 h-3" /> Apply Coupon (কুপন কোড)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Coupon Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon}
                    className="h-9 bg-background border-border text-xs uppercase font-mono tracking-wider"
                  />
                  {appliedCoupon ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeCoupon}
                      className="h-9 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="h-9 px-4 text-xs bg-foreground text-background hover:bg-foreground/90 shrink-0"
                    >
                      {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </Button>
                  )}
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> '{appliedCoupon.code}' Applied
                    </span>
                    <span className="font-bold">-৳ {appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳ {subtotal.toLocaleString()}</span></div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Coupon Discount</span>
                    <span>-৳ {appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `৳ ${shipping}`}</span></div>
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
