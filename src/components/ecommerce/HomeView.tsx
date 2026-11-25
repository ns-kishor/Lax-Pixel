'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowRight, Sparkles, Star, TrendingUp, Eye, Truck, Shield, Heart,
  ChevronLeft, ChevronRight, ArrowLeftRight, Flame, CheckCircle2, Store,
  ShoppingBag, Watch, Shirt, Glasses, Gem, Headphones, Footprints, Smartphone,
  Layers, Laptop, Tablet, Camera, Cpu, Clock, Timer, Clock3, AlarmClock, Tv, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product, Category } from '@/lib/store';
import { getSubcategoriesForCategory } from '@/lib/categories';
import Image from 'next/image';

function getCategoryIcon(name: string, slug?: string) {
  const s = `${name} ${slug || ''}`.toLowerCase();
  if (s.includes('watch') || s.includes('clock') || s.includes('chron')) return Watch;
  if (s.includes('laptop') || s.includes('macbook') || s.includes('computer')) return Laptop;
  if (s.includes('tablet') || s.includes('ipad')) return Tablet;
  if (s.includes('camera') || s.includes('photo') || s.includes('lens')) return Camera;
  if (s.includes('mobile') || s.includes('phone') || s.includes('smartphone')) return Smartphone;
  if (s.includes('gadget') || s.includes('tech')) return Cpu;
  if (s.includes('accessori')) return Headphones;
  if (s.includes('shoe') || s.includes('sneaker') || s.includes('footwear') || s.includes('boot')) return Footprints;
  if (s.includes('fashion') || s.includes('cloth') || s.includes('shirt') || s.includes('dress') || s.includes('pant') || s.includes('wear')) return Shirt;
  if (s.includes('bag') || s.includes('tote') || s.includes('backpack') || s.includes('leather')) return ShoppingBag;
  if (s.includes('glass') || s.includes('eyewear') || s.includes('sunglass') || s.includes('aviator')) return Glasses;
  if (s.includes('jewel') || s.includes('gem') || s.includes('ring') || s.includes('neck') || s.includes('gold') || s.includes('diamond')) return Gem;
  if (s.includes('perfume') || s.includes('fragrance') || s.includes('oud') || s.includes('beauty') || s.includes('scent')) return Sparkles;
  if (s.includes('headphone') || s.includes('audio') || s.includes('sound')) return Headphones;
  if (s.includes('electronic')) return Tv;
  return Layers;
}

