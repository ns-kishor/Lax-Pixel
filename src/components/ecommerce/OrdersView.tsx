'use client';

import { useEffect, useState } from 'react';
import { useStore, authHeaders, safeImgSrc } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, MapPin, Clock, CheckCircle2, Truck, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Order } from '@/lib/store';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  CONFIRMED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PROCESSING: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  SHIPPED: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  OUT_FOR_DELIVERY: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  DELIVERED: 'bg-green-500/10 text-green-500 border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function OrdersView() {
  const { orders, setOrders, user, selectOrder, setView } = useStore();

  useEffect(() => {
    if (!user) return;
    const h = authHeaders(useStore.getState);
    fetch('/api/orders', { headers: h }).then(r => r.json()).then(setOrders);
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Sign in to view orders</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-light tracking-tight mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No orders yet</p>
            <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('shop')}>Start Shopping</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl bg-secondary border border-border hover:border-border transition-colors cursor-pointer"
                onClick={() => selectOrder(order)}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 3).map(function(item, idx) {
                        return (
                          <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden border-2 border-secondary relative">
                            <Image src={safeImgSrc(item.productImage)} alt={item.productName} fill className="object-cover" />
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.items.length} item{order.items.length > 1 ? 's' : ''} • {new Date(order.createdAt).toLocaleDateString()}</p>
                      {order.trackingCode && <p className="text-[10px] text-muted-foreground font-mono tracking-wider mt-0.5">Code: {order.trackingCode}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={`text-[10px] tracking-wider ${statusColors[order.status] || ''}`}>{order.status}</Badge>
                    {order.paymentStatus === 'PENDING_VERIFICATION' && <Badge variant="outline" className="text-[10px] tracking-wider bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Payment Pending</Badge>}
                    <span className="text-sm font-light">${order.totalAmount.toLocaleString()}</span>
                    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); selectOrder(order); }}><Eye className="w-3.5 h-3.5" />View</Button>
                  </div>
                </div>
                {order.trackingNumber && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tracking: {order.trackingNumber}</span>
                    {order.estimatedDelivery && <span className="text-xs text-muted-foreground ml-auto">Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}</span>}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderDetailView() {
  const { selectedOrder: order, goBack, user, showToast, setOrders } = useStore();
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateDesc, setUpdateDesc] = useState('');

  if (!order) return <div className="pt-24 text-center">Order not found</div>;

  const steps = ['ORDERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentStepIdx = steps.indexOf(order.status);

  const addTrackingUpdate = async () => {
    if (!updateStatus || user?.role !== 'SELLER') return;
    await fetch('/api/tracking', {
      method: 'POST', headers: authHeaders(useStore.getState),
      body: JSON.stringify({ orderId: order.id, status: updateStatus, description: updateDesc || `Order ${updateStatus.toLowerCase()}` }),
    });
    showToast('Tracking updated');
    setUpdateStatus('');
    setUpdateDesc('');
    const res = await fetch('/api/orders', { headers: authHeaders(useStore.getState) });
    useStore.getState().setOrders(await res.json());
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <button onClick={goBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Order {order.orderNumber}</h1>
            <p className="text-xs text-muted-foreground mt-1">Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            {order.trackingCode && <p className="text-xs text-muted-foreground font-mono tracking-widest mt-1">Tracking Code: {order.trackingCode}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={`text-xs tracking-wider px-4 py-1.5 ${statusColors[order.status] || ''}`}>{order.status}</Badge>
            {order.paymentStatus === 'PENDING_VERIFICATION' && <Badge variant="outline" className="text-[10px] tracking-wider bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Payment Pending</Badge>}
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="p-6 rounded-xl bg-secondary border border-border mb-6">
          <h3 className="text-sm font-medium tracking-wide mb-6 flex items-center gap-2"><MapPin className="w-4 h-4" /> Order Tracking</h3>
          <div className="relative">
            {steps.map((step, idx) => {
              const completed = idx <= currentStepIdx;
              const trackingEntry = order.tracking.find(t => t.status === step);
              return (
                <div key={step} className="flex gap-4 pb-8 last:pb-0 relative">
                  {idx < steps.length - 1 && (
                    <div className={`absolute left-[15px] top-8 w-px h-full ${completed ? 'bg-foreground/30' : 'bg-muted'}`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${completed ? 'bg-foreground text-background' : 'bg-secondary border border-border'}`}>
                    {completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div className="pt-1">
                    <p className={`text-sm ${completed ? 'font-medium' : 'text-muted-foreground'}`}>{step.replace(/_/g, ' ')}</p>
                    {trackingEntry && <p className="text-xs text-muted-foreground mt-0.5">{trackingEntry.description}{trackingEntry.location ? ` — ${trackingEntry.location}` : ''}</p>}
                    {trackingEntry && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(trackingEntry.timestamp).toLocaleString()}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items */}
        <div className="p-6 rounded-xl bg-secondary border border-border mb-6">
          <h3 className="text-sm font-medium tracking-wide mb-4">Items</h3>
          <div className="space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-background relative">
                  <Image src={safeImgSrc(item.productImage)} alt={item.productName} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm">${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 rounded-xl bg-secondary border border-border">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium tracking-wide mb-3">Shipping</h3>
              <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
              <p className="text-sm text-muted-foreground">{order.shippingCity}, {order.shippingCountry} {order.shippingZip}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium tracking-wide mb-3">Payment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{order.paymentMethod}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={order.paymentStatus === 'PENDING_VERIFICATION' ? 'text-yellow-500' : ''}>{order.paymentStatus?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${order.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>${order.shippingCost}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${order.tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium pt-2 border-t border-border"><span>Total</span><span>${order.totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Seller tracking update */}
        {user?.role === 'SELLER' && (
          <div className="mt-6 p-6 rounded-xl bg-secondary border border-border">
            <h3 className="text-sm font-medium tracking-wide mb-4">Update Tracking</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={updateStatus} onChange={e => setUpdateStatus(e.target.value)} className="h-10 px-3 bg-secondary border border-border rounded-lg text-xs">
                <option value="">Select status...</option>
                {steps.slice(1).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <input value={updateDesc} onChange={e => setUpdateDesc(e.target.value)} placeholder="Description (optional)" className="flex-1 h-10 px-3 bg-secondary border border-border rounded-lg text-xs" />
              <Button size="sm" className="bg-foreground text-background text-xs" onClick={addTrackingUpdate} disabled={!updateStatus}>Update</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
