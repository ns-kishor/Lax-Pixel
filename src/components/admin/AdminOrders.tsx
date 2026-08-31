'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ShoppingCart, Truck, Calendar, FileText, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  productCode?: string;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  createdAt: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry: string;
  shippingZip?: string;
  paymentMethod: string;
  itemCount: number;
  trackingNumber?: string;
  estimatedDelivery?: string;
  items: OrderItem[];
  paymentProofs?: { id: string; status: string; amount: number }[];
}

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'REFUNDED', 'FAILED'];

const statusColor: Record<string, string> = {
  DELIVERED: 'bg-green-500/10 text-green-600',
  SHIPPED: 'bg-blue-500/10 text-blue-600',
  PROCESSING: 'bg-yellow-500/10 text-yellow-600',
  CONFIRMED: 'bg-purple-500/10 text-purple-600',
  PENDING: 'bg-orange-500/10 text-orange-600',
  CANCELLED: 'bg-red-500/10 text-red-600',
};

const paymentColor: Record<string, string> = {
  PAID: 'bg-green-500/10 text-green-600',
  PENDING: 'bg-orange-500/10 text-orange-600',
  REFUNDED: 'bg-red-500/10 text-red-600',
  FAILED: 'bg-red-500/10 text-red-600',
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
  const [paymentUpdate, setPaymentUpdate] = useState<{ orderId: string; paymentStatus: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<AdminOrder | null>(null);
  const { showToast } = useStore();

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(t); }, [search]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`, { headers: adminHeaders() });
      if (res.ok) { const data = await res.json(); setOrders(data.orders || []); setTotalPages(Math.max(1, Math.ceil((data.total || 0) / 20))); }
    } catch {} finally { setLoading(false); }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusSelect = (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setStatusUpdate({ orderId, status: newStatus, trackingNumber: order.trackingNumber || '', estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.split('T')[0] : '' });
  };

  const confirmStatusUpdate = async () => {
    if (!statusUpdate) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { id: statusUpdate.orderId, status: statusUpdate.status };
      if (statusUpdate.trackingNumber) body.trackingNumber = statusUpdate.trackingNumber;
      if (statusUpdate.estimatedDelivery) body.estimatedDelivery = statusUpdate.estimatedDelivery;
      const res = await fetch('/api/admin/orders', { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify(body) });
      if (res.ok) { showToast(`Order updated to ${statusUpdate.status}`); setStatusUpdate(null); fetchOrders(); }
      else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); } finally { setSaving(false); }
  };

  const confirmPaymentUpdate = async () => {
    if (!paymentUpdate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/orders', { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ id: paymentUpdate.orderId, paymentStatus: paymentUpdate.paymentStatus }) });
      if (res.ok) { showToast(`Payment status updated to ${paymentUpdate.paymentStatus}`); setPaymentUpdate(null); fetchOrders(); }
      else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); } finally { setSaving(false); }
  };

  const generateReceipt = (order: AdminOrder) => {
    const orderUrl = `${window.location.origin}/order/${order.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(orderUrl)}`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${order.orderNumber}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:auto;color:#111}@media print{body{padding:20px}}.receipt{border:2px solid #333;padding:30px;position:relative}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #333}.brand{font-size:20px;font-weight:700;letter-spacing:0.1em}.receipt-title{font-size:12px;text-transform:uppercase;letter-spacing:0.2em;color:#666;margin-top:4px}.meta{text-align:right;font-size:12px;color:#555}.meta p{margin:2px 0}.section{margin-bottom:20px}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#888;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#666}td{padding:8px;border-bottom:1px solid #eee}.text-right{text-align:right}.total-row td{font-weight:700;border-top:2px solid #333;font-size:14px}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase}.badge-green{background:#dcfce7;color:#166534}.badge-orange{background:#fef3c7;color:#92400e}.qr-section{position:absolute;top:30px;right:30px;text-align:center}.qr-section img{border:1px solid #ddd;border-radius:4px}.qr-section p{font-size:9px;color:#888;margin-top:4px}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #ddd;text-align:center;font-size:11px;color:#999}.due-box{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;margin-top:12px;font-size:13px;color:#991b1b}</style></head><body><div class="receipt"><div class="qr-section"><img src="${qrUrl}" width="120" height="120" alt="QR Code"/><p>Scan to track order</p></div><div class="header"><div><div class="brand">LAX PIXEL</div><div class="receipt-title">Order Receipt</div></div><div class="meta"><p><strong>Order:</strong> ${order.orderNumber}</p><p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p><p><strong>Status:</strong> <span class="badge ${order.status === 'DELIVERED' ? 'badge-green' : 'badge-orange'}">${order.status}</span></p><p><strong>Payment:</strong> <span class="badge ${order.paymentStatus === 'PAID' ? 'badge-green' : 'badge-orange'}">${order.paymentStatus}</span></p></div></div><div class="section"><div class="section-title">Customer Details</div><p style="font-size:13px"><strong>${order.userName}</strong></p>${order.userEmail ? `<p style="font-size:12px;color:#555">${order.userEmail}</p>` : ''}${order.userPhone ? `<p style="font-size:12px;color:#555">${order.userPhone}</p>` : ''}<p style="font-size:12px;color:#555">${order.shippingAddress}, ${order.shippingCity}, ${order.shippingCountry} ${order.shippingZip || ''}</p></div><div class="section"><div class="section-title">Order Items</div><table><thead><tr><th>Product</th><th>Code</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead><tbody>${order.items.map(item => `<tr><td>${item.productName}</td><td style="font-family:monospace;font-size:11px;color:#666">${item.productCode || '—'}</td><td class="text-right">${item.quantity}</td><td class="text-right">${item.price.toLocaleString()}</td><td class="text-right">${(item.price * item.quantity).toLocaleString()}</td></tr>`).join('')}</tbody></table></div><div class="section"><table style="max-width:300px;margin-left:auto"><tr><td>Subtotal</td><td class="text-right">${order.subtotal?.toLocaleString() || order.totalAmount.toLocaleString()}</td></tr><tr><td>Shipping</td><td class="text-right">${order.shippingCost?.toLocaleString() || '0'}</td></tr><tr><td>Tax</td><td class="text-right">${order.tax?.toLocaleString() || '0'}</td></tr><tr class="total-row"><td>Total</td><td class="text-right">${order.totalAmount.toLocaleString()}</td></tr></table></div><div class="section"><div class="section-title">Payment Information</div><p style="font-size:13px"><strong>Method:</strong> ${order.paymentMethod}</p><p style="font-size:13px"><strong>Status:</strong> ${order.paymentStatus}</p>${order.paymentStatus !== 'PAID' ? '<div class="due-box">Additional payment may be required. Please complete payment to proceed with your order.</div>' : ''}</div><div class="footer">Thank you for shopping with Lax Pixel! If you have any questions, please contact support.</div></div><script>window.onload=function(){window.print()}</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by order number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 bg-card border-border text-xs" />
        </div>
        <select value={statusFilter || 'ALL'} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 w-full sm:w-44 rounded-md border border-border bg-card px-3 text-xs">
          <option value="ALL">All Statuses</option>
          {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Status update bar */}
      <AnimatePresence>
        {statusUpdate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Update order <span className="font-mono text-muted-foreground">{orders.find(o => o.id === statusUpdate.orderId)?.orderNumber}</span> to <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[statusUpdate.status] || ''}`}>{statusUpdate.status}</span></p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStatusUpdate(null)}>Cancel</Button>
            </div>
            {['SHIPPED', 'DELIVERED'].includes(statusUpdate.status) && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1.5"><Truck className="w-3 h-3" /> Tracking Number</Label><Input value={statusUpdate.trackingNumber} onChange={e => setStatusUpdate({ ...statusUpdate, trackingNumber: e.target.value })} placeholder="Enter tracking number..." className="h-9 bg-secondary border-border text-xs" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Est. Delivery</Label><Input type="date" value={statusUpdate.estimatedDelivery} onChange={e => setStatusUpdate({ ...statusUpdate, estimatedDelivery: e.target.value })} className="h-9 bg-secondary border-border text-xs" /></div>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={confirmStatusUpdate} disabled={saving} className="bg-foreground text-background text-xs h-9">{saving ? 'Updating...' : 'Confirm'}</Button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (<p className="p-4 text-sm text-muted-foreground">Loading...</p>) : orders.length === 0 ? (
          <div className="py-16 text-center"><ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No orders found</p></div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr className="border-b border-border">
                  <th className="w-8 p-3"></th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Order #</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden lg:table-cell">Customer</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Items</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Order Status</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden md:table-cell">Payment</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const isExpanded = expandedId === order.id;
                  return (
                    <>
                      <motion.tr key={order.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                        <td className="p-3">{isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</td>
                        <td className="p-3 text-xs font-mono">{order.orderNumber}</td>
                        <td className="p-3 text-xs hidden lg:table-cell">
                          <div>{order.userName}</div>
                          <div className="text-[10px] text-muted-foreground">{order.userEmail}</div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{order.itemCount}</td>
                        <td className="p-3 text-xs">{order.totalAmount.toLocaleString()}</td>
                        <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[order.status] || ''}`}>{order.status}</span></td>
                        <td className="p-3 hidden md:table-cell"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentColor[order.paymentStatus] || ''}`}>{order.paymentStatus}</span></td>
                        <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Receipt" onClick={() => generateReceipt(order)}><FileText className="w-3.5 h-3.5" /></Button>
                            <select value={order.status} onChange={e => handleStatusSelect(order.id, e.target.value)} className="h-7 text-[10px] rounded border border-border bg-secondary px-1.5 w-28">
                              {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                      </motion.tr>
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={9} className="p-0">
                            <div className="p-4 bg-muted/30 border-b border-border">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">Order Items</p>
                                  <div className="space-y-2">
                                    {order.items.map(item => (
                                      <div key={item.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0"><img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{item.productName}</p>
                                          <p className="text-[10px] text-muted-foreground">Code: {item.productCode || '—'} · Qty: {item.quantity}</p>
                                        </div>
                                        <span className="text-xs shrink-0">{(item.price * item.quantity).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Customer</p>
                                    <p className="text-xs"><strong>{order.userName}</strong></p>
                                    {order.userEmail && <p className="text-xs text-muted-foreground">{order.userEmail}</p>}
                                    {order.userPhone && <p className="text-xs text-muted-foreground">{order.userPhone}</p>}
                                    <p className="text-xs text-muted-foreground">{order.shippingAddress}, {order.shippingCity}, {order.shippingCountry}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Payment</p>
                                    <p className="text-xs">Method: <strong>{order.paymentMethod}</strong></p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-muted-foreground">Status:</span>
                                      <select value={order.paymentStatus} onChange={e => setPaymentUpdate({ orderId: order.id, paymentStatus: e.target.value })} className="h-7 text-[10px] rounded border border-border bg-secondary px-1.5">
                                        {VALID_PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                  {order.trackingNumber && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Truck className="w-3.5 h-3.5" /><span>Tracking: {order.trackingNumber}</span></div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment status update dialog */}
      <Dialog open={!!paymentUpdate} onOpenChange={open => !open && setPaymentUpdate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Update Payment Status</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Change payment status to <strong className="text-foreground">{paymentUpdate?.paymentStatus}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" className="text-xs" onClick={() => setPaymentUpdate(null)}>Cancel</Button>
            <Button onClick={confirmPaymentUpdate} disabled={saving} className="bg-foreground text-background text-xs">{saving ? 'Updating...' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
