'use client';

import { useEffect, useState } from 'react';
import { useStore, authHeaders, formatPrice, safeImgSrc, Product } from '@/lib/store';
import { Heart, Trash2, ShoppingBag, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function WishlistView() {
  const {
    products,
    wishlistIds,
    toggleWishlist,
    setJustAddedToCart,
    selectProduct,
    setView,
    user,
    showToast,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);

  // Synchronize products based on wishlistIds
  useEffect(() => {
    // If we have products loaded in store, filter from them
    const matched = products.filter(p => wishlistIds.has(p.id));
    setWishlistProducts(matched);

    // If user is logged in and products might not be all in memory, fetch fresh from API
    if (user && wishlistIds.size > 0 && matched.length < wishlistIds.size) {
      setLoading(true);
      fetch('/api/wishlist', { headers: authHeaders(useStore.getState) })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const fetchedProds = data.map(item => item.product).filter(Boolean);
            if (fetchedProds.length > 0) {
              setWishlistProducts(fetchedProds);
            }
          }
        })
        .catch(err => console.error('Wishlist fetch error:', err))
        .finally(() => setLoading(false));
    }
  }, [wishlistIds, products, user]);

  const handleRemove = async (productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleWishlist(productId);
    showToast('Removed from wishlist', 'info');
    if (user) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: authHeaders(useStore.getState),
          body: JSON.stringify({ productId }),
        });
      } catch (err) {
        console.error('Failed to sync wishlist remove:', err);
      }
    }
  };

  const handleAddToCart = async (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.stock <= 0) {
      showToast('This product is currently out of stock', 'error');
      return;
    }

    setJustAddedToCart(product.id);

    if (user) {
      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: authHeaders(useStore.getState),
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
        });
        if (res.ok) {
          const freshCart = await (await fetch('/api/cart', { headers: authHeaders(useStore.getState) })).json();
          useStore.getState().setCart(Array.isArray(freshCart) ? freshCart : []);
          showToast(`Added "${product.name}" to bag`, 'success');
        }
      } catch (err) {
        console.error('Failed to add to cart:', err);
        showToast('Failed to add to cart', 'error');
      }
    } else {
      // Guest cart
      const currentCart = useStore.getState().cart;
      const existing = currentCart.find(c => c.productId === product.id);
      if (existing) {
        useStore.getState().setCart(
          currentCart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c)
        );
      } else {
        useStore.getState().setCart([
          ...currentCart,
          {
            id: `guest_${Date.now()}`,
            userId: 'guest',
            productId: product.id,
            quantity: 1,
            product,
          },
        ]);
      }
      showToast(`Added "${product.name}" to bag`, 'success');
    }
  };

  return (
    <div className="min-h-screen py-8 lg:py-12 bg-background">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
        {/* Top Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
          <div>
            <button
              onClick={() => setView('shop')}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Continue Shopping
            </button>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight flex items-center gap-2.5">
              <span>My Wishlist</span>
              <span className="text-sm font-normal text-muted-foreground px-2.5 py-0.5 rounded-full bg-secondary border border-border">
                {wishlistProducts.length}
              </span>
            </h1>
          </div>

          {wishlistProducts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView('shop')}
              className="text-xs h-9 border-border rounded-lg self-start sm:self-auto"
            >
              Explore More Products <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          )}
        </div>

        {/* Content */}
        {wishlistProducts.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-5 text-muted-foreground">
              <Heart className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-medium tracking-tight mb-2">Your wishlist is empty</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Explore our luxury collections, curate your favorite pieces, and access them anytime in one place.
            </p>
            <Button
              onClick={() => setView('shop')}
              className="h-10 px-6 bg-foreground text-background text-xs tracking-wider uppercase rounded-xl hover:opacity-90 transition-opacity"
            >
              Explore Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlistProducts.map(product => {
              const inStock = product.stock > 0;
              const hasDiscount = product.comparePrice && product.comparePrice > product.price;
              const discountPct = hasDiscount
                ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  onClick={() => selectProduct(product)}
                  className="group relative flex flex-col rounded-xl bg-card border border-border overflow-hidden hover:border-foreground/30 hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Image container */}
                  <div className="relative aspect-square overflow-hidden bg-secondary">
                    <img
                      src={safeImgSrc(product.image)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Remove button */}
                    <button
                      onClick={(e) => handleRemove(product.id, e)}
                      aria-label="Remove from wishlist"
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-background transition-all shadow-sm z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Discount badge */}
                    {hasDiscount && (
                      <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                        -{discountPct}%
                      </span>
                    )}

                    {/* Out of Stock overlay badge */}
                    {!inStock && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                        <Badge variant="secondary" className="text-[10px] tracking-wider uppercase bg-background/90 text-foreground border border-border">
                          Out of Stock
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {product.category?.name && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                          {product.category.name}
                        </p>
                      )}
                      <h3 className="text-xs sm:text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-foreground">
                          {formatPrice(product.price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.comparePrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={!inStock}
                        onClick={(e) => handleAddToCart(product, e)}
                        className="w-full h-8 text-[11px] font-medium tracking-wide bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                        {inStock ? 'Add to Bag' : 'Sold Out'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
