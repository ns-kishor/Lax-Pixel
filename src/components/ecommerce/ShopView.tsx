'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, Grid3X3, List, Search, X, Star, Heart, Store, ShoppingBag, ChevronRight, ArrowRight, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/store';
import Image from 'next/image';

export function ShopView() {
  const {
    products, categories, setProducts, selectProduct, selectSellerStore,
    searchQuery, setSearchQuery, shopCategory, setShopCategory,
    shopSort, setShopSort, user, showToast, wishlistIds, toggleWishlist,
    setJustAddedToCart, setView
  } = useStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [fetching, setFetching] = useState(false);
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
    let active = true;
    const load = async () => {
      setFetching(true);
      const params = new URLSearchParams();
      if (shopCategory) params.set('category', shopCategory);
      if (searchQuery) params.set('search', searchQuery);
      params.set('sort', shopSort);
      try {
        const res = await fetch(`/api/products?${params}`);
        if (res.ok && active) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch {}
      finally {
        if (active) setFetching(false);
      }
    };
    load();
    return () => { active = false; };
  }, [shopCategory, shopSort, searchQuery, setProducts]);

  const handleCategoryChange = (slug: string) => {
    setShopCategory(slug);
    if (slug) {
      useStore.getState().setView('shop', { category: slug });
    } else {
      useStore.getState().setView('shop');
    }
  };

  const filtered = useMemo(() => {
    let f = Array.isArray(products) ? [...products] : [];
    if (priceRange[0] > 0) f = f.filter(p => p.price >= priceRange[0]);
    if (priceRange[1] < 50000) f = f.filter(p => p.price <= priceRange[1]);
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

  const currentCategoryName = categories.find(c => c.slug === shopCategory)?.name;

  return (
    <div className="min-h-screen pt-28 pb-28 lg:pb-16 bg-background">
      <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
        {/* Breadcrumb & Title */}
        <div className="mb-6 border-b border-border pb-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <button onClick={() => setView('home')} className="hover:text-foreground transition-colors">Home</button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
            <button onClick={() => handleCategoryChange('')} className="hover:text-foreground transition-colors">Shop</button>
            {currentCategoryName && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-foreground font-medium">{currentCategoryName}</span>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-foreground uppercase">
              {searchQuery ? `Search: "${searchQuery}"` : currentCategoryName || 'All Collections'}
            </h1>
            <p className="text-xs text-muted-foreground tracking-wider uppercase font-medium">
              Showing {filtered.length} {filtered.length === 1 ? 'Product' : 'Products'}
            </p>
          </div>
        </div>

        {/* Mobile Filter & Sort Bar */}
        <div className="lg:hidden flex items-center justify-between gap-2.5 mb-5 pb-3 border-b border-border">
          <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-4 text-xs gap-2 border-border font-medium flex-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter ({shopCategory ? '1' : '0'})
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-xl bg-background border-t border-border p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-sm font-semibold uppercase tracking-wider">Filters</SheetTitle>
                  <button
                    onClick={() => { handleCategoryChange(''); setPriceRange([0, 50000]); setMobileFilterOpen(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground tracking-wider uppercase"
                  >
                    Reset
                  </button>
                </div>
              </SheetHeader>
              <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                <div>
                  <p className="text-xs tracking-wider uppercase font-semibold text-foreground mb-3">Categories</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => { handleCategoryChange(''); setMobileFilterOpen(false); }}
                      className={`text-left px-3 py-2 rounded-md text-xs tracking-wider uppercase transition-colors ${!shopCategory ? 'bg-foreground text-background font-semibold' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      All Categories
                    </button>
                    {(categories || []).map(c => (
                      <button
                        key={c.id}
                        onClick={() => { handleCategoryChange(c.slug); setMobileFilterOpen(false); }}
                        className={`text-left px-3 py-2 rounded-md text-xs tracking-wider uppercase transition-colors ${shopCategory === c.slug ? 'bg-foreground text-background font-semibold' : 'text-muted-foreground hover:bg-secondary'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs tracking-wider uppercase font-semibold text-foreground mb-3">Price Range (৳ BDT)</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange[0] || ''}
                      onChange={e => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                      className="h-9 bg-secondary border-border text-xs font-mono"
                    />
                    <span className="text-muted-foreground text-xs">—</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange[1] < 50000 ? priceRange[1] : ''}
                      onChange={e => setPriceRange([priceRange[0], Number(e.target.value) || 50000])}
                      className="h-9 bg-secondary border-border text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border bg-secondary/30">
                <Button className="w-full h-11 bg-foreground text-background text-xs tracking-widest uppercase rounded-md font-semibold" onClick={() => setMobileFilterOpen(false)}>
                  Show {filtered.length} Results
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort Selector */}
          <Select value={shopSort} onValueChange={setShopSort}>
            <SelectTrigger className="h-9 w-40 bg-secondary border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="createdAt">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>

          {/* Grid/List switch */}
          <div className="flex border border-border rounded-md overflow-hidden shrink-0">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('grid')} aria-label="Grid view">
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('list')} aria-label="List view">
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Main Layout Grid (Desktop Sidebar + Content) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Left Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 space-y-6 pr-4 border-r border-border">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">Categories</h3>
                {shopCategory && (
                  <button onClick={() => handleCategoryChange('')} className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider">
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleCategoryChange('')}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs tracking-wider uppercase transition-colors flex items-center justify-between ${
                    !shopCategory
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <span>All Collections</span>
                  <span className="text-[10px] opacity-70">({products.length})</span>
                </button>
                {(categories || []).map((c) => {
                  const count = products.filter(p => p.categoryId === c.id || p.category?.slug === c.slug).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleCategoryChange(c.slug)}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs tracking-wider uppercase transition-colors flex items-center justify-between ${
                        shopCategory === c.slug
                          ? 'bg-foreground text-background font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">Price (৳ BDT)</h3>
                {(priceRange[0] > 0 || priceRange[1] < 50000) && (
                  <button onClick={() => setPriceRange([0, 50000])} className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider">
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ''}
                  onChange={e => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                  className="h-8 bg-secondary border-border text-xs font-mono"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] < 50000 ? priceRange[1] : ''}
                  onChange={e => setPriceRange([priceRange[0], Number(e.target.value) || 50000])}
                  className="h-8 bg-secondary border-border text-xs font-mono"
                />
              </div>
            </div>

            {/* Clear All Filters Button */}
            {(shopCategory || searchQuery || priceRange[0] > 0 || priceRange[1] < 50000) && (
              <div className="border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleCategoryChange('');
                    setSearchQuery('');
                    setPriceRange([0, 50000]);
                  }}
                  className="w-full text-xs uppercase tracking-wider border-border hover:bg-foreground hover:text-background font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Clear All Filters
                </Button>
              </div>
            )}
          </aside>

          {/* Desktop Right Main Area */}
          <main className="lg:col-span-9 space-y-6">
            {/* Desktop Toolbar */}
            <div className="hidden lg:flex items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search products in this collection..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 bg-secondary border-border rounded-md text-xs tracking-wide focus:bg-background"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Select value={shopSort} onValueChange={setShopSort}>
                  <SelectTrigger className="w-44 h-9 bg-secondary border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="createdAt">Sort: Newest</SelectItem>
                    <SelectItem value="price-asc">Sort: Price Low to High</SelectItem>
                    <SelectItem value="price-desc">Sort: Price High to Low</SelectItem>
                    <SelectItem value="rating">Sort: Top Rated</SelectItem>
                    <SelectItem value="popular">Sort: Most Popular</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border border-border rounded-md overflow-hidden shrink-0">
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('grid')} aria-label="Grid view">
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('list')} aria-label="List view">
                    <List className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Products Display */}
            {filtered.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded-xl">
                <p className="text-base font-light text-foreground uppercase tracking-wider">No products match your criteria</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters, price range, or search keyword.</p>
                <Button
                  variant="outline"
                  className="mt-5 border-border text-xs tracking-wider uppercase font-medium hover:bg-foreground hover:text-background"
                  onClick={() => {
                    setSearchQuery('');
                    handleCategoryChange('');
                    setPriceRange([0, 50000]);
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5 xl:gap-6">
                {filtered.map((product, i) => {
                  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
                  const isWished = wishlistIds.has(product.id);
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group cursor-pointer flex flex-col justify-between"
                      onClick={() => selectProduct(product)}
                    >
                      <div className="relative img-zoom rounded-xl overflow-hidden bg-secondary aspect-square border border-border shadow-xs group-hover:border-foreground/40 transition-all duration-300">
                        <Image
                          src={safeImgSrc(product.image)}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />

                        {discount > 0 && (
                          <Badge className="absolute top-2.5 left-2.5 bg-foreground text-background text-[9px] tracking-wider font-semibold px-2 py-0.5 shadow-xs">
                            -{discount}%
                          </Badge>
                        )}

                        {/* Wishlist button */}
                        <button
                          onClick={(e) => toggleWish(e, product.id)}
                          aria-label="Wishlist"
                          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-200 border border-border shadow-xs ${
                            isWished
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-background text-foreground hover:bg-secondary'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isWished ? 'fill-current' : ''}`} />
                        </button>

                        {/* Mobile Quick Add Button */}
                        <button
                          onClick={(e) => addToCart(e, product)}
                          aria-label="Add to Bag"
                          className="lg:hidden absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-foreground active:scale-90 shadow-sm z-10"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>

                        {/* Desktop Hover Action */}
                        <div className="hidden lg:flex absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-2 z-10 bg-gradient-to-t from-background/95 via-background/60 to-transparent">
                          <Button
                            size="sm"
                            className="flex-1 h-9 bg-foreground text-background text-xs tracking-wider uppercase hover:bg-foreground/90 rounded-md font-medium shadow-xs"
                            onClick={(e) => addToCart(e, product)}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Add to Bag
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground truncate">
                            {product.category?.name || 'Exclusive'}
                          </p>
                          {product.sellerId && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                selectSellerStore(product.sellerId);
                              }}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors hover:underline shrink-0 max-w-[95px]"
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
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex gap-4 p-3.5 rounded-xl border border-border hover:border-foreground/40 cursor-pointer group transition-colors bg-card"
                    onClick={() => selectProduct(product)}
                  >
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-secondary shrink-0 relative">
                      <Image src={safeImgSrc(product.image)} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{product.category?.name}</p>
                          {product.sellerId && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                selectSellerStore(product.sellerId);
                              }}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors hover:underline"
                              title="View Seller Store"
                            >
                              <Store className="w-2.5 h-2.5" />
                              <span>{product.seller?.sellerProfile?.companyName || product.seller?.name || 'Store'}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium tracking-wide mt-1 text-foreground">{product.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-light">{product.description}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-medium text-foreground">৳ {product.price.toLocaleString()}</span>
                        {product.comparePrice && (
                          <span className="text-xs text-muted-foreground line-through">৳ {product.comparePrice.toLocaleString()}</span>
                        )}
                        <span className="text-xs text-muted-foreground">({product.reviewCount} reviews)</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-foreground text-background text-xs tracking-wider uppercase rounded-md h-9 px-4 font-medium"
                        onClick={e => addToCart(e, product)}
                      >
                        Add to Bag
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
