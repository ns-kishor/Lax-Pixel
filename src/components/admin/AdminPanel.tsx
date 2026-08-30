'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Users, Package, ShoppingCart, FolderTree,
  LogOut, Menu, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsers } from './AdminUsers';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminCategories } from './AdminCategories';
import { useStore } from '@/lib/store';

export type AdminTab = 'dashboard' | 'users' | 'products' | 'orders' | 'categories';

const sidebarItems: { key: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'categories', label: 'Categories', icon: FolderTree },
];

function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': localStorage.getItem('admin-token') || '',
  };
}

export { adminHeaders };

interface SidebarContentProps {
  admin: { id: string; email: string; name: string; role: string };
  activeTab: AdminTab;
  onSwitchTab: (tab: AdminTab) => void;
  onLogout: () => void;
}

function SidebarContent({ admin, activeTab, onSwitchTab, onLogout }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Branding */}
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

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1">
        {sidebarItems.map(item => (
          <button
            key={item.key}
            onClick={() => onSwitchTab(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
              activeTab === item.key
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1 text-left text-xs tracking-wider uppercase">{item.label}</span>
            {activeTab === item.key && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ))}
      </nav>

      {/* User info + logout */}
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

  // Redirect to login if no admin user (useEffect to avoid render-time setState)
  useEffect(() => {
    if (!adminUser) {
      setView('admin-login');
    }
  }, [adminUser, setView]);

  if (!adminUser) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
        headers: adminHeaders(),
      });
    } catch {
      // ignore
    }
    localStorage.removeItem('admin-token');
    setAdminUser(null);
    setAdminAuthed(false);
    showToast('Logged out', 'info');
    setView('home');
  };

  const switchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboard />;
      case 'users': return <AdminUsers />;
      case 'products': return <AdminProducts />;
      case 'orders': return <AdminOrders />;
      case 'categories': return <AdminCategories />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col shrink-0">
        <SidebarContent admin={adminUser} activeTab={activeTab} onSwitchTab={switchTab} onLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-60 bg-card border-r border-border flex-col shrink-0 md:hidden"
            >
              <SidebarContent admin={adminUser} activeTab={activeTab} onSwitchTab={switchTab} onLogout={handleLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground hover:bg-secondary"
              onClick={() => setSidebarOpen(true)}
            >
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

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
