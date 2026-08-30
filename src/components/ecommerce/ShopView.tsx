'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useStore, authHeaders } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, Grid3X3, List, Search, X, Sparkles, Star, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/store';
import Image from 'next/image';

export function ShopView() {
  const { products, categories, setProducts, selectProduct, searchQuery, setSearchQuery, shopCategory, setShopCategory, shopSort, setShopSort, user, showToast, wishlistIds, toggleWishlist, setJustAddedToCart, setGlobalLoading, setView } = useStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const initializedRef = useRef(false);

  // Sync shopCategory from URL on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.has('category') && !shopCategory) {
        setShopCategory(params.get('category')!);
      }
      if (params.has('sort')) {
        setShopSort(params.get('sort')!);
      }
    }
  }, [shopCategory, setShopCategory, setShopSort]);

  useEffect(() => {
    const load = async () => {
      setGlobalLoading(true);
      const params = new URLSearchParams();
      if (shopCategory) params.set('category', shopCategory);
      if (searchQuery) params.set('search', searchQuery);
      params.set('sort', sortBy);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data);
      setGlobalLoading(false);
    };
    load();
  }, [shopCategory, shopSort, searchQuery]);

  // Push history entry when category changes (within shop view)
  const handleCategoryChange = (slug: string) => {
    setShopCategory(slug);
    if (slug) {
      useStore.getState().setView('shop', { category: slug });
    } else {
      useStore.getState().setView('shop');
    }
  };

  const filtered = useMemo(() => {
    let f = [...products];
    if (priceRange[0] > 0) f = f.filter(p => p.price >= priceRange[0]);
    if (priceRange[1] < 10000) f = f.filter(p => p.price <= priceRange[1]);
    return f;
  }, [products, priceRange]);

  const addToCart = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!user) { useStore.getState().setView('auth'); return; }
    setJustAddedToCart(product.id);
    await fetch('/api/cart', { method: 'POST', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId: product.id, quantity: 1 }) });
    const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
    useStore.getState().setCart(await res.json());
    showToast(`${product.name} added to bag`);
  };

  const toggleWish = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!user) { useStore.getState().setView('auth'); return; }
    toggleWishlist(productId);
    fetch('/api/wishlist', { method: 'POST', headers: authHeaders(useStore.getState), body: JSON.stringify({ productId }) });
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-light tracking-tight">
            {searchQuery ? `Results for "${searchQuery}"` : shopCategory ? categories.find(c => c.slug === shopCategory)?.name || 'Shop' : 'All Products'}
          </motion.h1>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-secondary border-border rounded-lg text-xs" />
            </div>
            <Button variant="outline" size="sm" className="h-9 border-border text-xs gap-2" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={shopSort} onValueChange={setShopSort}>
              <SelectTrigger className="w-36 h-9 bg-secondary border-border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="createdAt">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('grid')}><Grid3X3 className="w-3.5 h-3.5" /></Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('list')}><List className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-secondary rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tracking-wider uppercase font-medium">Filters</span>
              <button onClick={() => { handleCategoryChange(''); setPriceRange([0, 10000]); }} className="text-[10px] text-muted-foreground hover:text-foreground tracking-wide">Clear All</button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCategoryChange('')} className={`px-3 py-1.5 rounded-full text-[11px] tracking-wide border transition-colors ${!shopCategory ? 'bg-foreground text-background border-foreground' : 'border-border hover:border'}`}>All</button>
                  {categories.map(c => (
                    <button key={c.id} onClick={() => handleCategoryChange(c.slug)} className={`px-3 py-1.5 rounded-full text-[11px] tracking-wide border transition-colors ${shopCategory === c.slug ? 'bg-foreground text-background border-foreground' : 'border-border hover:border'}`}>{c.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Price Range</p>
                <div className="flex items-center gap-3">
                  <Input type="number" placeholder="Min" value={priceRange[0] || ''} onChange={e => setPriceRange([Number(e.target.value) || 0, priceRange[1]])} className="h-8 w-24 bg-secondary border-border text-xs" />
                  <span className="text-muted-foreground text-xs">—</span>
                  <Input type="number" placeholder="Max" value={priceRange[1] < 10000 ? priceRange[1] : ''} onChange={e => setPriceRange([priceRange[0], Number(e.target.value) || 10000])} className="h-8 w-24 bg-secondary border-border text-xs" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Products Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No products found</p>
            <Button variant="outline" className="mt-4 border-border text-xs" onClick={() => { setSearchQuery(''); handleCategoryChange(''); }}>Clear Filters</Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group cursor-pointer" onClick={() => selectProduct(product)}>
                <div className="relative img-zoom rounded-lg overflow-hidden bg-secondary aspect-square">
                  <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                  {product.comparePrice && <Badge className="absolute top-3 left-3 bg-foreground text-background text-[10px]">-{Math.round((1 - product.price / product.comparePrice) * 100)}%</Badge>}
                  {product.aiTags && <Badge variant="secondary" className="absolute top-3 right-3 text-[9px] gap-1"><Sparkles className="w-2.5 h-2.5" />AI</Badge>}
                  <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button size="sm" className="flex-1 h-9 bg-foreground text-background text-xs tracking-wider rounded-lg" onClick={e => addToCart(e, product)}>Add to Bag</Button>
                    <Button size="icon" variant="secondary" className={`h-9 w-9 rounded-lg ${wishlistIds.has(product.id) ? 'bg-foreground text-background' : ''}`} onClick={e => toggleWish(e, product.id)}><Heart className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-3 space-y-0.5">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{product.category?.name}</p>
                  <h3 className="text-sm font-medium tracking-wide">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-light">${product.price.toLocaleString()}</span>
                    {product.comparePrice && <span className="text-xs text-muted-foreground line-through">${product.comparePrice.toLocaleString()}</span>}
                  </div>
                  <div className="flex items-center gap-1"><Star className="w-3 h-3 fill-foreground text-foreground" /><span className="text-xs text-muted-foreground">{product.rating}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex gap-4 p-3 rounded-lg border border-border hover:border-border cursor-pointer group transition-colors"
                onClick={() => selectProduct(product)}>
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-secondary shrink-0">
                  <Image src={product.image} alt={product.name} width={128} height={128} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{product.category?.name}</p>
                  <h3 className="text-sm font-medium tracking-wide mt-0.5">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-light">${product.price.toLocaleString()}</span>
                    {product.comparePrice && <span className="text-xs text-muted-foreground line-through">${product.comparePrice.toLocaleString()}</span>}
                    <span className="text-xs text-muted-foreground">{product.reviewCount} reviews</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" className="bg-foreground text-background text-xs tracking-wider rounded-lg h-9" onClick={e => addToCart(e, product)}>Add to Bag</Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
