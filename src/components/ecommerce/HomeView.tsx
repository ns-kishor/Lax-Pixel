'use client';

import { useEffect, useState } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Star, TrendingUp, Eye, Truck, Shield, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, Category } from '@/lib/store';
import Image from 'next/image';

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { selectProduct, wishlistIds, toggleWishlist, showToast, user, setJustAddedToCart } = useStore();
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
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group cursor-pointer"
      onClick={() => selectProduct(product)}
    >
      <div className="relative img-zoom rounded-lg overflow-hidden bg-secondary aspect-square">
        {!imgError ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl font-light">{product.name.charAt(0)}</div>
        )}

        {discount > 0 && (
          <Badge className="absolute top-3 left-3 bg-foreground text-background text-[10px] tracking-wider hover:bg-foreground">-{discount}%</Badge>
        )}
        {product.aiTags && (
          <Badge variant="secondary" className="absolute top-3 right-3 text-[9px] tracking-wider gap-1">
            <Sparkles className="w-2.5 h-2.5" /> AI PICK
          </Badge>
        )}
        {useStore.getState().justAddedToCart === product.id && (
          <div className="absolute inset-0 bg-white/10 flex items-center justify-center animate-fade-in">
            <span className="text-xs tracking-widest uppercase bg-foreground text-background px-3 py-1.5 rounded-full">Added</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
          <Button size="sm" className="flex-1 h-9 bg-foreground text-background text-xs tracking-wider hover:bg-foreground/90 rounded-lg" onClick={addToCart}>
            Add to Bag
          </Button>
          <Button size="icon" variant="secondary" className={`h-9 w-9 rounded-lg ${isWished ? 'bg-foreground text-background' : ''}`} onClick={toggleWish}>
            <Heart className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{product.category?.name}</p>
        <h3 className="text-sm font-medium tracking-wide group-hover:text-gradient">{product.name}</h3>
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

export function HomeView() {
  const { products, categories, recommendations, setProducts, setCategories, setRecommendations, setView, setGlobalLoading } = useStore();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      setGlobalLoading(true);
      const [pRes, cRes] = await Promise.all([
        fetch('/api/products?featured=true'),
        fetch('/api/categories'),
      ]);
      const p = await pRes.json();
      const c = await cRes.json();
      setProducts(p);
      setCategories(c);
      setFeaturedProducts(p.filter((pr: Product) => pr.featured));
      setGlobalLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadRecs = async () => {
      try {
        const res = await fetch('/api/ai/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'luxury premium items trending bestsellers' }) });
        const data = await res.json();
        if (data.length > 0) setRecommendations(data);
      } catch {}
    };
    if (products.length > 0) loadRecs();
  }, [products.length]);

  const features = [
    { icon: Truck, title: 'Free Express Shipping', desc: 'On orders over $2,000' },
    { icon: Shield, title: 'Authenticity Guaranteed', desc: 'Every piece verified' },
    { icon: Sparkles, title: 'AI Curated', desc: 'Personalized for you' },
    { icon: Eye, title: 'Real-time Tracking', desc: 'From warehouse to door' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/products/hero.png" alt="NOIR" fill className="object-cover opacity-60" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge variant="secondary" className="mb-6 text-[10px] tracking-[0.3em] uppercase gap-2">
              <Sparkles className="w-3 h-3" /> AI-Powered Luxury
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extralight tracking-tight leading-tight max-w-2xl">
              Redefine
              <br />
              <span className="font-medium">Luxury.</span>
            </h1>
            <p className="mt-6 text-sm sm:text-base text-muted-foreground font-light max-w-md leading-relaxed">
              Curated collections, intelligent recommendations, and timeless elegance. Experience shopping elevated by AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-foreground text-background h-12 px-8 text-xs tracking-[0.2em] uppercase hover:bg-foreground/90 rounded-lg" onClick={() => setView('shop')}>
                Explore Collection <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-xs tracking-[0.2em] uppercase border-white/20 hover:bg-white/5 rounded-lg" onClick={() => setView('tracking')}>
                Track Order
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
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
          <button onClick={() => setView('shop')} className="shrink-0 px-5 py-2.5 rounded-full border border-white/10 text-xs tracking-[0.15em] uppercase hover:bg-white/5 transition-colors">All</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => { useStore.getState().setSearchQuery(''); setView('shop'); }} className="shrink-0 px-5 py-2.5 rounded-full border border-white/10 text-xs tracking-[0.15em] uppercase hover:bg-white/5 transition-colors">{c.name}</button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-light tracking-tight">Featured</h2>
            <p className="text-xs text-muted-foreground mt-1 tracking-wide">Handpicked by our AI curators</p>
          </div>
          <button onClick={() => setView('shop')} className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuredProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex items-end justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
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
        <div className="relative rounded-2xl border border-white/5 bg-secondary p-8 sm:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Become a <span className="font-medium">Seller</span></h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              List your luxury products on NOIR and reach discerning customers worldwide. AI-powered tools help you optimize listings and grow sales.
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
