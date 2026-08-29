import { create } from 'zustand';

export type View =
  | 'home' | 'shop' | 'product' | 'cart' | 'checkout' | 'account' | 'orders'
  | 'order-detail' | 'seller-dashboard' | 'seller-products' | 'seller-orders'
  | 'auth' | 'tracking' | 'search';

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
  previousView: View | null;
  setView: (view: View) => void;
  goBack: () => void;

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
}

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  view: 'home',
  previousView: null,
  setView: (view) => set({ previousView: get().view, view }),
  goBack: () => {
    const prev = get().previousView;
    if (prev) set({ view: prev, previousView: 'home' });
    else set({ view: 'home', previousView: null });
  },

  // Auth
  user: null,
  sellerProfile: null,
  setUser: (user, profile) => set({ user, sellerProfile: profile || null }),
  logout: () => set({ user: null, sellerProfile: null, cart: [], orders: [], view: 'home' }),

  // Products
  products: [],
  categories: [],
  selectedProduct: null,
  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  selectProduct: (product) => set({ selectedProduct: product, view: 'product', previousView: get().view }),

  // Cart
  cart: [],
  setCart: (cart) => set({ cart }),
  cartCount: () => get().cart.reduce((s, i) => s + i.quantity, 0),
  cartTotal: () => get().cart.reduce((s, i) => s + i.product.price * i.quantity, 0),

  // Orders
  orders: [],
  selectedOrder: null,
  setOrders: (orders) => set({ orders }),
  selectOrder: (order) => set({ selectedOrder: order, view: 'order-detail', previousView: 'orders' }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // AI Chat
  chatMessages: [{ id: '0', role: 'assistant', content: 'Welcome to NOIR. I am your AI shopping assistant. How may I help you today?', timestamp: new Date() }],
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
