import { create } from 'zustand';
import { pushNavigation, replaceNavigation, parseUrl } from './navigator';

export type View =
  | 'home' | 'shop' | 'product' | 'cart' | 'checkout' | 'account' | 'orders'
  | 'order-detail' | 'seller-dashboard' | 'seller-products' | 'seller-orders'
  | 'auth' | 'tracking' | 'search' | 'content'
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
  sellerId: string;
  stock: number;
  featured: boolean;
  rating: number;
  reviewCount: number;
  salesCount: number;
  tags: string;
  aiGenerated: boolean;
  aiTags: string;
  createdAt: string;
  category?: { id: string; name: string; slug: string };
  seller?: { id: string; name: string };
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
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
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  _count?: { products: number };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AppState {
  // Navigation
  view: View;
  setView: (view: View, params?: Record<string, string>) => void;
  goBack: () => void;
  _setViewDirect: (view: View) => void;

  // Auth
  user: User | null;
  sellerProfile: SellerProfile | null;
  setUser: (user: User | null, profile?: SellerProfile | null) => void;
  logout: () => void;

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
  shopSort: string;
  setShopSort: (sort: string) => void;

  // AI Chat
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  chatLoading: boolean;
  setChatMessages: (msgs: ChatMessage[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setChatOpen: (open: boolean) => void;
  setChatLoading: (loading: boolean) => void;

  // Wishlist
  wishlistIds: Set<string>;
  toggleWishlist: (productId: string) => void;
  setWishlist: (ids: string[]) => void;

  // AI Recommendations
  recommendations: Product[];
  setRecommendations: (products: Product[]) => void;

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
  sellerStats: { productCount: number; totalRevenue: number; totalOrders: number; pendingOrders: number } | null;
  sellerProducts: Product[];
  sellerOrders: Order[];
  setSellerData: (data: { stats: typeof AppState.sellerStats; products: Product[]; orders: Order[] }) => void;

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
  sellerProfile: null,
  setUser: (user, profile) => set({ user, sellerProfile: profile || null }),
  logout: () => {
    pushNavigation('home');
    set({ user: null, sellerProfile: null, cart: [], orders: [], view: 'home' });
  },

  // Products
  products: [],
  categories: [],
  selectedProduct: null,
  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  selectProduct: (product) => {
    pushNavigation('product', { id: product.id });
    set({ selectedProduct: product, view: 'product' });
  },

  // Cart
  cart: [],
  setCart: (cart) => set({ cart }),
  cartCount: () => get().cart.reduce((s, i) => s + i.quantity, 0),
  cartTotal: () => get().cart.reduce((s, i) => s + i.product.price * i.quantity, 0),

  // Orders
  orders: [],
  selectedOrder: null,
  setOrders: (orders) => set({ orders }),
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
  shopSort: 'createdAt',
  setShopSort: (sort) => set({ shopSort: sort }),

  // AI Chat
  chatMessages: [{ id: '0', role: 'assistant', content: 'Welcome to Lax Pixel. I am your AI shopping assistant. How may I help you today?', timestamp: new Date() }],
  chatOpen: false,
  chatLoading: false,
  setChatMessages: (msgs) => set({ chatMessages: msgs }),
  addChatMessage: (msg) => set({ chatMessages: [...get().chatMessages, msg] }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setChatLoading: (loading) => set({ chatLoading: loading }),

  // Wishlist
  wishlistIds: new Set<string>(),
  toggleWishlist: (productId) => {
    const current = new Set(get().wishlistIds);
    if (current.has(productId)) current.delete(productId);
    else current.add(productId);
    set({ wishlistIds: current });
  },
  setWishlist: (ids) => set({ wishlistIds: new Set(ids) }),

  // AI Recommendations
  recommendations: [],
  setRecommendations: (products) => set({ recommendations: products }),

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
  setSellerData: (data) => set({ sellerStats: data.stats, sellerProducts: data.products, sellerOrders: data.orders }),

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
export function authHeaders(getStore: () => AppState): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = getStore().user;
  if (user) {
    h['x-user-id'] = user.id;
    if (user.role === 'SELLER') h['x-seller-id'] = user.id;
  }
  return h;
}

/** Safe image src helper — returns a placeholder if the value is empty/falsy */
export function safeImgSrc(src: string | undefined | null): string {
  if (src && src.trim()) return src;
  return '/products/hero.png';
}
