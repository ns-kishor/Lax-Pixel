'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, MapPin, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
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
};

const steps = ['ORDERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export function TrackingView() {
  const { goBack, user, showToast, selectOrder, orders } = useStore();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const track = async () => {
    if (!orderNumber.trim()) { showToast('Enter an order number', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/tracking?orderNumber=${orderNumber.trim()}`);
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); setOrder(null); }
      else setOrder(data);
    } catch { showToast('Failed to track', 'error'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <button onClick={goBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-light tracking-tight">Track Your Order</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter your order number to see real-time tracking</p>
        </div>

        <div className="flex gap-3 max-w-lg mx-auto mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} onKeyDown={e => e.key === 'Enter' && track()}
              placeholder="e.g. NOR-MTEJTX9N" className="pl-10 h-11 bg-white/5 border-white/10 text-sm rounded-lg" />
          </div>
          <Button className="h-11 bg-foreground text-background text-xs tracking-wider px-6 rounded-lg" onClick={track} disabled={loading}>
            {loading ? '...' : 'Track'}
          </Button>
        </div>

        {user && orders.length > 0 && !order && (
          <div className="mb-12">
            <p className="text-xs tracking-wider uppercase text-muted-foreground mb-3">Your Recent Orders</p>
            <div className="space-y-2">
              {orders.slice(0, 3).map(o => (
                <button key={o.id} onClick={() => { setOrderNumber(o.orderNumber); setOrder(o); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary border border-white/5 hover:border-white/10 transition-colors">
                  <span className="text-sm font-medium">{o.orderNumber}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[o.status] || ''}`}>{o.status}</Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {order && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-light">{order.orderNumber}</h2>
                <p className="text-xs text-muted-foreground">Placed {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={`text-xs tracking-wider ${statusColors[order.status] || ''}`}>{order.status}</Badge>
            </div>

            {/* Items preview */}
            <div className="flex gap-3 mb-8">
              {order.items.map((item, idx) => (
                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-white/5 relative">
                  <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="p-6 rounded-xl bg-secondary border border-white/5">
              <h3 className="text-sm font-medium tracking-wide mb-6 flex items-center gap-2"><MapPin className="w-4 h-4" /> Shipment Progress</h3>
              <div className="relative">
                {steps.map((step, idx) => {
                  const completed = idx <= steps.indexOf(order.status);
                  const entry = order.tracking.find(t => t.status === step);
                  return (
                    <div key={step} className="flex gap-4 pb-8 last:pb-0 relative">
                      {idx < steps.length - 1 && <div className={`absolute left-[15px] top-8 w-px h-full ${completed ? 'bg-foreground/30' : 'bg-white/10'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${completed ? 'bg-foreground text-background' : 'bg-white/5 border border-white/10'}`}>
                        {completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <div className="pt-1">
                        <p className={`text-sm ${completed ? 'font-medium' : 'text-muted-foreground'}`}>{step.replace(/_/g, ' ')}</p>
                        {entry && <p className="text-xs text-muted-foreground mt-0.5">{entry.description}{entry.location ? ` — ${entry.location}` : ''}</p>}
                        {entry && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(entry.timestamp).toLocaleString()}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}