'use client';

import { useEffect, useState } from 'react';
import { adminHeaders } from '@/lib/admin-utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, DollarSign, ShoppingCart, Package, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardData {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    userName: string;
    itemCount: number;
  }[];
  ordersByStatus: Record<string, number>;
  topProducts: {
    id: string;
    name: string;
    price: number;
    salesCount: number;
    image: string;
    categoryName: string;
  }[];
}

const statusBadge: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  DELIVERED: { variant: 'outline', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  SHIPPED: { variant: 'secondary', className: '' },
  PROCESSING: { variant: 'outline', className: '' },
  CONFIRMED: { variant: 'outline', className: '' },
  PENDING: { variant: 'destructive', className: '' },
  CANCELLED: { variant: 'outline', className: 'bg-muted text-muted-foreground' },
};

const statusBarColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-blue-500',
  PROCESSING: 'bg-purple-500',
  SHIPPED: 'bg-cyan-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-muted-foreground',
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard', { headers: adminHeaders() });
        if (res.ok) setData(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>;

  const statCards = [
    { label: 'Total Users', value: data.totalUsers, icon: Users, format: false },
    { label: 'Total Revenue', value: data.totalRevenue, icon: DollarSign, format: true },
    { label: 'Total Orders', value: data.totalOrders, icon: ShoppingCart, format: false },
    { label: 'Total Products', value: data.totalProducts, icon: Package, format: false },
  ];

  const totalStatusCount = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="p-5 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-light">
              {s.format ? `$${s.value.toLocaleString()}` : s.value.toLocaleString()}
            </p>
            <p className="text-[10px] tracking-wider uppercase text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium tracking-wide">Recent Orders</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] tracking-wider uppercase">Order #</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Amount</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Status</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.slice(0, 5).map(order => {
                  const badge = statusBadge[order.status] || statusBadge.PENDING;
                  return (
                    <TableRow key={order.id} className="border-border">
                      <TableCell className="text-xs font-mono">{order.orderNumber}</TableCell>
                      <TableCell className="text-xs">{order.userName}</TableCell>
                      <TableCell className="text-xs">${order.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className={`text-[10px] ${badge.className}`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Orders by status */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-medium tracking-wide mb-4">Orders by Status</h3>
            <div className="space-y-2.5">
              {Object.entries(data.ordersByStatus).map(([status, count]) => {
                const pct = (count / totalStatusCount) * 100;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{status}</span>
                      <span className="text-xs font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className={`h-full rounded-full ${statusBarColors[status] || 'bg-muted-foreground'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top products */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-medium tracking-wide mb-4">Top Products</h3>
            <div className="space-y-3">
              {data.topProducts.map((product, idx) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground">{product.categoryName} · {product.salesCount} sold</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl bg-card border border-border">
            <Skeleton className="w-5 h-5 mb-3" />
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl bg-card border border-border p-4">
          <Skeleton className="h-4 w-32 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="rounded-xl bg-card border border-border p-4">
            <Skeleton className="h-4 w-28 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mb-3">
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
