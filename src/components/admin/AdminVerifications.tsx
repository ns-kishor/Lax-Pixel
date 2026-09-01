'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Clock, Shield, User, Building2, MapPin, Phone, Globe, FileText, Eye, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminHeaders } from '@/lib/admin-utils';
import { cn } from '@/lib/utils';

interface Verification {
  id: string;
  businessName: string;
  businessType: string;
  businessAddress: string;
  businessCity: string;
  businessCountry: string;
  nidNumber: string;
  phone: string;
  website: string | null;
  description: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string };
}

const statusCfg: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  PENDING: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock, label: 'Pending' },
  APPROVED: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle, label: 'Rejected' },
};

export function AdminVerifications() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Verification | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const fetchVerifications = async () => {
    try {
      const res = await fetch('/api/admin/verifications', { headers: adminHeaders() });
      const data = await res.json();
      setVerifications(data.verifications || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchVerifications(); }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'PUT', headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejectReason: reason }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setSelected(null);
      setRejectOpen(false);
      setRejectReason('');
      fetchVerifications();
    } catch {} finally { setActionLoading(false); }
  };

  const filtered = filter === 'ALL' ? verifications : verifications.filter(v => v.status === filter);
  const pendingCount = verifications.filter(v => v.status === 'PENDING').length;

  const statusIconColor = (s: string) => {
    if (s === 'PENDING') return 'text-yellow-500';
    if (s === 'APPROVED') return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(status => {
          const cfg = statusCfg[status];
          const count = verifications.filter(v => v.status === status).length;
          const IconComp = cfg.icon;
          const isActive = filter === status;
          return (
            <button key={status} onClick={() => setFilter(isActive ? 'ALL' : status)}
              className={cn('p-4 rounded-xl border text-left transition-colors', isActive ? 'border-foreground bg-secondary' : 'border-border hover:border')}>
              <div className="flex items-center gap-2 mb-2">
                <IconComp className={cn('w-4 h-4', statusIconColor(status))} />
                <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{cfg.label}</span>
              </div>
              <p className="text-2xl font-light">{count}</p>
            </button>
          );
        })}
      </div>

      {pendingCount > 0 && (
        <p className="text-xs text-yellow-500">{pendingCount} pending verification{pendingCount > 1 ? 's' : ''} awaiting review</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No verification requests found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const cfg = statusCfg[v.status] || statusCfg.PENDING;
            return (
              <div key={v.id} className="p-4 rounded-xl bg-secondary border border-border hover:border transition-colors cursor-pointer" onClick={() => setSelected(v)}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium">{v.user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{v.businessName}</p>
                        <Badge variant="outline" className={cn('text-[9px]', cfg.color)}>{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{v.user.name} ({v.user.email})</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{v.businessType.split('_').join(' ')} - {v.businessCity}, {v.businessCountry}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">Submitted</p>
                      <p className="text-xs">{new Date(v.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setRejectOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-light tracking-wide flex items-center gap-2">
              <Shield className="w-5 h-5" /> Verification Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={cn('text-xs', statusCfg[selected.status]?.color || '')}>{statusCfg[selected.status]?.label || selected.status}</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</span>
              </div>

              {selected.status === 'REJECTED' && selected.rejectReason && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <p className="text-xs font-medium text-red-400">Rejection Reason:</p>
                  <p className="text-xs text-muted-foreground mt-1">{selected.rejectReason}</p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
                <h4 className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-2"><User className="w-3.5 h-3.5" /> Seller Information</h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {selected.user.name}</div>
                  <div><span className="text-muted-foreground">Email:</span> {selected.user.email}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selected.user.phone || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Joined:</span> {new Date(selected.user.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
                <h4 className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Business Information</h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Business Name:</span> {selected.businessName}</div>
                  <div><span className="text-muted-foreground">Type:</span> {selected.businessType.split('_').join(' ')}</div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {selected.businessAddress}</div>
                  <div><span className="text-muted-foreground">City:</span> {selected.businessCity}</div>
                  <div><span className="text-muted-foreground">Country:</span> {selected.businessCountry}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selected.phone}</div>
                  <div><span className="text-muted-foreground">NID / Trade License:</span> {selected.nidNumber}</div>
                  {selected.website && <div className="sm:col-span-2"><span className="text-muted-foreground">Website:</span> {selected.website}</div>}
                  {selected.description && <div className="sm:col-span-2"><span className="text-muted-foreground">Description:</span> {selected.description}</div>}
                </div>
              </div>

              {selected.status === 'PENDING' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs tracking-wider gap-2" onClick={() => handleAction(selected.id, 'APPROVE')} disabled={actionLoading}>
                    <CheckCircle2 className="w-4 h-4" /> {actionLoading ? '...' : 'Approve'}
                  </Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs tracking-wider gap-2" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}

              {rejectOpen && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-3">
                  <Label className="text-xs">Rejection Reason (optional)</Label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} className="w-full p-3 bg-secondary border border-border rounded-md text-sm resize-none" placeholder="Why are you rejecting this verification?" />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs" onClick={() => handleAction(selected.id, 'REJECT', rejectReason)} disabled={actionLoading}>Confirm Reject</Button>
                    <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => { setRejectOpen(false); setRejectReason(''); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
