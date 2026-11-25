'use client';

import { useEffect, useState } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Minus,
  Plus,
  X,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Sparkles,
  Check,
  Store,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function CartView() {
  const {
    cart,
    setCart,
    selectedCartItemIds,
    toggleCartItemSelection,
    selectAllCartItems,
    selectSellerStore,
    user,
    setView,
    showToast,
  } = useStore();

  useEffect(() => {
    if (!user) return;
    fetch('/api/cart', { headers: authHeaders(useStore.getState) })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCart(data);
        }
      });
  }, [user?.id]);

  const updateQty = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await fetch(`/api/cart?productId=${productId}`, {
        method: 'DELETE',
        headers: authHeaders(useStore.getState),
      });
    } else {
      await fetch('/api/cart', {
        method: 'PUT',
        headers: authHeaders(useStore.getState),
        body: JSON.stringify({ productId, quantity }),
      });
    }
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    setCart(await res.json());
  };

  const clearCart = async () => {
    await fetch('/api/cart', { method: 'DELETE', headers: authHeaders(useStore.getState) });
    setCart([]);
    showToast('Cart cleared', 'info');
  };

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

  // Filter items selected for checkout
  const selectedItems = cart.filter((i) => selectedCartItemIds.includes(i.id));
  const selectedCount = selectedItems.length;
  const isAllSelected = cart.length > 0 && selectedCount === cart.length;

  // Calculation based ONLY on selected items
  const subtotal = selectedItems.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  const shipping = selectedCount === 0 ? 0 : shippingFee;
  const total = subtotal + shipping;

  const handleProceedToCheckout = () => {
    if (selectedCount === 0) {
      showToast('Please select at least one product to checkout', 'error');
      return;
    }
    setView('checkout');
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Sign in to view your bag</p>
          <Button
            className="mt-4 bg-foreground text-background text-xs tracking-wider"
            onClick={() => setView('auth')}
          >
            Sign In
          </Button>
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
          <p className="text-sm text-muted-foreground mt-1">Discover our curated luxury collections</p>
          <Button
            className="mt-6 bg-foreground text-background text-xs tracking-wider"
            onClick={() => setView('shop')}
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-28 lg:pb-16">
      <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Shopping Bag ({cart.length})</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Select the products you wish to purchase now. Unselected items will remain safely in your bag.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-destructive hover:text-destructive self-start sm:self-auto"
            onClick={clearCart}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
          </Button>
        </div>

        {/* Selection control toolbar */}
        <div className="flex items-center justify-between p-3.5 mb-4 rounded-xl bg-secondary/50 border border-border">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => selectAllCartItems(!isAllSelected)}
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                isAllSelected
                  ? 'bg-foreground border-foreground text-background'
                  : selectedCount > 0
                  ? 'bg-foreground/20 border-foreground text-foreground'
                  : 'border-border bg-background hover:border-foreground/50'
              }`}
            >
              {isAllSelected ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : selectedCount > 0 ? (
                <span className="w-2 h-0.5 bg-foreground rounded" />
              ) : null}
            </button>
            <span className="text-xs font-medium text-foreground">
              Select All ({selectedCount} of {cart.length} selected)
            </span>
          </label>

          {selectedCount < cart.length && selectedCount > 0 && (
            <button
              onClick={() => selectAllCartItems(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Select All Items
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cart.map((item) => {
                const isSelected = selectedCartItemIds.includes(item.id);
                const sellerName =
                  item.product?.seller?.sellerProfile?.companyName ||
                  item.product?.seller?.name ||
                  'Verified Seller';

                return (
                  <motion.div
                    key={item.id}
                    layout
                    exit={{ opacity: 0, x: -20 }}
                    className={`flex items-start gap-3 sm:gap-4 p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-secondary border-foreground/40 shadow-xs'
                        : 'bg-secondary/40 border-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Item Checkbox */}
                    <button
                      type="button"
                      aria-label={isSelected ? 'Deselect item' : 'Select item'}
                      onClick={() => toggleCartItemSelection(item.id)}
                      className={`mt-2 sm:mt-8 w-5 h-5 rounded-md shrink-0 flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-foreground border-foreground text-background shadow-xs'
                          : 'border-border bg-background hover:border-foreground/60'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Image */}
                    <div
                      onClick={() => toggleCartItemSelection(item.id)}
                      className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-background shrink-0 relative cursor-pointer"
                    >
                      <Image
                        src={safeImgSrc(item.product?.image)}
                        alt={item.product?.name || 'Product'}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                            {item.product?.category?.name || 'Collection'}
                          </p>
                          <h3
                            className="text-sm font-medium tracking-wide mt-0.5 cursor-pointer hover:underline truncate"
                            onClick={() => useStore.getState().selectProduct(item.product)}
                          >
                            {item.product?.name}
                          </h3>

                          {(item.selectedColor || item.selectedSize) && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              {item.selectedColor && (
                                <span>Color: <strong className="text-foreground font-medium">{item.selectedColor}</strong></span>
                              )}
                              {item.selectedColor && item.selectedSize && <span>•</span>}
                              {item.selectedSize && (
                                <span>Size: <strong className="text-foreground font-medium">{item.selectedSize}</strong></span>
                              )}
                            </div>
                          )}

                          {/* Seller link */}
                          {item.product?.sellerId && (
                            <button
                              onClick={() => selectSellerStore(item.product.sellerId)}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-1 group/seller transition-colors"
                            >
                              <Store className="w-3 h-3 text-muted-foreground group-hover/seller:text-foreground" />
                              <span>Store: <strong className="font-normal underline">{sellerName}</strong></span>
                            </button>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => updateQty(item.productId, 0)}
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                        <p className="text-sm font-light">
                          ৳ {((item.product?.price || 0) * item.quantity).toLocaleString()}
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                              (৳ {item.product?.price?.toLocaleString()} each)
                            </span>
                          )}
                        </p>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-border rounded-lg bg-background">
                            <button
                              className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-l-lg transition-colors"
                              onClick={() => updateQty(item.productId, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                            <button
                              className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-r-lg transition-colors"
                              onClick={() => updateQty(item.productId, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Order Summary based on Selected Items */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-xl bg-secondary border border-border space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium tracking-wide">Order Summary</h3>
                <Badge variant="outline" className="text-[11px] font-normal border-border">
                  {selectedCount} of {cart.length} selected
                </Badge>
              </div>

              {selectedCount === 0 ? (
                <div className="p-4 rounded-lg bg-background/50 border border-dashed border-border text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No items selected. Please tick the checkbox next to the products you want to buy.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({selectedCount} items)</span>
                    <span>৳ {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {shipping === 0 ? (
                        <span className="text-green-500 font-medium">Free</span>
                      ) : (
                        `৳ ${shipping.toLocaleString()}`
                      )}
                    </span>
                  </div>
                </div>
              )}

              <Separator className="bg-border" />

              <div className="flex justify-between text-lg font-light">
                <span>Total</span>
                <span>৳ {total.toLocaleString()}</span>
              </div>

              {selectedCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/60 text-[11px] text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  <span>
                    Nationwide home delivery & express shipping available
                  </span>
                </div>
              )}

              {selectedCount < cart.length && selectedCount > 0 && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  ⓘ The remaining {cart.length - selectedCount} unselected item(s) will stay in your bag for later.
                </p>
              )}

              <Button
                disabled={selectedCount === 0}
                className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90 disabled:opacity-50 font-medium transition-all"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout ({selectedCount}) <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile App-like Sticky Checkout Bar (Always accessible on phone) */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
                </p>
                <p className="text-base font-medium text-foreground">
                  ৳ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Button
                disabled={selectedCount === 0}
                onClick={handleProceedToCheckout}
                className="h-11 px-5 bg-foreground text-background text-xs tracking-wider uppercase rounded-xl hover:bg-foreground/90 font-medium shrink-0 disabled:opacity-50 shadow-sm"
              >
                Checkout ({selectedCount}) <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
