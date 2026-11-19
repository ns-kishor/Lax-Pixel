'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Ticket, Power, PowerOff, ShieldAlert, Store, UserCheck, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface Coupon {
  id: string;
  code: string;
  type: string;
  appliesTo: string;
  productIds: string | null;
  sellerId: string | null;
  sellerName?: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CouponForm {
  code: string;
  type: string;
  appliesTo: string;
  productIds: string;
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
  type: 'PRODUCT',
  appliesTo: 'ALL',
  productIds: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderAmount: '',
  maxUses: '',
  startDate: '',
  endDate: '',
  active: true,
};

const PER_PAGE = 10;

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'seller_verification' | 'seller_created'>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const { showToast } = useStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch {
      showToast('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = !debouncedSearch || c.code.toLowerCase().includes(debouncedSearch.toLowerCase()) || (c.sellerName && c.sellerName.toLowerCase().includes(debouncedSearch.toLowerCase()));
    if (!matchesSearch) return false;

    if (activeTab === 'product') return c.type === 'PRODUCT';
    if (activeTab === 'seller_verification') return c.type === 'SELLER_VERIFICATION';
    if (activeTab === 'seller_created') return Boolean(c.sellerId);
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / PER_PAGE));
  const paginatedCoupons = filteredCoupons.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type || 'PRODUCT',
      appliesTo: coupon.appliesTo || 'ALL',
      productIds: coupon.productIds || '',
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
    if (!form.code.trim()) {
      showToast('Coupon code is required', 'error');
      return;
    }
    const val = parseFloat(form.discountValue);
    if (isNaN(val) || val <= 0) {
      showToast('Discount value must be positive', 'error');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && val > 100) {
      showToast('Percentage cannot exceed 100', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        appliesTo: form.appliesTo,
        productIds: form.productIds.trim() || null,
        discountType: form.discountType,
        discountValue: val,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxUses: form.maxUses.trim() ? parseInt(form.maxUses, 10) : null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        active: form.active,
      };

      const url = editId ? `/api/admin/coupons?id=${editId}` : '/api/admin/coupons';
      const method = editId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to save coupon', 'error');
        return;
      }

      showToast(editId ? 'Coupon updated' : 'Coupon created');
      setDialogOpen(false);
      fetchCoupons();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
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
        const err = await res.json();
        showToast(err.error || 'Delete failed', 'error');
      }
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons?id=${coupon.id}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !coupon.active }),
      });
      if (res.ok) {
        showToast(coupon.active ? 'Coupon deactivated' : 'Coupon activated');
        fetchCoupons();
      }
    } catch {
      showToast('Failed to toggle status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleBan = async (coupon: Coupon) => {
    setBanningId(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons?id=${coupon.id}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: !coupon.banned }),
      });
      if (res.ok) {
        showToast(coupon.banned ? 'Coupon unbanned' : 'Coupon banned');
        fetchCoupons();
      }
    } catch {
      showToast('Failed to toggle ban status', 'error');
    } finally {
      setBanningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-light tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-foreground" /> Coupon Code System
          </h1>
          <p className="text-xs text-muted-foreground">Manage product coupons and seller verification discount coupons</p>
        </div>
        <Button onClick={openAdd} className="h-9 px-4 text-xs bg-foreground text-background hover:bg-foreground/90 gap-1.5 shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Add Coupon
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('all'); setPage(1); }}
          className="text-xs h-8"
        >
          All ({coupons.length})
        </Button>
        <Button
          variant={activeTab === 'product' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('product'); setPage(1); }}
          className="text-xs h-8 gap-1.5"
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Product Coupons ({coupons.filter(c => c.type === 'PRODUCT').length})
        </Button>
        <Button
          variant={activeTab === 'seller_verification' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('seller_verification'); setPage(1); }}
          className="text-xs h-8 gap-1.5"
        >
          <UserCheck className="w-3.5 h-3.5" /> Seller Verification ({coupons.filter(c => c.type === 'SELLER_VERIFICATION').length})
        </Button>
        <Button
          variant={activeTab === 'seller_created' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('seller_created'); setPage(1); }}
          className="text-xs h-8 gap-1.5"
        >
          <Store className="w-3.5 h-3.5" /> Seller Created ({coupons.filter(c => Boolean(c.sellerId)).length})
        </Button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coupon code or seller..."
            className="h-9 bg-secondary border-border text-xs pl-3"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading coupons...</div>
        ) : paginatedCoupons.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">No coupons found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Type & Target</th>
                  <th className="p-3.5">Creator</th>
                  <th className="p-3.5">Discount</th>
                  <th className="p-3.5">Min Order</th>
                  <th className="p-3.5">Usage</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCoupons.map((coupon, i) => (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-secondary/20 transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-sm text-foreground select-all">{coupon.code}</div>
                      {coupon.banned && (
                        <Badge variant="destructive" className="mt-1 text-[9px] px-1.5 py-0 h-4">
                          BANNED
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {coupon.type === 'SELLER_VERIFICATION' ? (
                          <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px]">
                            Seller Fee
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px]">
                            Product ({coupon.appliesTo === 'SPECIFIC' ? 'Specific Items' : 'All Items'})
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {coupon.sellerId ? (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Store className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{coupon.sellerName || 'Seller Store'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Admin (Platform)</span>
                      )}
                    </td>
                    <td className="p-3.5 font-semibold">
                      {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `৳${coupon.discountValue}`}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {coupon.minOrderAmount > 0 ? `৳${coupon.minOrderAmount}` : 'None'}
                    </td>
                    <td className="p-3.5 font-mono">
                      {coupon.usedCount}
                      {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ' / ∞'}
                    </td>
                    <td className="p-3.5">
                      {coupon.active && !coupon.banned ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Active</Badge>
                      ) : coupon.banned ? (
                        <Badge variant="destructive" className="text-[10px]">Banned</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle Active */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleActive(coupon)}
                          disabled={togglingId === coupon.id}
                          title={coupon.active ? 'Deactivate' : 'Activate'}
                        >
                          {coupon.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </Button>

                        {/* Ban / Unban */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${coupon.banned ? 'text-destructive font-bold' : 'text-muted-foreground hover:text-destructive'}`}
                          onClick={() => handleToggleBan(coupon)}
                          disabled={banningId === coupon.id}
                          title={coupon.banned ? 'Unban Coupon' : 'Ban Coupon (ব্যান করুন)'}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </Button>

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(coupon)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete */}
                        <AlertDialog
                          open={!!deleteTarget && deleteTarget.id === coupon.id}
                          onOpenChange={(open) => !open && setDeleteTarget(null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(coupon)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete coupon <span className="font-mono font-bold text-foreground">{coupon.code}</span>?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-border text-xs text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Prev
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              {editId ? 'Edit Coupon' : 'Create New Coupon'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Coupon Purpose Type */}
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Coupon Type (কুপনের ধরণ)</Label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-secondary px-3 text-xs"
              >
                <option value="PRODUCT">প্রোডাক্ট কুপন (Product Checkout Coupon)</option>
                <option value="SELLER_VERIFICATION">বিক্রেতাদের অ্যাকাউন্ট এপ্রুভাল কুপন (Seller Verification Fee)</option>
              </select>
            </div>

            {/* Code */}
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Coupon Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SAVE20, VERIFY50"
                className="h-9 bg-secondary border-border font-mono uppercase text-xs"
              />
            </div>

            {/* Scope if PRODUCT */}
            {form.type === 'PRODUCT' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Target Scope (প্রযোজ্যতা)</Label>
                <select
                  value={form.appliesTo}
                  onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
                  className="w-full h-9 rounded-md border border-border bg-secondary px-3 text-xs"
                >
                  <option value="ALL">সকল প্রোডাক্টের ক্ষেত্রে (All Products)</option>
                  <option value="SPECIFIC">নির্দিষ্ট প্রোডাক্টের ক্ষেত্রে (Specific Products)</option>
                </select>
              </div>
            )}

            {form.type === 'PRODUCT' && form.appliesTo === 'SPECIFIC' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product IDs (কমা দিয়ে আলাদা করুন)</Label>
                <Input
                  value={form.productIds}
                  onChange={(e) => setForm({ ...form, productIds: e.target.value })}
                  placeholder="prod_1, prod_2"
                  className="h-9 bg-secondary border-border font-mono text-xs"
                />
              </div>
            )}

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Discount Type</Label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                  className="w-full h-9 rounded-md border border-border bg-secondary px-3 text-xs"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (৳)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Discount Value *</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === 'PERCENTAGE' ? '10' : '100'}
                  className="h-9 bg-secondary border-border text-xs"
                />
              </div>
            </div>

            {/* Min Order & Max Uses */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Min Order Amount (৳)</Label>
                <Input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  placeholder="0"
                  className="h-9 bg-secondary border-border text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Max Total Uses</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Unlimited"
                  className="h-9 bg-secondary border-border text-xs"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-9 bg-secondary border-border text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="h-9 bg-secondary border-border text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs">Active Status</Label>
              <Switch checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-foreground text-background text-xs">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
