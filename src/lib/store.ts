import { create } from 'zustand';
import { pushNavigation, replaceNavigation, parseUrl } from './navigator';

export type View =
  | 'home' | 'shop' | 'product' | 'cart' | 'checkout' | 'account' | 'orders'
  | 'order-detail' | 'seller-dashboard' | 'seller-products' | 'seller-orders' | 'seller-store'
  | 'auth' | 'tracking' | 'search' | 'content' | 'support' | 'wishlist'
  | 'admin-login' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'BUYER' | 'SELLER';
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  avatar?: string;
  createdAt?: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  companyName: string;
  description?: string;
  logo?: string;
  website?: string;
  approved: boolean;
  rating: number;
  totalSales: number;
  sellerCode?: string;
}

export interface ProductSpec {
  id?: string;
  productId?: string;
  label: string;
  value: string;
  sortOrder?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  image: string;
  images: string;
  categoryId: string;
  subcategory?: string | null;
  sellerId: string;
  stock: number;
  featured: boolean;
  rating: number;
  reviewCount: number;
  salesCount: number;
  tags: string;
  colors?: string;
  sizes?: string;
  aiGenerated: boolean;
  aiTags: string;
  specs?: ProductSpec[];
  createdAt: string;
  category?: { id: string; name: string; slug: string };
  seller?: {
    id: string;
    name: string;
    avatar?: string;
    sellerProfile?: {
      id?: string;
      companyName?: string;
      logo?: string;
      banner?: string;
      description?: string;
      rating?: number;
      totalSales?: number;
      approved?: boolean;
      whatsapp?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      country?: string;
    } | null;
  };
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  product: Product;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface OrderTracking {
  id: string;
  orderId: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingCode?: string;
  userId: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry: string;
  shippingZip?: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  items: OrderItem[];
  tracking: OrderTracking[];
  user?: { name: string; email: string };
  sellerTotal?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  _count?: { products: number };
}

interface AppState {
  // Navigation
  view: View;
  setView: (view: View, params?: Record<string, string>) => void;
  goBack: () => void;
  _setViewDirect: (view: View) => void;

  // Auth
  user: User | null;
  userToken: string | null;
  sellerProfile: SellerProfile | null;
  setUser: (user: User | null, profile?: SellerProfile | null, token?: string | null) => void;
  setUserToken: (token: string | null) => void;
  setSellerProfile: (profile: SellerProfile | null) => void;
  logout: () => void;
  initAuth: () => void;

  // Products
  products: Product[];
  categories: Category[];
  selectedProduct: Product | null;
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  selectProduct: (product: Product) => void;

  // Cart
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  cartCount: () => number;
  cartTotal: () => number;
  selectedCartItemIds: string[];
  setSelectedCartItemIds: (ids: string[]) => void;
  toggleCartItemSelection: (itemId: string) => void;
  selectAllCartItems: (select: boolean) => void;
  getSelectedCartItems: () => CartItem[];
  getSelectedCartTotal: () => number;

  // Seller Store View for Buyers
  selectedSellerId: string | null;
  selectSellerStore: (sellerId: string) => void;

  // Orders
  orders: Order[];
  selectedOrder: Order | null;
  setOrders: (orders: Order[]) => void;
  selectOrder: (order: Order) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Shop category filter (shared state for URL sync)
  shopCategory: string;
  setShopCategory: (cat: string) => void;
  shopSubcategory: string;
  setShopSubcategory: (subcat: string) => void;
  shopSort: string;
  setShopSort: (sort: string) => void;

  // Wishlist
  wishlistIds: Set<string>;
  toggleWishlist: (productId: string) => void;
  setWishlist: (ids: string[]) => void;

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Mobile menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Seller
  sellerStats: { productCount: number; totalRevenue: number; totalSales?: number; totalOrders: number; pendingOrders: number; confirmedOrders?: number; conversionRate?: number } | null;
  sellerProducts: Product[];
  sellerOrders: Order[];
  setSellerData: (data: { stats?: AppState['sellerStats']; products?: Product[]; orders?: Order[]; profile?: SellerProfile | null }) => void;

  // Add to cart animation
  justAddedToCart: string | null;
  setJustAddedToCart: (productId: string | null) => void;