function getSubcategoryIcon(subcatSlug: string) {
  const s = subcatSlug.toLowerCase();
  if (s.includes('smart')) return Watch;
  if (s.includes('analog')) return Clock;
  if (s.includes('digital')) return Timer;
  if (s.includes('wall')) return Clock3;
  if (s.includes('table')) return AlarmClock;
  if (s.includes('women') || s.includes('girl')) return Sparkles;
  if (s.includes('men') || s.includes('boy')) return User;
  return Sparkles;
}

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
            ৳ {product.price.toLocaleString()}
          </span>
          {product.comparePrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              ৳ {product.comparePrice.toLocaleString()}
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
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative w-full mx-auto lg:mx-0 lg:mr-auto h-full flex flex-col justify-between"
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
                      ৳ {slide.price.toLocaleString()}
                    </span>
                    {slide.comparePrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        ৳ {slide.comparePrice.toLocaleString()}
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
  const [selectedModalCategory, setSelectedModalCategory] = useState<Category | null>(null);

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

  // Derived: First 4 categories with products for dedicated home sections (per user sketch)
  const featuredCategorySections = useMemo(() => {
    return (categories || []).slice(0, 4).map(cat => {
      const catProducts = products.filter(p => p.categoryId === cat.id || p.category?.slug === cat.slug);
      return {
        category: cat,
        products: catProducts.slice(0, 4), // Exactly 4 products in one line per sketch
      };
    }).filter(sec => sec.products.length > 0);
  }, [categories, products]);

  const features = [
    { icon: Truck, title: 'Express Fast Shipping', desc: 'Doorstep delivery across Bangladesh' },
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
            {/* Left - Product Card Slider */}
            <div className="lg:col-span-7 flex justify-center lg:justify-start w-full h-full order-1">
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

            {/* Right - 2 Guarantee/Feature Cards + Lowered CTA buttons */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 flex flex-col justify-between h-full gap-4 sm:gap-5 order-2"
            >
              {/* 2 Guarantee/Feature Cards (Responsive 1-col on phone / 2-col on tablet / 1-col on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 sm:gap-4 flex-1">
                {/* Card 1: Delivery All Over Bangladesh */}
                <div className="group relative rounded-2xl border border-border bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-foreground/40 transition-all duration-300 flex flex-col justify-between flex-1 items-center text-center">
                  <div className="flex flex-col items-center text-center gap-3 w-full">
                    {/* Top Middle Icon */}
                    <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/80 border border-border group-hover:border-foreground/30 flex items-center justify-center text-foreground group-hover:scale-105 transition-all duration-300 shadow-xs mx-auto">
                      <Truck className="w-6 h-6 text-foreground" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-foreground ring-2 ring-background" />
                    </div>
                    {/* Headline Below Icon */}
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <h3 className="text-base sm:text-lg font-medium tracking-tight text-foreground">
                        Delivery All Over Bangladesh
                      </h3>
                      <Badge variant="secondary" className="text-[10px] tracking-wider uppercase border border-border bg-secondary text-foreground shrink-0 font-medium px-2.5 py-0.5">
                        64 Districts
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-light w-full">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" /> Nationwide Coverage</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" /> Express Dispatch</span>
                  </div>
                </div>

                {/* Card 2: Easy Exchange Available */}
                <div className="group relative rounded-2xl border border-border bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-foreground/40 transition-all duration-300 flex flex-col justify-between flex-1 items-center text-center">
                  <div className="flex flex-col items-center text-center gap-3 w-full">
                    {/* Top Middle Icon */}
                    <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/80 border border-border group-hover:border-foreground/30 flex items-center justify-center text-foreground group-hover:scale-105 transition-all duration-300 shadow-xs mx-auto">
                      <ArrowLeftRight className="w-6 h-6 text-foreground" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-foreground ring-2 ring-background" />
                    </div>
                    {/* Headline Below Icon */}
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <h3 className="text-base sm:text-lg font-medium tracking-tight text-foreground">
                        Easy Exchange Available
                      </h3>
                      <Badge variant="secondary" className="text-[10px] tracking-wider uppercase border border-border bg-secondary text-foreground shrink-0 font-medium px-2.5 py-0.5">
                        7-Day Policy
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-light w-full">
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

      {/* ─── Category Design Blocks (Per User Sketch) ─── */}
      <section className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 py-10 sm:py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-light tracking-tight">Categories</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explore collections by department</p>
          </div>
          <button
            onClick={() => {
              useStore.getState().setShopCategory('');
              useStore.getState().setSearchQuery('');
              setView('shop');
            }}
            className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium shrink-0"
          >
            All Products <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Category Blocks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {(categories || []).map((c) => {
            const IconComponent = getCategoryIcon(c.name, c.slug);
            const iconUrl = c.icon || c.image;
            const subcats = getSubcategoriesForCategory(c.slug || c.name);
            const hasSubs = subcats.length > 0;
            return (
              <motion.div
                key={c.id}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (hasSubs) {
                    setSelectedModalCategory(c);
                  } else {
                    useStore.getState().setSearchQuery('');
                    useStore.getState().setShopCategory(c.slug);
                    useStore.getState().setShopSubcategory('');
                    setView('shop', { category: c.slug });
                  }
                }}
                className="group p-4 sm:p-5 rounded-2xl border border-border bg-card hover:bg-secondary/70 hover:border-foreground/30 transition-all duration-300 cursor-pointer flex flex-col items-center text-center justify-between shadow-xs hover:shadow-md relative"
              >
                {hasSubs && (
                  <span className="absolute top-2 right-2 text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">
                    {subcats.length} অপশন
                  </span>
                )}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/80 border border-border group-hover:border-foreground/30 flex items-center justify-center shrink-0 mb-3 transition-transform duration-300 group-hover:scale-110">
                  {iconUrl && !['Smartphone', 'Laptop', 'Tablet', 'Camera', 'Watch', 'Cpu', 'Headphones', 'Shirt', 'Footprints'].includes(iconUrl) ? (
                    <img src={safeImgSrc(iconUrl)} alt={c.name} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
                  ) : (
                    <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" />
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium tracking-tight text-foreground group-hover:underline">
                  {c.name}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {hasSubs ? 'ক্লিক করে অপশন দেখুন' : (c._count?.products !== undefined ? `${c._count.products} Products` : 'Collection')}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── Section 1: Recently Added Products (Per User Sketch) ─── */}
      <section className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pb-14 sm:pb-18">
        {/* Themed Header Box from Hand-drawn Diagram */}
        <div className="relative rounded-2xl border border-border bg-secondary/70 backdrop-blur-xs p-5 sm:p-7 mb-6 sm:mb-8 text-center shadow-xs">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight text-foreground">
            Recently Added Products
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enjoy with new Products
          </p>
        </div>

        {/* 4 Products per line, exactly 2 lines = 8 products total */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {recentProducts.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} badgeText="NEW" badgeVariant="new" />
          ))}
        </div>

        {/* Bottom Right: View All —> */}
        <div className="flex justify-end mt-6 sm:mt-8">
          <button
            onClick={() => {
              useStore.getState().setShopCategory('');
              useStore.getState().setSearchQuery('');
              useStore.getState().setShopSort('createdAt');
              setView('shop', { sort: 'createdAt' });
            }}
            className="text-xs sm:text-sm tracking-[0.16em] uppercase text-foreground hover:text-foreground/80 flex items-center gap-2 font-medium px-5 py-2.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary transition-all active:scale-95 shadow-xs"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ─── First 4 Categories Product Sections (Per User Sketch) ─── */}
      {featuredCategorySections.map(({ category, products: catProds }) => (
        <section key={category.id} className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pb-14 sm:pb-18">
          {/* Themed Header Box with Category Name */}
          <div className="relative rounded-2xl border border-border bg-secondary/70 backdrop-blur-xs p-5 sm:p-7 mb-6 sm:mb-8 text-center shadow-xs">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight text-foreground">
              {category.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {category.description || `Explore our curated ${category.name} collection`}
            </p>
          </div>

          {/* 4 Products in one line */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {catProds.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>

          {/* Bottom Right: View All —> */}
          <div className="flex justify-end mt-6 sm:mt-8">
            <button
              onClick={() => {
                useStore.getState().setSearchQuery('');
                useStore.getState().setShopCategory(category.slug);
                setView('shop', { category: category.slug });
              }}
              className="text-xs sm:text-sm tracking-[0.16em] uppercase text-foreground hover:text-foreground/80 flex items-center gap-2 font-medium px-5 py-2.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary transition-all active:scale-95 shadow-xs"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ))}

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

      {/* Subcategory Selection Modal Dialog */}
      <Dialog
        open={Boolean(selectedModalCategory)}
        onOpenChange={(open) => {
          if (!open) setSelectedModalCategory(null);
        }}
      >
        <DialogContent className="max-w-md bg-card border-border p-6">
          {selectedModalCategory && (() => {
            const CatIcon = getCategoryIcon(selectedModalCategory.name, selectedModalCategory.slug);
            const subcats = getSubcategoriesForCategory(selectedModalCategory.slug || selectedModalCategory.name);
            return (
              <div>
                <DialogHeader className="text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 text-primary">
                    <CatIcon className="w-7 h-7" />
                  </div>
                  <DialogTitle className="text-xl font-light tracking-tight">
                    {selectedModalCategory.name}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    কাঙ্ক্ষিত পণ্য দেখতে নিচের অপশনগুলো থেকে একটি নির্বাচন করুন:
                  </p>
                </DialogHeader>

                <div className="space-y-2.5">
                  {subcats.map((sc) => {
                    const SubIcon = getSubcategoryIcon(sc.slug);
                    return (
                      <motion.button
                        key={sc.slug}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const catSlug = selectedModalCategory.slug;
                          setSelectedModalCategory(null);
                          useStore.getState().setSearchQuery('');
                          useStore.getState().setShopCategory(catSlug);
                          useStore.getState().setShopSubcategory(sc.slug);
                          setView('shop', { category: catSlug, subcategory: sc.slug });
                        }}
                        className="w-full p-3.5 rounded-xl border border-border/80 hover:border-primary/60 bg-secondary/40 hover:bg-secondary flex items-center justify-between text-left transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-background border border-border/70 flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
                            <SubIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {sc.name}
                            </p>
                            {sc.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {sc.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
