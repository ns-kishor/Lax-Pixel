'use client';

import { useState, useEffect } from 'react';
import { useStore, authHeaders, safeImgSrc, Product } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Store,
  Star,
  CheckCircle2,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  ShoppingBag,
  Heart,
  Search,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  PackageCheck,
  TrendingUp,
  ShieldCheck,
  Loader2,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SellerData {
  id: string;
  name: string;
  companyName: string;
  description: string;
  logo: string | null;
  banner: string | null;
  rating: number;
  totalSales: number;
  approved: boolean;
  whatsapp?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  joinedAt?: string;
  totalProducts: number;
  totalReviews: number;
}

export function SellerStoreView() {
  const {
    selectedSellerId,
    products: allGlobalProducts,
    selectProduct,
    setCart,
    setSelectedCartItemIds,
    setView,
    user,
    showToast,
    wishlistIds,
    toggleWishlist,
    setJustAddedToCart,
    goBack,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'popular'>('featured');

  // Identify sellerId from store or URL (safely handling trailing slashes and slug/code paths)
  const sellerId = selectedSellerId || (() => {
    if (typeof window === 'undefined') return '';
    const cleanSegments = window.location.pathname.split('/').filter(Boolean);
    return cleanSegments[cleanSegments.length - 1] || '';
  })();

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/sellers/${sellerId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load seller');
        return res.json();
      })
      .then((data) => {
        if (data.seller) {
          setSeller(data.seller);
          setSellerProducts(data.products || []);
        }
      })
      .catch((err) => {
        console.error('Error loading seller profile:', err);
        // Fallback: try filtering from globally loaded products
        const matching = allGlobalProducts.filter((p) => p.sellerId === sellerId);
        if (matching.length > 0) {
          const first = matching[0];
          setSeller({
            id: sellerId,
            name: first.seller?.name || 'Verified Seller',
            companyName: first.seller?.sellerProfile?.companyName || first.seller?.name || 'Seller Store',
            description: first.seller?.sellerProfile?.description || 'Authentic & curated luxury collection.',
            logo: first.seller?.sellerProfile?.logo || first.seller?.avatar || null,
            banner: null,
            rating: first.seller?.sellerProfile?.rating || 4.9,
            totalSales: first.seller?.sellerProfile?.totalSales || 150,
            approved: true,
            whatsapp: first.seller?.sellerProfile?.whatsapp || '',
            phone: first.seller?.sellerProfile?.phone || '',
            email: first.seller?.sellerProfile?.email || '',
            city: first.seller?.sellerProfile?.city || 'Dhaka',
            country: 'Bangladesh',
            totalProducts: matching.length,
            totalReviews: matching.reduce((sum, p) => sum + (p.reviewCount || 0), 0),
          });
          setSellerProducts(matching);
        }
      })
      .finally(() => setLoading(false));
  }, [sellerId, allGlobalProducts]);

  // Fast add to bag
  const handleAddToCart = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      showToast('Please sign in to add items to bag', 'info');
      setView('auth');
      return;
    }
    setJustAddedToCart(product.id);
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: authHeaders(useStore.getState),
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
      const updatedCart = await res.json();
      setCart(updatedCart);
      showToast(`"${product.name}" added to bag`);
    } catch {
      showToast('Failed to add to bag', 'error');
    }
  };

  // 1-Click Buy Now (adds to cart, isolates selection, and proceeds directly to checkout)
  const handleBuyNow = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      showToast('Please sign in to buy this product', 'info');
      setView('auth');
      return;
    }
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: authHeaders(useStore.getState),
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const res = await fetch('/api/cart', { headers: authHeaders(useStore.getState) });
      const updatedCart = await res.json();
      setCart(updatedCart);
      // Find the cart item id for this product
      const targetItem = Array.isArray(updatedCart)
        ? updatedCart.find((ci: any) => ci.productId === product.id)
        : null;
      if (targetItem) {
        setSelectedCartItemIds([targetItem.id]);
      }
      setView('checkout');
    } catch {
      showToast('Failed to start checkout', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm font-light text-muted-foreground">Loading seller store...</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex flex-col items-center justify-center text-center px-4">
        <Store className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-light tracking-tight mb-2">Seller Store Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          The seller profile you are looking for may have been removed or is temporarily unavailable.
        </p>
        <Button onClick={() => setView('shop')} className="bg-foreground text-background text-xs tracking-wider uppercase">
          Browse All Products
        </Button>
      </div>
    );
  }

  // Derive categories from seller products
  const uniqueCategories = Array.from(
    new Set(sellerProducts.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  // Filter and sort products
  const filteredProducts = sellerProducts
    .filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || p.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'popular') return (b.salesCount || 0) - (a.salesCount || 0);
      return 0; // featured/default
    });

  const cleanWaNumber = (seller.whatsapp || '').replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen pt-24 pb-28 lg:pb-20">
      <div className="max-w-[1720px] 2xl:max-w-[1880px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 space-y-8">
        {/* Navigation Back button */}
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* ─── Seller Header Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary/80 to-background p-6 sm:p-8 lg:p-10 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Logo & Store Information */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-secondary border border-border shrink-0 flex items-center justify-center">
                {seller.logo ? (
                  <Image
                    src={safeImgSrc(seller.logo)}
                    alt={seller.companyName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Store className="w-10 h-10 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
                    {seller.companyName || seller.name}
                  </h1>
                  {seller.approved && (
                    <Badge className="bg-foreground text-background text-[11px] font-normal tracking-wide flex items-center gap-1 py-0.5 px-2.5">
                      <CheckCircle2 className="w-3 h-3 text-background" /> Verified Seller
                    </Badge>
                  )}
                </div>

                {seller.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                    {seller.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
                    <span>{seller.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">
                      ({seller.totalReviews} reviews)
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{seller.totalSales.toLocaleString()}+ Sales</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{seller.totalProducts} Products</span>
                  </div>
                  {seller.city && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{seller.city}, {seller.country}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Seller Contact & Verification Badges */}
            <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2.5 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
              {seller.whatsapp && (
                <a
                  href={`https://wa.me/${cleanWaNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border transition-colors text-foreground"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Chat
                </a>
              )}
              {seller.phone && (
                <a
                  href={`tel:${seller.phone}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border transition-colors text-foreground"
                >
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {seller.phone}
                </a>
              )}
              {seller.email && (
                <a
                  href={`mailto:${seller.email}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border transition-colors text-foreground"
                >
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {seller.email}
                </a>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-foreground" />
                <span>Buyer Protection & Authentic Guarantee</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Search, Category Filter & Sorting ─── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search in ${seller.companyName || 'this store'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-secondary/50 border-border text-xs rounded-xl"
            />
          </div>

          {/* Categories & Sorting controls */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {/* Category pills */}
            <div className="flex items-center gap-1.5 bg-secondary/40 p-1 rounded-xl border border-border shrink-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({sellerProducts.length})
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort products by"
              className="h-10 px-3 bg-secondary/60 border border-border rounded-xl text-xs text-foreground focus:outline-none cursor-pointer shrink-0"
            >
              <option value="featured">Featured</option>
              <option value="popular">Best Selling</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* ─── Product Catalog Grid ─── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light tracking-tight">
              Products ({filteredProducts.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Directly fulfilled & guaranteed by {seller.companyName}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-secondary/30 rounded-2xl border border-border">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-light text-foreground">No products match your filter</p>
              <p className="text-xs text-muted-foreground mt-1">Try resetting the search or category filter.</p>
              {(searchQuery || selectedCategory !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredProducts.map((product) => {
                  const discount = product.comparePrice
                    ? Math.round((1 - product.price / product.comparePrice) * 100)
                    : 0;
                  const isWished = wishlistIds.has(product.id);

                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-foreground/30"
                    >
                      {/* Product Image */}
                      <div
                        onClick={() => selectProduct(product)}
                        className="relative aspect-square overflow-hidden bg-secondary cursor-pointer"
                      >
                        <Image
                          src={safeImgSrc(product.image)}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {discount > 0 && (
                          <Badge className="absolute top-3 left-3 bg-foreground text-background text-[10px] tracking-wide py-0.5 px-2">
                            -{discount}%
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              setView('auth');
                              return;
                            }
                            toggleWishlist(product.id);
                            showToast(isWished ? 'Removed from wishlist' : 'Added to wishlist', 'info');
                          }}
                          aria-label="Wishlist"
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${isWished ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
                        </button>
                      </div>

                      {/* Content & Details */}
                      <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                        <div onClick={() => selectProduct(product)} className="cursor-pointer space-y-1">
                          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                            {product.category?.name || 'Luxury'}
                          </p>
                          <h3 className="text-sm font-medium tracking-tight text-foreground line-clamp-1 group-hover:text-muted-foreground transition-colors">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 pt-0.5">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
                              <span className="text-xs font-medium text-foreground">{product.rating}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              ({product.reviewCount || 0} reviews)
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-auto">
                              {product.salesCount || 0} sold
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-base font-light text-foreground">
                            ${product.price.toLocaleString()}
                          </span>
                          {product.comparePrice && (
                            <span className="text-xs text-muted-foreground line-through">
                              ${product.comparePrice.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Direct Purchase Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleAddToCart(product, e)}
                            className="h-9 rounded-xl border-border hover:bg-secondary text-[11px] font-medium tracking-wide flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> Add to Bag
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => handleBuyNow(product, e)}
                            className="h-9 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-[11px] font-medium tracking-wide flex items-center justify-center gap-1"
                          >
                            <Zap className="w-3.5 h-3.5" /> Buy Now
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