  // Admin
  adminUser: { id: string; email: string; name: string; role: string } | null;
  adminAuthed: boolean;
  setAdminUser: (admin: { id: string; email: string; name: string; role: string } | null) => void;
  setAdminAuthed: (v: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Navigation — history-aware
  view: 'home',
  setView: (view, params) => {
    pushNavigation(view, params);
    // Sync search query and category from params
    if (params?.q) get().setSearchQuery(params.q);
    if (params?.category) get().setShopCategory(params.category);
    else if (view === 'shop' && !params?.category) get().setShopCategory('');
    // Sync shop sort from params
    if (view === 'shop' && params?.sort) get().setShopSort(params.sort);
    set({ view });
  },
  goBack: () => {
    window.history.back();
  },
  /** Internal: set view without pushing history (used by popstate handler) */
  _setViewDirect: (view) => set({ view }),

  // Auth
  user: null,
  userToken: null,
  sellerProfile: null,
  setUserToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('lp-token', token);
      else localStorage.removeItem('lp-token');
    }
    set({ userToken: token });
  },
  setUser: (user, profile, token) => {
    const currentProfile = profile !== undefined ? profile : get().sellerProfile;
    const currentToken = token !== undefined ? token : get().userToken;
    if (typeof window !== 'undefined') {
      try {
        if (user) {
          localStorage.setItem('lp-user', JSON.stringify(user));
          if (currentProfile) localStorage.setItem('lp-seller-profile', JSON.stringify(currentProfile));
          else localStorage.removeItem('lp-seller-profile');
          if (currentToken) localStorage.setItem('lp-token', currentToken);
        } else {
          localStorage.removeItem('lp-user');
          localStorage.removeItem('lp-seller-profile');
          localStorage.removeItem('lp-token');
        }
      } catch (e) {
        console.error('Failed to save user session to localStorage:', e);
      }
    }
    set({ user, sellerProfile: currentProfile || null, userToken: currentToken || null });
  },
  setSellerProfile: (profile) => {
    if (typeof window !== 'undefined') {
      try {
        if (profile) localStorage.setItem('lp-seller-profile', JSON.stringify(profile));
        else localStorage.removeItem('lp-seller-profile');
      } catch (e) {
        console.error('Failed to save seller profile to localStorage:', e);
      }
    }
    set({ sellerProfile: profile });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('lp-user');
        localStorage.removeItem('lp-seller-profile');
        localStorage.removeItem('lp-token');
      } catch (e) {
        console.error('Failed to clear user session from localStorage:', e);
      }
    }
    pushNavigation('home');
    set({ user: null, userToken: null, sellerProfile: null, cart: [], orders: [], view: 'home' });
  },
  initAuth: () => {
    if (typeof window === 'undefined') return;
    try {
      const rawUser = localStorage.getItem('lp-user');
      const rawProfile = localStorage.getItem('lp-seller-profile');
      const rawToken = localStorage.getItem('lp-token');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const p = rawProfile ? JSON.parse(rawProfile) : null;
        set({ user: u, sellerProfile: p, userToken: rawToken || null });
      }
    } catch (e) {
      console.error('Failed to restore user session:', e);
    }
  },

  // Products
  products: [],
  categories: [],
  selectedProduct: null,
  setProducts: (products) => set({ products: Array.isArray(products) ? products : [] }),
  setCategories: (categories) => set({ categories: Array.isArray(categories) ? categories : [] }),
  selectProduct: (product) => {
    pushNavigation('product', { id: product.id });
    set({ selectedProduct: product, view: 'product' });
  },

  // Cart
  cart: [],
  selectedCartItemIds: [],
  setCart: (cart) => {
    const list = Array.isArray(cart) ? cart : [];
    const validIds = new Set(list.map(i => i.id));
    const prevSelected = get().selectedCartItemIds || [];
    let nextSelected: string[];
    if (prevSelected.length === 0) {
      nextSelected = list.map(i => i.id);
    } else {
      const filtered = prevSelected.filter(id => validIds.has(id));
      nextSelected = filtered.length > 0 ? filtered : list.map(i => i.id);
    }
    set({ cart: list, selectedCartItemIds: nextSelected });
  },
  setSelectedCartItemIds: (ids) => set({ selectedCartItemIds: ids }),
  toggleCartItemSelection: (itemId) => {
    const current = get().selectedCartItemIds;
    if (current.includes(itemId)) {
      set({ selectedCartItemIds: current.filter(id => id !== itemId) });
    } else {
      set({ selectedCartItemIds: [...current, itemId] });
    }
  },
  selectAllCartItems: (select) => {
    if (select) {
      set({ selectedCartItemIds: get().cart.map(i => i.id) });
    } else {
      set({ selectedCartItemIds: [] });
    }
  },
  getSelectedCartItems: () => {
    const { cart, selectedCartItemIds } = get();
    return (Array.isArray(cart) ? cart : []).filter(i => selectedCartItemIds.includes(i.id));
  },
  getSelectedCartTotal: () => {
    const { cart, selectedCartItemIds } = get();
    return (Array.isArray(cart) ? cart : [])
      .filter(i => selectedCartItemIds.includes(i.id))
      .reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  },
  cartCount: () => (Array.isArray(get().cart) ? get().cart : []).reduce((s, i) => s + i.quantity, 0),
  cartTotal: () => (Array.isArray(get().cart) ? get().cart : []).reduce((s, i) => s + i.product.price * i.quantity, 0),

  // Seller store
  selectedSellerId: null,
  selectSellerStore: (sellerId) => {
    pushNavigation('seller-store', { id: sellerId });
    set({ selectedSellerId: sellerId, view: 'seller-store' });
  },

  // Orders
  orders: [],
  selectedOrder: null,
  setOrders: (orders) => set({ orders: Array.isArray(orders) ? orders : [] }),
  selectOrder: (order) => {
    pushNavigation('order-detail', { id: order.id });
    set({ selectedOrder: order, view: 'order-detail' });
  },

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Shop category filter
  shopCategory: '',
  setShopCategory: (cat) => set({ shopCategory: cat }),
  shopSubcategory: '',
  setShopSubcategory: (subcat) => set({ shopSubcategory: subcat }),
  shopSort: 'createdAt',
  setShopSort: (sort) => set({ shopSort: sort }),

  // Wishlist
  wishlistIds: new Set<string>(),
  toggleWishlist: (productId) => {
    const current = new Set(get().wishlistIds);
    if (current.has(productId)) current.delete(productId);
    else current.add(productId);
    set({ wishlistIds: current });
  },
  setWishlist: (ids) => set({ wishlistIds: new Set(ids) }),

  // Toast
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
  clearToast: () => set({ toast: null }),

  // Mobile menu
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // Seller
  sellerStats: null,
  sellerProducts: [],
  sellerOrders: [],
  setSellerData: (data) => {
    if (data?.profile) {
      get().setSellerProfile(data.profile);
    }
    set({
      sellerStats: data?.stats || null,
      sellerProducts: data?.products || [],
      sellerOrders: data?.orders || [],
    });
  },

  // Just added
  justAddedToCart: null,
  setJustAddedToCart: (productId) => {
    set({ justAddedToCart: productId });
    setTimeout(() => set({ justAddedToCart: null }), 1500);
  },

  // Admin
  adminUser: null,
  adminAuthed: false,
  setAdminUser: (admin) => set({ adminUser: admin }),
  setAdminAuthed: (v) => set({ adminAuthed: v }),
}));

