'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Ticket, Power, PowerOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CouponForm {
  code: string;
  discountType: string;
  discountValue: string;
  minOrderAmount: string;
  maxUses: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

const emptyForm: CouponForm = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderAmount: '',
  maxUses: '',
  startDate: '',
  endDate: '',
  active: true,
};

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { showToast } = useStore();

  const PER_PAGE = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/admin/coupons?${params}`, { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const filteredCoupons = debouncedSearch
    ? coupons.filter(c => c.code.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : coupons;

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / PER_PAGE));
  const paginatedCoupons = filteredCoupons.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditId(coupon.id);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: String(coupon.minOrderAmount),
      maxUses: coupon.maxUses !== null ? String(coupon.maxUses) : '',
      startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : '',
      endDate: coupon.endDate ? coupon.endDate.slice(0, 10) : '',
      active: coupon.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code) {
      showToast('Coupon code is required', 'error');
      return;
    }
    const dv = parseFloat(form.discountValue);
    if (isNaN(dv) || dv <= 0) {
      showToast('Discount value must be a positive number', 'error');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && dv > 100) {
      showToast('Percentage cannot exceed 100', 'error');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: form.code.toUpperCase(),
        discountType: form.discountType,
        discountValue: dv,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxUses: form.maxUses !== '' ? parseInt(form.maxUses, 10) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        active: form.active,
      };

      let res: Response;
      if (editId) {
        res = await fetch(`/api/admin/coupons?id=${editId}`, {
          method: 'PATCH',
          headers: adminHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: adminHeaders(),
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        showToast(editId ? 'Coupon updated' : 'Coupon created');
        setDialogOpen(false);
        fetchCoupons();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showToast('Coupon deleted');
        setDeleteTarget(null);
        fetchCoupons();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons?id=${coupon.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ active: !coupon.active }),
      });
      if (res.ok) {
        showToast(coupon.active ? 'Coupon deactivated' : 'Coupon activated');
        fetchCoupons();
      } else {
        showToast('Failed to toggle', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">{coupons.length} coupons</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-48 rounded-md border border-border bg-secondary px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <Button onClick={openAdd} className="bg-foreground text-background text-xs tracking-wider h-9 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Coupon
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : paginatedCoupons.length === 0 ? (
          <div className="py-16 text-center">
            <Ticket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No coupons found</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Code</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Type</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Value</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Min Order</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Usage</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Active</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Dates</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCoupons.map((coupon, i) => (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="p-3 font-mono text-xs font-medium">{coupon.code}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {coupon.discountType}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {coupon.minOrderAmount > 0 ? `$${coupon.minOrderAmount}` : '—'}
                    </td>
                    <td className="p-3 text-xs">
                      <span className={coupon.maxUses && coupon.usedCount >= coupon.maxUses ? 'text-destructive' : ''}>
                        {coupon.usedCount}
                      </span>
                      {coupon.maxUses !== null && (
                        <span className="text-muted-foreground">/{coupon.maxUses}</span>
                      )}
                      {coupon.maxUses === null && (
                        <span className="text-muted-foreground">/∞</span>
                      )}
                    </td>
                    <td className="p-3">
                      {coupon.active ? (
                        <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {coupon.startDate || coupon.endDate ? (
                        <>
                          {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : '—'}
                          <br />
                          {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : '—'}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleActive(coupon)}
                          disabled={togglingId === coupon.id}
                          title={coupon.active ? 'Deactivate' : 'Activate'}
                        >
                          {coupon.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(coupon)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog
                          open={!!deleteTarget && deleteTarget.id === coupon.id}
                          onOpenChange={open => !open && setDeleteTarget(null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={coupon.usedCount > 0}
                              title={coupon.usedCount > 0 ? 'Cannot delete: has been used' : 'Delete coupon'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete coupon <span className="font-mono font-medium text-foreground">{coupon.code}</span>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
                                {deleting ? 'Deleting…' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Code</Label>
              <Input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                className="h-9 bg-secondary border-border text-sm font-mono"
                disabled={!!editId}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Discount Type</Label>
                <select
                  value={form.discountType}
                  onChange={e => setForm({ ...form, discountType: e.target.value })}
                  className="h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed ($)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Discount Value</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={e => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                  className="h-9 bg-secondary border-border text-sm"
                  min="0"
                  max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                  step={form.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Min Order Amount</Label>
                <Input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={e => setForm({ ...form, minOrderAmount: e.target.value })}
                  placeholder="0"
                  className="h-9 bg-secondary border-border text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Max Uses</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={e => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Unlimited"
                  className="h-9 bg-secondary border-border text-sm"
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="h-9 bg-secondary border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                  className="h-9 bg-secondary border-border text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Active</Label>
              <Switch checked={form.active} onCheckedChange={checked => setForm({ ...form, active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-foreground text-background text-xs">
              {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
