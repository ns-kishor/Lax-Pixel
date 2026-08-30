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

  // /product/[id]
  const productMatch = pathname.match(/^\/product\/([^/]+)$/);
  if (productMatch) {
    result.view = 'product';
    result.params.id = productMatch[1];
    return result;
  }

  // /order/[id]
  const orderMatch = pathname.match(/^\/order\/([^/]+)$/);
  if (orderMatch) {
    result.view = 'order-detail';
    result.params.id = orderMatch[1];
    return result;
  }

  // /page/[slug]
  const pageMatch = pathname.match(/^\/page\/([^/]+)$/);
  if (pageMatch) {
    result.view = 'content';
    result.params.slug = pageMatch[1];
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
    '/seller': 'seller-dashboard',
  };

  if (viewMap[pathname]) {
    result.view = viewMap[pathname];
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