// Helper: fetch with user headers
export function authHeaders(getStore: (() => AppState) | AppState): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const store = typeof getStore === 'function' ? getStore() : getStore;
  const user = store?.user;
  const token = store?.userToken || (typeof window !== 'undefined' ? localStorage.getItem('lp-token') : null);
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
    h['x-user-token'] = token;
  }
  if (user) {
    h['x-user-id'] = user.id;
    if (user.role === 'SELLER') h['x-seller-id'] = user.id;
  }
  return h;
}

/** Safe image src helper — returns a clean URL or a placeholder if the value is empty/falsy */
export function safeImgSrc(src: string | undefined | null): string {
  if (!src) return '/products/hero.png';
  const clean = String(src).replace(/[\r\n\t]+/g, '').trim();
  if (clean.length > 0) return clean;
  return '/products/hero.png';
}

/** Standardized Bangladeshi Taka (৳) price formatter */
export function formatPrice(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0)) || 0;
  return `৳ ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Standardized Public Seller Store URL generator.
 * Format: [origin] / [seller-shop-name-slug] / [9-digit-seller-code]
 * Example: https://laxpixel.com/ns-shop/572619968
 */
export function buildSellerShareUrl(
  user?: { id?: string; name?: string } | null,
  profile?: { companyName?: string; sellerCode?: string } | null,
  fallbackName?: string
): string {
  if (typeof window === 'undefined') return '';

  const rawName =
    profile?.companyName?.trim() ||
    fallbackName?.trim() ||
    user?.name?.trim() ||
    'store';

  // Slugify shop name cleanly: handle Unicode letters/numbers, spaces, and punctuation
  const shopSlug =
    rawName
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'store';

  const code = profile?.sellerCode;
  if (!code) return '';

  return `${window.location.origin}/${shopSlug}/${code}`;
}
