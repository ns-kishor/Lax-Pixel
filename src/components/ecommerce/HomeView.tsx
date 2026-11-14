'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Star, TrendingUp, Eye, Truck, Shield, Heart, ChevronLeft, ChevronRight, ArrowLeftRight, Flame } from 'lucide-react';
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
      className="group cursor-pointer"
      onClick={() => selectProduct(product)}
    >
      <div className="relative img-zoom rounded-lg overflow-hidden bg-secondary aspect-square">
        {!imgError ? (
          <Image src={safeImgSrc(product.image)} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl font-light">{product.name.charAt(0)}</div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {badgeText && (
            <Badge
              className={`text-[9px] tracking-wider font-semibold uppercase px-2.5 py-0.5 border shadow-sm ${
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
            <Badge className="bg-red-500/90 text-white border border-red-400/30 text-[9px] tracking-wider font-semibold px-2 py-0.5 shadow-sm">
              -{discount}%
            </Badge>
          )}
        </div>

        {product.salesCount > 0 ? (
          <Badge variant="secondary" className="absolute top-3 right-3 text-[9px] tracking-wider gap-1 bg-background/85 backdrop-blur-sm border border-border/60">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-500" /> {product.salesCount} sold
          </Badge>
        ) : product.aiTags ? (
          <Badge variant="secondary" className="absolute top-3 right-3 text-[9px] tracking-wider gap-1 bg-background/85 backdrop-blur-sm border border-border/60">
            <Sparkles className="w-2.5 h-2.5" /> AI PICK
          </Badge>
        ) : null}

        {useStore.getState().justAddedToCart === product.id && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center animate-fade-in z-20">
            <span className="text-xs tracking-widest uppercase bg-foreground text-background px-3 py-1.5 rounded-full font-medium">Added</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 z-10">
          <Button size="sm" className="flex-1 h-9 bg-foreground text-background text-xs tracking-wider hover:bg-foreground/90 rounded-lg font-medium" onClick={addToCart}>
            Add to Bag
          </Button>
          <Button size="icon" variant="secondary" className={`h-9 w-9 rounded-lg ${isWished ? 'bg-foreground text-background' : ''}`} onClick={toggleWish}>
            <Heart className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{product.category?.name}</p>
        <h3 className="text-sm font-medium tracking-wide group-hover:text-gradient truncate">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-light">${product.price.toLocaleString()}</span>
          {product.comparePrice && (
            <span className="text-xs text-muted-foreground line-through">${product.comparePrice.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-foreground text-foreground" />
          <span className="text-xs text-muted-foreground">{product.rating} ({product.reviewCount})</span>
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
      className="relative w-full max-w-[696px] mx-auto lg:mx-0 lg:ml-auto"
    >
      <div className="relative glass rounded-2xl border border-border overflow-hidden shadow-xl">
        {/* Product Image - 16:9 ratio, 696px width, 393px height */}
        <div className="relative w-full max-w-[696px] aspect-[16/9] md:w-[696px] md:h-[393px] overflow-hidden bg-secondary">
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
                sizes="(max-width: 1024px) 100vw, 696px"
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
  const { products, categories, recommendations, setProducts, setCategories, setRecommendations, setView } = useStore();
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

  useEffect(() => {
    const loadRecs = async () => {
      try {
        const res = await fetch('/api/ai/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'luxury premium items trending bestsellers' }) });
        const data = await res.json();
        if (data.length > 0) setRecommendations(data);
      } catch {}
    };
    if (products.length > 0) loadRecs();
  }, [products.length, setRecommendations]);

  const features = [
    { icon: Truck, title: 'Free Express Shipping', desc: 'On orders over $2,000' },
    { icon: Shield, title: 'Authenticity Guaranteed', desc: 'Every piece verified' },
    { icon: Sparkles, title: 'AI Curated', desc: 'Personalized for you' },
    { icon: Eye, title: 'Real-time Tracking', desc: 'From warehouse to door' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[580px] py-12 lg:py-16 flex items-center overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/20 via-background to-background pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left - 2 Guarantee/Feature Cards + Lowered CTA buttons */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 flex flex-col justify-center space-y-4 sm:space-y-5"
            >
              {/* Card 1: Delivery All Over Bangladesh */}
              <div className="group relative rounded-2xl border border-border/80 bg-gradient-to-br from-card/95 via-card/60 to-secondary/30 p-5 sm:p-6 backdrop-blur-md shadow-sm hover:shadow-md hover:border-foreground/30 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:border-emerald-500/50 transition-all duration-300">
                    <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-medium tracking-tight text-foreground">
                        Delivery All Over Bangladesh
                      </h3>
                      <Badge variant="outline" className="text-[10px] tracking-wider uppercase border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shrink-0">
                        64 Districts
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground font-light leading-relaxed">
                      Fast, dependable doorstep express delivery across every district in Bangladesh with live tracking and secure handling.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Easy Exchange Available */}
              <div className="group relative rounded-2xl border border-border/80 bg-gradient-to-br from-card/95 via-card/60 to-secondary/30 p-5 sm:p-6 backdrop-blur-md shadow-sm hover:shadow-md hover:border-foreground/30 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-blue-500/10 to-transparent border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 group-hover:border-sky-500/50 transition-all duration-300">
                    <ArrowLeftRight className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-background animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-medium tracking-tight text-foreground">
                        Easy Exchange Available
                      </h3>
                      <Badge variant="outline" className="text-[10px] tracking-wider uppercase border-sky-500/40 text-sky-400 bg-sky-500/10 shrink-0">
                        7-Day Policy
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground font-light leading-relaxed">
                      Hassle-free 7-day exchange and replacement guarantee. Shop with 100% confidence and complete peace of mind.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons - Lowered with spacing & balanced alignment */}
              <div className="pt-3 sm:pt-4 flex flex-wrap sm:flex-nowrap items-center gap-3.5">
                <Button
                  size="lg"
                  className="flex-1 h-12 px-7 bg-foreground text-background text-xs tracking-[0.18em] uppercase hover:bg-foreground/90 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                  onClick={() => setView('shop')}
                >
                  Explore Collection <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-12 px-7 text-xs tracking-[0.18em] uppercase border-border/80 hover:bg-secondary rounded-xl font-medium transition-all"
                  onClick={() => setView('shop')}
                >
                  Start Shopping
                </Button>
              </div>
            </motion.div>

            {/* Right - Product Card Slider */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end w-full">
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
      <section className="border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide">{f.title}</p>
                <p className="text-[10px] text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-light tracking-tight">Categories</h2>
            <p className="text-xs text-muted-foreground mt-1 tracking-wide">Explore our curated collections</p>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          <button onClick={() => setView('shop')} className="shrink-0 px-5 py-2.5 rounded-full border border-border text-xs tracking-[0.15em] uppercase hover:bg-secondary transition-colors">All</button>
          {(categories || []).map(c => (
            <button key={c.id} onClick={() => { useStore.getState().setSearchQuery(''); useStore.getState().setShopCategory(c.slug); setView('shop', { category: c.slug }); }} className="shrink-0 px-5 py-2.5 rounded-full border border-border text-xs tracking-[0.15em] uppercase hover:bg-secondary transition-colors">{c.name}</button>
          ))}
        </div>
      </section>

      {/* Section 1: Recently Added Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-[10px] tracking-[0.2em] uppercase font-semibold text-blue-500 bg-blue-500/10 border-blue-500/25">
                Fresh Arrivals
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Recently Added Products</h2>
            <p className="text-xs text-muted-foreground mt-1 tracking-wide">
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
            className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors font-medium shrink-0"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {recentProducts.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} badgeText="NEW" badgeVariant="new" />
          ))}
        </div>
      </section>

      {/* Section 2: Best Selling Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-[10px] tracking-[0.2em] uppercase font-semibold text-amber-500 bg-amber-500/10 border-amber-500/25">
                <Flame className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" /> Top Trending
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Best Selling Products</h2>
            <p className="text-xs text-muted-foreground mt-1 tracking-wide">
              Customer favorites with the highest orders and glowing ratings
            </p>
          </div>
          <button
            onClick={() => {
              useStore.getState().setShopCategory('');
              useStore.getState().setSearchQuery('');
              useStore.getState().setShopSort('popular');
              setView('shop', { sort: 'popular' });
            }}
            className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors font-medium shrink-0"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {bestSellingProducts.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} badgeText="HOT" badgeVariant="popular" />
          ))}
        </div>
      </section>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex items-end justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-2xl font-light tracking-tight">AI Picks For You</h2>
                <p className="text-xs text-muted-foreground mt-1 tracking-wide">Personalized recommendations powered by intelligence</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recommendations.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="relative rounded-2xl border border-border bg-secondary p-8 sm:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Become a <span className="font-medium">Seller</span></h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              List your luxury products on Lax Pixel and reach discerning customers worldwide. AI-powered tools help you optimize listings and grow sales.
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
