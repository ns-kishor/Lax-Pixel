'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Star, TrendingUp, Eye, Truck, Shield, Heart, ChevronLeft, ChevronRight, ArrowLeftRight, Flame, CheckCircle2, Store, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product, Category } from '@/lib/store';
import Image from 'next/image';

function ProductCard({
  product,
  index,
  badgeText,
  badgeVariant = 'default',
}: {
  product: Product;
  index: number;
  badgeText?: string;
  badgeVariant?: 'new' | 'popular' | 'default';
}) {
  const { selectProduct, wishlistIds, toggleWishlist, showToast, user, setJustAddedToCart, setView } = useStore();
  const isWished = wishlistIds.has(product.id);
  const [imgError, setImgError] = useState(false);

  const addToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { useStore.getState().setView('auth'); return; }
    setJustAddedToCart(product.id);
    await fetch('/api/cart', { method: 'POST', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId: product.id, quantity: 1 }) });
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    useStore.getState().setCart(await res.json());
    showToast(`${product.name} added to bag`);
  };

  const toggleWish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { useStore.getState().setView('auth'); return; }
    toggleWishlist(product.id);
    if (!isWished) {
      fetch('/api/wishlist', { method: 'POST', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId: product.id }) });
    }
    showToast(isWished ? 'Removed from wishlist' : 'Added to wishlist', 'info');
  };

  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group cursor-pointer flex flex-col justify-between"
      onClick={() => selectProduct(product)}
    >
      <div className="relative img-zoom rounded-2xl overflow-hidden bg-secondary aspect-square border border-border/40 shadow-xs group-hover:shadow-md group-hover:border-foreground/30 transition-all duration-300">
        {!imgError ? (
          <Image
            src={safeImgSrc(product.image)}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl font-light">
            {product.name.charAt(0)}
          </div>
        )}

        {/* Badges on top-left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
          {badgeText && (
            <Badge
              className={`text-[9px] tracking-wider font-semibold uppercase px-2 py-0.5 border shadow-xs ${
                badgeVariant === 'new'
                  ? 'bg-blue-600/90 text-white border-blue-400/30'
                  : badgeVariant === 'popular'
                  ? 'bg-amber-600/90 text-white border-amber-400/30'
                  : 'bg-foreground text-background border-transparent'
              }`}
            >
              {badgeVariant === 'popular' && <Flame className="w-2.5 h-2.5 mr-1 inline fill-current" />}
              {badgeText}
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-foreground text-background text-[9px] tracking-wider font-semibold px-2 py-0.5 shadow-xs">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Wishlist button top-right (Accessible on all devices) */}
        <button
          onClick={toggleWish}
          aria-label="Wishlist"
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-200 shadow-sm ${
            isWished
              ? 'bg-foreground text-background'
              : 'bg-background/80 backdrop-blur-md text-foreground hover:bg-background'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isWished ? 'fill-current' : ''}`} />
        </button>

        {/* Just added to bag banner */}
        {useStore.getState().justAddedToCart === product.id && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center animate-fade-in z-20">
            <span className="text-[10px] tracking-widest uppercase bg-foreground text-background px-3 py-1.5 rounded-full font-semibold shadow-md">
              Added to Bag
            </span>
          </div>
        )}

        {/* Mobile Quick Add Button (Bottom Right - Tap-friendly) */}
        <button
          onClick={addToCart}
          aria-label="Add to Bag"
          className="lg:hidden absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-background/90 backdrop-blur-md border border-border/80 flex items-center justify-center text-foreground active:scale-90 shadow-md z-10"
        >
          <ShoppingBag className="w-4 h-4" />
        </button>

        {/* Desktop Hover Action Bar */}
        <div className="hidden lg:flex absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-2 z-10 bg-gradient-to-t from-background/90 via-background/60 to-transparent">
          <Button
            size="sm"
            className="flex-1 h-9 bg-foreground text-background text-xs tracking-wider hover:bg-foreground/90 rounded-lg font-medium shadow-sm"
            onClick={addToCart}
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Add to Bag
          </Button>
        </div>
      </div>

      {/* Product Information */}
      <div className="mt-2.5 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground truncate">
            {product.category?.name || 'Exclusive'}
          </p>
          {product.sellerId && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                useStore.getState().selectSellerStore(product.sellerId);
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors hover:underline shrink-0 max-w-[100px]"
              title="View Seller Store"
            >
              <Store className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{product.seller?.sellerProfile?.companyName || product.seller?.name || 'Store'}</span>
            </span>
          )}
        </div>

        <h3 className="text-xs sm:text-sm font-medium tracking-wide text-foreground truncate group-hover:text-muted-foreground transition-colors">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-xs sm:text-sm font-light text-foreground">
            ${product.price.toLocaleString()}
          </span>
          {product.comparePrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              ${product.comparePrice.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-foreground text-foreground" />
            <span className="text-[11px] font-medium text-foreground">{product.rating}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">({product.reviewCount || 0})</span>
          {product.salesCount > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {product.salesCount} sold
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function HeroSlider({ featuredProducts }: { featuredProducts: Product[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { selectProduct } = useStore();

  const slideCount = Math.min(featuredProducts.length, 12);
  const slides = featuredProducts.slice(0, slideCount);

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev + 1) % slideCount);
  }, [slideCount]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return;
    intervalRef.current = setInterval(next, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [next, slideCount]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.95 }),
  };

  if (slideCount === 0) return null;

  const slide = slides[current];
  const discount = slide.comparePrice ? Math.round((1 - slide.price / slide.comparePrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative w-full mx-auto lg:mx-0 lg:ml-auto h-full flex flex-col justify-between"
    >
      <div className="relative glass rounded-2xl border border-border overflow-hidden shadow-xl flex flex-col h-full justify-between">
        {/* Product Image - fluid 16:9 ratio */}
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-secondary shrink-0 rounded-t-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0"
            >
              <Image
                src={safeImgSrc(slide.image)}
                alt={slide.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, (max-width: 1536px) 55vw, 950px"
                priority
              />
            </motion.div>
          </AnimatePresence>

          {/* Discount badge */}
          {discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-foreground text-background text-[10px] tracking-wider z-10 font-medium">
              -{discount}%
            </Badge>
          )}

          {/* Nav arrows */}
          {slideCount > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass border border-border flex items-center justify-center z-10 hover:bg-background/90 text-foreground transition-all shadow-md"
                aria-label="Previous product"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass border border-border flex items-center justify-center z-10 hover:bg-background/90 text-foreground transition-all shadow-md"
                aria-label="Next product"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 sm:p-5">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id + '-info'}
              custom={direction}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">
                  {slide.category?.name}
                </p>
                <h3 className="text-base sm:text-lg font-light tracking-wide leading-tight">
                  {slide.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {slide.rating} · {slide.reviewCount}
                    </span>
                  </div>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-medium">
                      ${slide.price.toLocaleString()}
                    </span>
                    {slide.comparePrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        ${slide.comparePrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                className="w-full sm:w-auto h-10 px-6 bg-foreground text-background text-xs tracking-[0.12em] uppercase rounded-lg hover:bg-foreground/90 shrink-0"
                onClick={() => selectProduct(slide)}
              >
                Shop Now <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          {slideCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-border/40">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-6 bg-foreground'
                      : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function HomeView() {
  const { products, categories, setProducts, setCategories, setView } = useStore();
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);

  // Authoritative Hero Slides fetch from /api/hero (managed in Admin Hero Slider)
  useEffect(() => {
    fetch('/api/hero')
      .then(r => r.json())
      .then(data => {
        if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
          const prods = data.slides
            .map((s: any) => s.product)
            .filter((p: any) => p && p.id);
          if (prods.length > 0) {
            setHeroProducts(prods);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Background load all products and categories if store is empty
  useEffect(() => {
    if (products.length === 0) {
      Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/categories').catch(() => null),
      ]).then(async ([pRes, cRes]) => {
        const p = pRes && pRes.ok ? await pRes.json() : [];
        const c = cRes && cRes.ok ? await cRes.json() : [];
        if (Array.isArray(p) && p.length > 0) setProducts(p);
        if (Array.isArray(c) && c.length > 0) setCategories(c);
      }).catch(() => {});
    }
  }, [products.length, setProducts, setCategories]);

  // Derived: Recently added products (newest first)
  const recentProducts = useMemo(() => {
    return [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products]);

  // Derived: Best selling products (highest salesCount first, fallback to rating and date)
  const bestSellingProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const diff = (b.salesCount || 0) - (a.salesCount || 0);
      if (diff !== 0) return diff;
      const rateDiff = (b.rating || 0) - (a.rating || 0);
      if (rateDiff !== 0) return rateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [products]);

  const features = [
    { icon: Truck, title: 'Free Express Shipping', desc: 'On orders over $2,000' },
    { icon: Shield, title: 'Authenticity Guaranteed', desc: 'Every piece verified' },
    { icon: Sparkles, title: 'Quality Curated', desc: 'Handpicked for your style' },
    { icon: Eye, title: 'Real-time Tracking', desc: 'From warehouse to door' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-[104px] sm:pt-[120px] pb-12 lg:pb-16 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/20 via-background to-background pointer-events-none" />
        <div className="relative max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* Left - 2 Guarantee/Feature Cards + Lowered CTA buttons */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 flex flex-col justify-between h-full gap-4 sm:gap-5 order-2 lg:order-1"
            >

              {/* 2 Guarantee/Feature Cards (Responsive 1-col on phone / 2-col on tablet / 1-col on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 sm:gap-4 flex-1">
                {/* Card 1: Delivery All Over Bangladesh */}
                <div className="group relative rounded-2xl border border-border bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-foreground/40 transition-all duration-300 flex flex-col justify-between flex-1">
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                    <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/80 border border-border group-hover:border-foreground/30 flex items-center justify-center text-foreground group-hover:scale-105 transition-all duration-300 shadow-xs">
                      <Truck className="w-6 h-6 text-foreground" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-foreground ring-2 ring-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap mb-1">
                        <h3 className="text-base sm:text-lg font-medium tracking-tight text-foreground">
                          Delivery All Over Bangladesh
                        </h3>
                        <Badge variant="secondary" className="text-[10px] tracking-wider uppercase border border-border bg-secondary text-foreground shrink-0 font-medium px-2.5 py-0.5">
                          64 Districts
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
                        Fast, dependable doorstep express delivery across every district with live tracking and secure handling.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-light">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" /> Nationwide Coverage</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" /> Express Dispatch</span>
                  </div>
                </div>

                {/* Card 2: Easy Exchange Available */}
                <div className="group relative rounded-2xl border border-border bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-foreground/40 transition-all duration-300 flex flex-col justify-between flex-1">
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                    <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/80 border border-border group-hover:border-foreground/30 flex items-center justify-center text-foreground group-hover:scale-105 transition-all duration-300 shadow-xs">
                      <ArrowLeftRight className="w-6 h-6 text-foreground" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-foreground ring-2 ring-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap mb-1">
                        <h3 className="text-base sm:text-lg font-medium tracking-tight text-foreground">
                          Easy Exchange Available
                        </h3>
                        <Badge variant="secondary" className="text-[10px] tracking-wider uppercase border border-border bg-secondary text-foreground shrink-0 font-medium px-2.5 py-0.5">
                          7-Day Policy
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
                        Hassle-free 7-day exchange and replacement guarantee. Shop with 100% confidence and complete peace of mind.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-light">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" /> Seamless Replacement</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" /> Zero Hassle</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="shrink-0 flex flex-row items-center gap-3">
                <Button
                  size="lg"
                  className="flex-1 h-12 px-6 bg-foreground text-background text-xs tracking-[0.16em] uppercase hover:bg-foreground/90 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
                  onClick={() => setView('shop')}
                >
                  Explore Collection <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-12 px-6 text-xs tracking-[0.16em] uppercase border-border hover:bg-secondary rounded-xl font-medium transition-all"
                  onClick={() => setView('shop')}
                >
                  Start Shopping
                </Button>
              </div>
            </motion.div>

            {/* Right - Product Card Slider */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end w-full h-full order-1 lg:order-2">
              <HeroSlider
                featuredProducts={
                  heroProducts.length > 0
                    ? heroProducts
                    : products.filter(p => p.featured).length > 0
                    ? products.filter(p => p.featured)
                    : products.slice(0, 8)
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border/80 bg-secondary/20">
        <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 shadow-xs">
                <f.icon className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-tight text-foreground truncate">{f.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 py-10 sm:py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-light tracking-tight">Curated Categories</h2>
            <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">Swipe to explore collections by category</p>
          </div>
          <button
            onClick={() => setView('shop')}
            className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium shrink-0"
          >
            All Collections <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => {
              useStore.getState().setSearchQuery('');
              useStore.getState().setShopCategory('');
              setView('shop');
            }}
            className="shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-foreground/30 bg-foreground text-background text-xs tracking-wider uppercase font-medium shadow-xs transition-all active:scale-95"
          >
            All Products
          </button>
          {(categories || []).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                useStore.getState().setSearchQuery('');
                useStore.getState().setShopCategory(c.slug);
                setView('shop', { category: c.slug });
              }}
              className="shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-border bg-secondary/50 hover:bg-secondary hover:border-foreground/30 text-foreground text-xs tracking-wider uppercase font-medium transition-all active:scale-95"
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* Section 1: Recently Added Products */}
      <section className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pb-16 sm:pb-20">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-[10px] tracking-[0.2em] uppercase font-semibold text-blue-500 bg-blue-500/10 border-blue-500/25">
                Fresh Arrivals
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight">Recently Added Products</h2>
            <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">
              Discover the latest products and newly listed collections
            </p>
          </div>
          <button
            onClick={() => {
              useStore.getState().setShopCategory('');
              useStore.getState().setSearchQuery('');
              useStore.getState().setShopSort('createdAt');
              setView('shop', { sort: 'createdAt' });
            }}
            className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium shrink-0"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3.5 sm:gap-6 xl:gap-7 2xl:gap-8">
          {recentProducts.slice(0, 12).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} badgeText="NEW" badgeVariant="new" />
          ))}
        </div>
      </section>

      {/* Section 2: Best Selling Products */}
      <section className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pb-16 sm:pb-20">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-[10px] tracking-[0.2em] uppercase font-semibold text-amber-500 bg-amber-500/10 border-amber-500/25">
                <Flame className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" /> Top Trending
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight">Best Selling Products</h2>
            <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">
              Customer favorites with highest orders and verified ratings
            </p>
          </div>
          <button
            onClick={() => {
              useStore.getState().setShopCategory('');
              useStore.getState().setSearchQuery('');
              useStore.getState().setShopSort('popular');
              setView('shop', { sort: 'popular' });
            }}
            className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium shrink-0"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3.5 sm:gap-6 xl:gap-7 2xl:gap-8">
          {bestSellingProducts.slice(0, 12).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} badgeText="HOT" badgeVariant="popular" />
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pb-16 sm:pb-20">
        <div className="relative rounded-2xl border border-border bg-secondary p-8 sm:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Become a <span className="font-medium">Seller</span></h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              List your luxury products on Lax Pixel and reach discerning customers worldwide. Advanced seller tools help you optimize listings and grow sales.
            </p>
            <Button className="mt-6 bg-foreground text-background text-xs tracking-[0.2em] uppercase h-11 px-8 rounded-lg" onClick={() => setView('auth')}>
              Start Selling <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
