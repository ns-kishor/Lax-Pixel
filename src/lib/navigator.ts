import type { View } from './store';

/**
 * SPA Navigation Utility
 * 
 * Maps between View state and browser URLs using clean path-based URLs.
 * Every navigation creates a browser history entry for proper Back/Forward support.
 */

// ─── View → URL ───────────────────────────────────────────────
export function buildUrl(view: View, params?: Record<string, string>): string {
  const sp = new URLSearchParams();

  switch (view) {
    case 'home':
      return '/';
    case 'shop': {
      if (params?.category) sp.set('category', params.category);
      if (params?.q) sp.set('q', params.q);
      if (params?.sort) sp.set('sort', params.sort);
      const qs = sp.toString();
      return `/shop${qs ? '?' + qs : ''}`;
    }
    case 'content':
      return `/page/${params?.slug || 'about'}`;
    case 'seller-store':
      if (params?.shopSlug && params?.sellerCode) {
        return `/${params.shopSlug}/${params.sellerCode}`;
      }
      return `/store/${params?.id || ''}`;
    case 'product':
      return `/product/${params?.id || ''}`;
    case 'cart':
      return '/cart';
    case 'checkout':
      return '/checkout';
    case 'orders':
      return '/orders';
    case 'order-detail':
      return `/order/${params?.id || ''}`;
    case 'auth':
      return '/auth';
    case 'tracking':
      return '/tracking';
    case 'account':
      return '/account';
    case 'seller-dashboard':
      return '/seller';
    case 'admin-login':
      return '/admin/login';
    case 'admin':
      return '/admin';
    case 'support':
      return '/support';
    default:
      return '/';
  }
}

// ─── URL → View ───────────────────────────────────────────────
export interface ParsedRoute {
  view: View;
  params: Record<string, string>;
}

export function parseUrl(pathname: string, search: string): ParsedRoute {
  const params = new URLSearchParams(search);
  const result: ParsedRoute = { view: 'home', params: {} };

  const rawPath = typeof pathname === 'string' ? pathname : '';
  const decodedPath = (() => {
    try {
      return decodeURIComponent(rawPath).replace(/\/+$/, '') || '/';
    } catch {
      return rawPath.replace(/\/+$/, '') || '/';
    }
  })();

  // /product/[id]
  const productMatch = decodedPath.match(/^\/product\/([^/]+)$/);
  if (productMatch) {
    result.view = 'product';
    result.params.id = productMatch[1];
    return result;
  }

  // /order/[id]
  const orderMatch = decodedPath.match(/^\/order\/([^/]+)$/);
  if (orderMatch) {
    result.view = 'order-detail';
    result.params.id = orderMatch[1];
    return result;
  }

  // /page/[slug]
  const pageMatch = decodedPath.match(/^\/page\/([^/]+)$/);
  if (pageMatch) {
    result.view = 'content';
    result.params.slug = pageMatch[1];
    return result;
  }

  // /store/[id] or /seller-store/[id]
  const storeMatch = decodedPath.match(/^\/(?:store|seller-store)\/([^/]+)$/);
  if (storeMatch) {
    result.view = 'seller-store';
    result.params.id = storeMatch[1];
    return result;
  }

  // /[shop-name]/[9-digit-code] custom seller profile link
  const customSellerMatch = decodedPath.match(/^\/([^/]+)\/(\d{9})$/);
  if (customSellerMatch) {
    result.view = 'seller-store';
    result.params.id = customSellerMatch[2];
    result.params.sellerCode = customSellerMatch[2];
    result.params.shopSlug = customSellerMatch[1];
    return result;
  }

  // Simple path-based views
  const viewMap: Record<string, View> = {
    '/shop': 'shop',
    '/cart': 'cart',
    '/checkout': 'checkout',
    '/orders': 'orders',
    '/auth': 'auth',
    '/tracking': 'tracking',
    '/account': 'account',
    '/support': 'support',
    '/seller': 'seller-dashboard',
    '/admin/login': 'admin-login',
    '/admin': 'admin',
  };

  const matchedView = viewMap[decodedPath] || viewMap[rawPath];
  if (matchedView) {
    result.view = matchedView;
    if (params.has('category')) result.params.category = params.get('category')!;
    if (params.has('q')) result.params.q = params.get('q')!;
    if (params.has('sort')) result.params.sort = params.get('sort')!;
    return result;
  }

  return result;
}

// ─── Push history entry ────────────────────────────────────────
export function pushNavigation(view: View, params?: Record<string, string>): void {
  const url = buildUrl(view, params);
  window.history.pushState({ view, ...params }, '', url);
}

// ─── Replace current history entry (no new entry) ─────────────
export function replaceNavigation(view: View, params?: Record<string, string>): void {
  const url = buildUrl(view, params);
  window.history.replaceState({ view, ...params }, '', url);
}

// ─── Get current URL's route info ─────────────────────────────
export function getCurrentRoute(): ParsedRoute {
  return parseUrl(window.location.pathname, window.location.search);
}
