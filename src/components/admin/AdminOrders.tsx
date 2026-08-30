'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ShoppingCart, Truck, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import Image from 'next/image';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  product?: { name: string; image: string } | null;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  userName: string;
  itemCount: number;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  items: OrderItem[];
}

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusBadge: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  DELIVERED: { variant: 'outline', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  SHIPPED: { variant: 'secondary', className: '' },
  PROCESSING: { variant: 'outline', className: '' },
  CONFIRMED: { variant: 'outline', className: '' },
  PENDING: { variant: 'destructive', className: '' },
  CANCELLED: { variant: 'outline', className: 'bg-muted text-muted-foreground' },
};

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ orderId: string; status: string; trackingNumber: string; estimatedDelivery: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useStore();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`, { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        const total = data.total || 0;
        setTotalPages(Math.max(1, Math.ceil(total / 20)));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusSelect = (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setStatusUpdate({
      orderId,
      status: newStatus,
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.split('T')[0] : '',
    });
  };

  const confirmStatusUpdate = async () => {
    if (!statusUpdate) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        id: statusUpdate.orderId,
        status: statusUpdate.status,
      };
      if (statusUpdate.trackingNumber) body.trackingNumber = statusUpdate.trackingNumber;
      if (statusUpdate.estimatedDelivery) body.estimatedDelivery = statusUpdate.estimatedDelivery;

      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(`Order updated to ${statusUpdate.status}`);
        setStatusUpdate(null);
        fetchOrders();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showTrackingFields = statusUpdate && ['SHIPPED', 'DELIVERED'].includes(statusUpdate.status);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 bg-card border-border text-xs"
          />
        </div>
        <Select value={statusFilter || 'ALL'} onValueChange={v => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44 h-9 bg-card border-border text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {VALID_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status update floating bar */}
      <AnimatePresence>
        {statusUpdate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl bg-card border border-border space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">
                Update order <span className="font-mono text-muted-foreground">{orders.find(o => o.id === statusUpdate.orderId)?.orderNumber}</span> to{' '}
                <Badge variant={statusBadge[statusUpdate.status]?.variant} className={`text-[10px] ${statusBadge[statusUpdate.status]?.className || ''}`}>
                  {statusUpdate.status}
                </Badge>
              </p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStatusUpdate(null)}>Cancel</Button>
            </div>
            {showTrackingFields && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3 h-3" /> Tracking Number
                  </Label>
                  <Input
                    value={statusUpdate.trackingNumber}
                    onChange={e => setStatusUpdate({ ...statusUpdate, trackingNumber: e.target.value })}
                    placeholder="Enter tracking number..."
                    className="h-9 bg-secondary border-border text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Est. Delivery
                  </Label>
                  <Input
                    type="date"
                    value={statusUpdate.estimatedDelivery}
                    onChange={e => setStatusUpdate({ ...statusUpdate, estimatedDelivery: e.target.value })}
                    className="h-9 bg-secondary border-border text-xs"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={confirmStatusUpdate} disabled={saving} className="bg-foreground text-background text-xs h-9">
                {saving ? 'Updating…' : 'Confirm Update'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Order #</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Items</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Total</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Status</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Date</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, i) => {
                  const isExpanded = expandedId === order.id;
                  const badge = statusBadge[order.status] || statusBadge.PENDING;
                  return (
                    <>
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        <td className="p-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </td>
                        <td className="p-2 text-xs font-mono">{order.orderNumber}</td>
                        <td className="p-2 text-xs">{order.userName}</td>
                        <td className="p-2 text-xs text-muted-foreground">{order.itemCount}</td>
                        <td className="p-2 text-xs">${order.totalAmount.toLocaleString()}</td>
                        <td className="p-2">
                          <Badge variant={badge.variant} className={`text-[10px] ${badge.className}`}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="p-2" onClick={e => e.stopPropagation()}>
                          <Select value={order.status} onValueChange={v => handleStatusSelect(order.id, v)}>
                            <SelectTrigger className="w-32 h-7 text-[10px] bg-secondary border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VALID_STATUSES.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </motion.tr>
                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={8} className="p-0">
                            <AnimatePresence>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 bg-muted/30 border-b border-border">
                                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">Order Items</p>
                                  <div className="space-y-2">
                                    {order.items.map(item => (
                                      <div key={item.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary relative shrink-0">
                                          <Image src={item.productImage} alt={item.productName} fill className="object-cover" sizes="40px" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{item.productName}</p>
                                          <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                        <span className="text-xs">${(item.price * item.quantity).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {order.trackingNumber && (
                                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>Tracking: {order.trackingNumber}</span>
                                      {order.estimatedDelivery && (
                                        <span className="ml-auto">Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </AnimatePresence>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
