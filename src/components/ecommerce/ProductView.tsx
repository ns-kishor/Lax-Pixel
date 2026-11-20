'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Heart, ShoppingBag, ArrowLeft, Truck, Shield, RotateCcw, Minus, Plus, Store, CheckCircle2, ArrowRight, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function ProductView() {
  const {
    selectedProduct: product,
    products,
    selectProduct,
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
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (product?.image) {
      setSelectedImg(product.image);
    }
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    fetch(`/api/reviews?productId=${product.id}`).then(r => r.json()).then(setReviews).catch(() => {});
  }, [product?.id]);

  const parsedImages: string[] = useMemo(() => {
    if (!product) return [];
    const list = [product.image];
    if (product.images) {
      try {
        const arr = JSON.parse(product.images);
        if (Array.isArray(arr)) {
          arr.forEach((img: string) => {
            if (img && !list.includes(img)) list.push(img);
          });
        }
      } catch {
        product.images.split(',').forEach(img => {
          const trimmed = img.trim();
          if (trimmed && !list.includes(trimmed)) list.push(trimmed);
        });
      }
    }
    return list.filter(Boolean);
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(p => p.id !== product.id && (p.categoryId === product.categoryId || p.category?.slug === product.category?.slug))
      .slice(0, 4);
  }, [product, products]);

  if (!product) {
    return (
      <div className="min-h-[70vh] pt-32 flex flex-col items-center justify-center text-center px-4">
        <p className="text-lg font-light text-foreground uppercase tracking-widest mb-4">Product Not Found</p>
        <Button onClick={() => setView('shop')} className="bg-foreground text-background text-xs uppercase tracking-widest h-10 px-6 rounded-md">
          Back to Shop
        </Button>
      </div>
    );
  }

  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  const addToCart = async () => {
    if (!user) { useStore.getState().setView('auth'); return; }
    setJustAddedToCart(product.id);
    await fetch('/api/cart', { method: 'POST', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId: product.id, quantity: qty }) });
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    setCart(await res.json());
    showToast(`${product.name} added to bag`);
  };

  const buyNow = async () => {
    if (!user) { useStore.getState().setView('auth'); return; }
    await fetch('/api/cart', { method: 'POST', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId: product.id, quantity: qty }) });
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
    <div className="min-h-screen pt-28 pb-28 lg:pb-16 bg-background">
      <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-8">
          <button onClick={() => setView('home')} className="hover:text-foreground transition-colors">Home</button>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <button onClick={() => setView('shop')} className="hover:text-foreground transition-colors">Shop</button>
          {product.category?.name && (
            <>
              <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
              <button
                onClick={() => setView('shop', { category: product.category?.slug || '' })}
                className="hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {product.category.name}
              </button>
            </>
          )}
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
        </div>

        {/* Main Product Section */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 xl:gap-16 items-start">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border shadow-xs">
              <Image
                src={safeImgSrc(selectedImg || product.image)}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {discount > 0 && (
                <Badge className="absolute top-4 left-4 bg-foreground text-background text-xs uppercase tracking-wider font-semibold px-2.5 py-1">
                  -{discount}% OFF
                </Badge>
              )}
            </div>

            {/* Gallery Thumbnails */}
            {parsedImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {parsedImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(img)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      (selectedImg || product.image) === img ? 'border-foreground' : 'border-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={safeImgSrc(img)} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Actions */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-semibold mb-2">
                {product.category?.name || 'Exclusive Edition'}
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-foreground uppercase leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-foreground text-foreground" />
                  <span className="text-sm font-semibold">{product.rating}</span>
                </div>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground tracking-wide font-medium">{product.reviewCount} Reviews</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground tracking-wide font-medium">{product.salesCount} Sold</span>
              </div>
            </div>

            {/* Price Block */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl sm:text-4xl font-light text-foreground tracking-tight">
                ৳ {product.price.toLocaleString()}
              </span>
              {product.comparePrice && (
                <span className="text-base sm:text-lg text-muted-foreground line-through font-light">
                  ৳ {product.comparePrice.toLocaleString()}
                </span>
              )}
            </div>

            <Separator className="bg-border" />

            {/* Description */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
              {product.description}
            </p>

            {/* Seller Profile Card */}
            <div
              onClick={() => selectSellerStore(product.sellerId)}
              className="group p-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 hover:border-foreground/30 transition-all cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-11 h-11 rounded-lg bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {sellerLogo ? (
                    <Image src={safeImgSrc(sellerLogo)} alt={sellerName} fill className="object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Sold By</span>
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4 flex items-center gap-1 bg-foreground/10 text-foreground font-normal">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                    </Badge>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground tracking-tight truncate group-hover:underline">
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

              <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground px-3 py-1.5 rounded-md bg-background border border-border group-hover:bg-foreground group-hover:text-background transition-all">
                <span>View Store</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quantity Selector & Main Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-md bg-secondary/50">
                  <Button variant="ghost" size="icon" className="h-11 w-10 rounded-none hover:bg-secondary" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-semibold font-mono">{qty}</span>
                  <Button variant="ghost" size="icon" className="h-11 w-10 rounded-none hover:bg-secondary" onClick={() => setQty(Math.min(product.stock || 99, qty + 1))} aria-label="Increase quantity">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  className="flex-1 h-11 bg-secondary text-foreground hover:bg-secondary/80 border border-border text-xs tracking-[0.16em] uppercase rounded-md font-semibold"
                  onClick={addToCart}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" /> Add to Bag
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className={`h-11 w-11 rounded-md border-border transition-colors ${isWished ? 'bg-foreground text-background border-foreground' : 'hover:bg-secondary'}`}
                  onClick={() => {
                    if (!user) { useStore.getState().setView('auth'); return; }
                    toggleWishlist(product.id);
                    showToast(isWished ? 'Removed from wishlist' : 'Added to wishlist', 'info');
                  }}
                  aria-label="Toggle wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
                </Button>
              </div>

              <Button
                className="w-full h-12 bg-foreground text-background text-xs tracking-[0.2em] uppercase rounded-md hover:bg-foreground/90 font-semibold shadow-xs"
                onClick={buyNow}
              >
                <Zap className="w-4 h-4 mr-2" /> Buy Now — ৳ {((product.price * qty) || 0).toLocaleString()}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium text-foreground">{product.stock > 0 ? `${product.stock} In Stock` : 'Out of Stock'}</span>
              <span>• Standard delivery nationwide ৳150</span>
            </p>

            {/* Shopping Guarantees */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
              <div className="p-3 rounded-lg border border-border bg-secondary/30 text-center space-y-1">
                <Truck className="w-4 h-4 mx-auto text-foreground stroke-[1.8]" />
                <p className="text-[10px] font-semibold tracking-wider uppercase text-foreground">Nationwide Delivery</p>
                <p className="text-[9px] text-muted-foreground">Doorstep ৳150</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/30 text-center space-y-1">
                <Shield className="w-4 h-4 mx-auto text-foreground stroke-[1.8]" />
                <p className="text-[10px] font-semibold tracking-wider uppercase text-foreground">100% Verified</p>
                <p className="text-[9px] text-muted-foreground">Authentic Piece</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/30 text-center space-y-1">
                <RotateCcw className="w-4 h-4 mx-auto text-foreground stroke-[1.8]" />
                <p className="text-[10px] font-semibold tracking-wider uppercase text-foreground">7-Day Exchange</p>
                <p className="text-[9px] text-muted-foreground">Easy Replacement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Tabs: Details, Shipping, Reviews */}
        <div className="mt-16 sm:mt-20">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="bg-secondary/60 p-1 border border-border rounded-lg mb-8 max-w-md">
              <TabsTrigger value="reviews" className="text-xs uppercase tracking-wider font-medium">
                Customer Reviews ({reviews.length})
              </TabsTrigger>
              <TabsTrigger value="shipping" className="text-xs uppercase tracking-wider font-medium">
                Shipping & Returns
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border bg-secondary/20">
                  <Star className="w-8 h-8 mx-auto text-muted-foreground mb-2 stroke-[1.5]" />
                  <p className="text-sm font-medium text-foreground">No customer reviews yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Purchased this item? Be the first to share your thoughts.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
                            {r.user?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{r.user?.name || 'Verified Buyer'}</p>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${s <= r.rating ? 'fill-foreground text-foreground' : 'text-muted-foreground/30'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.title && <p className="text-xs font-semibold text-foreground pt-1">{r.title}</p>}
                      <p className="text-xs text-muted-foreground leading-relaxed font-light">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="shipping" className="space-y-4 max-w-2xl text-xs text-muted-foreground leading-relaxed font-light">
              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Nationwide Express Delivery</h3>
                <p>We deliver to all 64 districts across Bangladesh via verified express delivery partners. Standard delivery charge is ৳150.</p>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground pt-2">7-Day Replacement Policy</h3>
                <p>If your received product has any manufacturing defect or size issue, you can request an easy exchange within 7 days of delivery.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products Showcase */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 sm:mt-20 pt-10 border-t border-border">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-foreground uppercase">
                You May Also Like
              </h2>
              <button
                onClick={() => setView('shop', { category: product.category?.slug || '' })}
                className="text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
              >
                View More <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => selectProduct(rel)}
                  className="group cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border group-hover:border-foreground/40 transition-all">
                    <Image src={safeImgSrc(rel.image)} alt={rel.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="mt-2.5 space-y-1">
                    <p className="text-[10px] tracking-wider uppercase text-muted-foreground truncate">{rel.category?.name}</p>
                    <h3 className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-muted-foreground transition-colors">{rel.name}</h3>
                    <p className="text-xs sm:text-sm font-light text-foreground">৳ {rel.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Sticky Action Bar */}
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total</span>
              <span className="text-base font-semibold text-foreground">
                ৳ {((product.price * qty) || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addToCart}
                className="h-10 px-3.5 border-border rounded-md text-xs font-medium tracking-wide uppercase shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
              <Button
                size="sm"
                onClick={buyNow}
                className="h-10 px-4 bg-foreground text-background rounded-md text-xs font-semibold tracking-wider uppercase shrink-0"
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
