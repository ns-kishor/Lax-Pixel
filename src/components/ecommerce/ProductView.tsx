'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Heart, ShoppingBag, ArrowLeft, Sparkles, Truck, Shield, RotateCcw, Minus, Plus, Check, Store, CheckCircle2, ArrowRight, Zap, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function ProductView() {
  const {
    selectedProduct: product,
    user,
    showToast,
    wishlistIds,
    toggleWishlist,
    setJustAddedToCart,
    setCart,
    setSelectedCartItemIds,
    setView,
    selectSellerStore,
    goBack,
  } = useStore();
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!product) return;
    fetch(`/api/reviews?productId=${product.id}`).then(r => r.json()).then(setReviews);
    setActiveImgIdx(0);
    setSelectedColor('');
    setSelectedSize('');
  }, [product?.id]);

  const rawImage = product?.image;
  const rawImages = product?.images;
  const rawColors = product?.colors;
  const rawSizes = product?.sizes;

  const imageList = useMemo(() => {
    const list: string[] = [];
    if (rawImages) {
      rawImages.split(',').map(s => s.trim()).filter(Boolean).forEach(img => {
        if (!list.includes(img)) list.push(img);
      });
    }
    if (rawImage && !list.includes(rawImage)) {
      list.unshift(rawImage);
    }
    return list.length > 0 ? list : ['/products/hero.png'];
  }, [rawImage, rawImages]);

  const availableColors = useMemo(() => {
    return rawColors ? rawColors.split(',').map(s => s.trim()).filter(Boolean) : [];
  }, [rawColors]);

  const availableSizes = useMemo(() => {
    return rawSizes ? rawSizes.split(',').map(s => s.trim()).filter(Boolean) : [];
  }, [rawSizes]);

  if (!product) return <div className="pt-24 text-center">Product not found</div>;

  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  const validateOptions = () => {
    if (availableColors.length > 0 && !selectedColor) {
      showToast('Please select a color first', 'error');
      return false;
    }
    if (availableSizes.length > 0 && !selectedSize) {
      showToast('Please select a size first', 'error');
      return false;
    }
    return true;
  };

  const addToCart = async () => {
    if (!user) { useStore.getState().setView('auth'); return; }
    if (!validateOptions()) return;
    setJustAddedToCart(product.id);
    await fetch('/api/cart', {
      method: 'POST',
      headers: authHeaders(useStore.getState),
      body: JSON.stringify({
        productId: product.id,
        quantity: qty,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
      }),
    });
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    setCart(await res.json());
    showToast(`${product.name} added to bag`);
  };

  const buyNow = async () => {
    if (!user) { useStore.getState().setView('auth'); return; }
    if (!validateOptions()) return;
    await fetch('/api/cart', {
      method: 'POST',
      headers: authHeaders(useStore.getState),
      body: JSON.stringify({
        productId: product.id,
        quantity: qty,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
      }),
    });
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    const updatedCart = await res.json();
    setCart(updatedCart);
    const targetItem = Array.isArray(updatedCart)
      ? updatedCart.find((ci: any) => ci.productId === product.id)
      : null;
    if (targetItem) {
      setSelectedCartItemIds([targetItem.id]);
    }
    setView('checkout');
  };

  const isWished = wishlistIds.has(product.id);
  const sellerName = product.seller?.sellerProfile?.companyName || product.seller?.name || 'Verified Merchant';
  const sellerLogo = product.seller?.sellerProfile?.logo || product.seller?.avatar || null;
  const sellerRating = product.seller?.sellerProfile?.rating || product.rating || 4.9;
  const sellerSales = product.seller?.sellerProfile?.totalSales || product.salesCount || 100;

  return (
    <div className="min-h-screen pt-24 pb-28 lg:pb-16">
      <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
        <button onClick={goBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left Column: Multi-Image Gallery & Specifications */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Main Active Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary border border-border">
              <Image
                src={safeImgSrc(imageList[activeImgIdx] || product.image)}
                alt={product.name}
                fill
                className="object-cover transition-all duration-300"
                priority
              />
              {discount > 0 && <Badge className="absolute top-4 left-4 bg-foreground text-background text-xs">-{discount}%</Badge>}
            </div>

            {/* Multiple Images Thumbnails */}
            {imageList.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIdx(idx)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImgIdx === idx
                        ? 'border-foreground shadow-sm scale-95'
                        : 'border-border/70 hover:border-foreground/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={safeImgSrc(img)} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Specifications (Positioned directly below the images per user request) */}
            {product.specs && product.specs.length > 0 && (
              <div className="pt-5 border-t border-border mt-4">
                <h3 className="text-xs font-semibold tracking-wider uppercase text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Product Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {product.specs.map((spec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/60 border border-border/60">
                      <span className="text-muted-foreground">{spec.label}</span>
                      <span className="text-foreground font-medium text-right">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">{product.category?.name}</p>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight">{product.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-foreground text-foreground" /><span className="text-sm">{product.rating}</span></div>
                <span className="text-xs text-muted-foreground">{product.reviewCount} reviews</span>
                <span className="text-xs text-muted-foreground">{product.salesCount} sold</span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-light">৳ {product.price.toLocaleString()}</span>
              {product.comparePrice && (
                <span className="text-lg text-muted-foreground line-through">৳ {product.comparePrice.toLocaleString()}</span>
              )}
            </div>

            {/* ─── Color & Size Selection (Mandatory if available) ─── */}
            {(availableColors.length > 0 || availableSizes.length > 0) && (
              <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3.5">
                {/* Color Selection */}
                {availableColors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-medium tracking-wider uppercase text-foreground">
                        Color: <span className="font-semibold text-foreground">{selectedColor || 'Please select'}</span>
                      </Label>
                      {!selectedColor && (
                        <span className="text-[10px] text-amber-500 font-medium">* Required</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {availableColors.map((color, idx) => {
                        const isSelected = selectedColor === color;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                              isSelected
                                ? 'bg-foreground text-background border-foreground shadow-sm'
                                : 'bg-background text-foreground border-border hover:border-foreground/40'
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {availableSizes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-medium tracking-wider uppercase text-foreground">
                        Size: <span className="font-semibold text-foreground">{selectedSize || 'Please select'}</span>
                      </Label>
                      {!selectedSize && (
                        <span className="text-[10px] text-amber-500 font-medium">* Required</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {availableSizes.map((size, idx) => {
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            className={`min-w-10 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                              isSelected
                                ? 'bg-foreground text-background border-foreground shadow-sm'
                                : 'bg-background text-foreground border-border hover:border-foreground/40'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator className="bg-secondary" />

            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>

            {/* ─── Seller Profile Card (Clickable) ─── */}
            <div
              onClick={() => selectSellerStore(product.sellerId)}
              className="group p-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 hover:border-foreground/30 transition-all cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-11 h-11 rounded-xl bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {sellerLogo ? (
                    <Image src={safeImgSrc(sellerLogo)} alt={sellerName} fill className="object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Sold By</span>
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4 flex items-center gap-1 bg-foreground/10 text-foreground font-normal">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium text-foreground tracking-tight truncate group-hover:underline flex items-center gap-1">
                    {sellerName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5 font-medium text-foreground">
                      <Star className="w-3 h-3 fill-foreground text-foreground" /> {Number(sellerRating).toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{sellerSales.toLocaleString()}+ sales</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-foreground px-3 py-1.5 rounded-lg bg-background/80 border border-border group-hover:bg-foreground group-hover:text-background transition-all">
                <span>View Store</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quantity & Add to Cart / Buy Now */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg bg-secondary/30">
                  <Button variant="ghost" size="icon" className="h-11 w-10 rounded-none" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="w-4 h-4" /></Button>
                  <span className="w-10 text-center text-sm font-medium">{qty}</span>
                  <Button variant="ghost" size="icon" className="h-11 w-10 rounded-none" onClick={() => setQty(Math.min(product.stock, qty + 1))}><Plus className="w-4 h-4" /></Button>
                </div>
                <Button className="flex-1 h-11 bg-secondary text-foreground hover:bg-secondary/80 border border-border text-xs tracking-wider uppercase rounded-lg" onClick={addToCart}>
                  <ShoppingBag className="w-4 h-4 mr-2" /> Add to Bag
                </Button>
                <Button variant="outline" size="icon" className={`h-11 w-11 rounded-lg border-border ${isWished ? 'bg-foreground text-background' : ''}`} onClick={() => {
                  if (!user) { useStore.getState().setView('auth'); return; }
                  toggleWishlist(product.id);
                  showToast(isWished ? 'Removed from wishlist' : 'Added to wishlist', 'info');
                }}>
                  <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
                </Button>
              </div>

              <Button className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-lg hover:bg-foreground/90 font-medium" onClick={buyNow}>
                <Zap className="w-4 h-4 mr-2" /> Buy Now — ৳ {((product.price * qty) || 0).toLocaleString()}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'} • Fast express shipping across Bangladesh</p>

            {/* Guarantees */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[{ icon: Truck, label: 'Express Delivery' }, { icon: Shield, label: 'Authenticity' }, { icon: RotateCcw, label: '7-Day Return' }].map((g, i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-secondary/50">
                  <g.icon className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground tracking-wide">{g.label}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags && (
              <div className="flex flex-wrap gap-2 pt-2">
                {product.tags.split(',').map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] tracking-wide">{tag.trim()}</Badge>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Reviews */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-xl font-light tracking-tight">Customer Reviews ({reviews.length})</h2>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(product.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-foreground">{product.rating?.toFixed(1) || '5.0'} out of 5</span>
                </div>
              )}
            </div>

            {user ? (
              <Button
                variant={showReviewForm ? 'outline' : 'default'}
                size="sm"
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="text-xs h-9 rounded-lg"
              >
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('auth')}
                className="text-xs h-9 border-border rounded-lg"
              >
                Sign in to Review
              </Button>
            )}
          </div>

          {/* Review Submission Form */}
          {showReviewForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user) {
                  setView('auth');
                  return;
                }
                if (!reviewComment.trim()) {
                  showToast('Please enter your review feedback', 'error');
                  return;
                }
                setSubmittingReview(true);
                try {
                  const res = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: authHeaders(useStore.getState),
                    body: JSON.stringify({
                      productId: product.id,
                      rating: reviewRating,
                      title: reviewTitle.trim() || undefined,
                      comment: reviewComment.trim(),
                    }),
                  });
                  if (res.ok) {
                    showToast('Review submitted successfully!', 'success');
                    setShowReviewForm(false);
                    setReviewTitle('');
                    setReviewComment('');
                    const updatedReviews = await (await fetch(`/api/reviews?productId=${product.id}`)).json();
                    setReviews(Array.isArray(updatedReviews) ? updatedReviews : []);
                  } else {
                    const data = await res.json();
                    showToast(data.error || 'Failed to submit review', 'error');
                  }
                } catch {
                  showToast('An error occurred while submitting review', 'error');
                } finally {
                  setSubmittingReview(false);
                }
              }}
              className="mb-8 p-5 rounded-xl bg-secondary/60 border border-border space-y-4"
            >
              <h3 className="text-sm font-medium tracking-wide">Write Your Review</h3>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewRating(s)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          s <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-semibold ml-2">{reviewRating} Star{reviewRating > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Headline (Optional)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Exceptional luxury quality & fast delivery"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                  maxLength={150}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Review Details *</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  required
                  className="w-full p-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                  maxLength={2000}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReviewForm(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingReview}
                  className="text-xs h-9 bg-foreground text-background rounded-lg px-5 font-medium"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-secondary rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this product.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-4 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">{r.user?.name?.charAt(0) || 'U'}</div>
                      <div>
                        <p className="text-sm font-medium">{r.user?.name || 'User'}</p>
                        <div className="flex items-center gap-1 mt-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <p className="text-sm font-medium mt-2">{r.title}</p>}
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Sticky Action Bar (App-like 1-tap checkout) */}
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Price</span>
              <span className="text-base font-semibold text-foreground">
                ৳ {((product.price * qty) || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addToCart}
                className="h-10 px-3.5 border-border rounded-xl text-xs font-medium tracking-wide uppercase shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
              <Button
                size="sm"
                onClick={buyNow}
                className="h-10 px-4 bg-foreground text-background rounded-xl text-xs font-semibold tracking-wider uppercase shrink-0 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 mr-1" /> Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
