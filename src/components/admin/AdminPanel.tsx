'use client';

import { useState, useEffect, Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Users, Package, ShoppingCart, FolderTree,
  Ticket, ImageIcon, CreditCard, Settings, FileCheck, FootprintsIcon, Store,
  LogOut, Menu, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsers } from './AdminUsers';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminCategories } from './AdminCategories';
import { AdminCoupons } from './AdminCoupons';
import { AdminHeroSlider } from './AdminHeroSlider';
import { AdminPaymentMethods } from './AdminPaymentMethods';
import { AdminPaymentProofs } from './AdminPaymentProofs';
import { AdminFooter } from './AdminFooter';
import { AdminSellers } from './AdminSellers';
import { AdminSettings } from './AdminSettings';
import { adminHeaders } from '@/lib/admin-utils';
import { useStore } from '@/lib/store';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Error boundary to prevent one broken tab from crashing the whole admin panel
class AdminTabErrorBoundary extends Component<
  { children: ReactNode; tabName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Something went wrong</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">Failed to load the {this.props.tabName} section. {this.state.error?.message || ''}</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => this.setState({ hasError: false, error: null })}>
            <RotateCcw className="w-3.5 h-3.5" /> Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export type AdminTab =
  | 'dashboard' | 'users' | 'products' | 'orders' | 'categories'
  | 'coupons' | 'hero-slider' | 'payment-methods' | 'payment-proofs'
  | 'footer' | 'sellers' | 'settings';

const sidebarItems: { key: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'categories', label: 'Categories', icon: FolderTree },
  { key: 'coupons', label: 'Coupons', icon: Ticket },
  { key: 'hero-slider', label: 'Hero Slider', icon: ImageIcon },
  { key: 'payment-methods', label: 'Payments', icon: CreditCard },
  { key: 'payment-proofs', label: 'Payment Proof', icon: FileCheck },
  { key: 'footer', label: 'Footer', icon: FootprintsIcon },
  { key: 'sellers', label: 'Sellers', icon: Store },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarContentProps {
  admin: { id: string; email: string; name: string; role: string };
  activeTab: AdminTab;
  onSwitchTab: (tab: AdminTab) => void;
  onLogout: () => void;
}

function SidebarContent({ admin, activeTab, onSwitchTab, onLogout }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
            <span className="text-xs font-bold">LP</span>
          </div>
          <div>
            <p className="text-sm font-light tracking-[0.15em]">Lax Pixel</p>
            <p className="text-[10px] text-muted-foreground tracking-wider">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sidebarItems.map(item => (
          <button
            key={item.key}
            onClick={() => onSwitchTab(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === item.key
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left text-xs tracking-wider uppercase">{item.label}</span>
            {activeTab === item.key && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium truncate">{admin.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{admin.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:bg-secondary gap-2 h-9"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { adminUser, setAdminUser, setAdminAuthed, setView, showToast } = useStore();

  useEffect(() => {
    if (!adminUser) setView('admin-login');
  }, [adminUser, setView]);

  if (!adminUser) return null;

  const handleLogout = async () => {
    try { await fetch('/api/admin/auth', { method: 'DELETE', headers: adminHeaders() }); } catch {}
    localStorage.removeItem('admin-token');
    setAdminUser(null);
    setAdminAuthed(false);
    showToast('Logged out', 'info');
    setView('home');
  };

  const switchTab = (tab: AdminTab) => { setActiveTab(tab); setSidebarOpen(false); };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboard />;
      case 'users': return <AdminUsers />;
      case 'products': return <AdminProducts />;
      case 'orders': return <AdminOrders />;
      case 'categories': return <AdminCategories />;
      case 'coupons': return <AdminCoupons />;
      case 'hero-slider': return <AdminHeroSlider />;
      case 'payment-methods': return <AdminPaymentMethods />;
      case 'payment-proofs': return <AdminPaymentProofs />;
      case 'footer': return <AdminFooter />;
      case 'sellers': return <AdminSellers />;
      case 'settings': return <AdminSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col shrink-0">
        <SidebarContent admin={adminUser} activeTab={activeTab} onSwitchTab={switchTab} onLogout={handleLogout} />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-60 bg-card border-r border-border flex-col shrink-0 md:hidden"
            >
              <SidebarContent admin={adminUser} activeTab={activeTab} onSwitchTab={switchTab} onLogout={handleLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-secondary" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
              {sidebarItems.find(i => i.key === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{adminUser.name}</span>
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
              {adminUser.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AdminTabErrorBoundary tabName={sidebarItems.find(i => i.key === activeTab)?.label || activeTab}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </AdminTabErrorBoundary>
        </main>
      </div>
    </div>
  );
}
