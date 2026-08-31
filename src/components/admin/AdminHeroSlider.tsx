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
import { Plus, Pencil, Trash2, ImageIcon, Power, PowerOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface Product {
  id: string;
  name: string;
  image: string | null;
  price: number;
}

interface HeroSlide {
  id: string;
  productId: string;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  product: Product;
}

interface SlideForm {
  productId: string;
  startDate: string;
  endDate: string;
  sortOrder: string;
  active: boolean;
}

const emptyForm: SlideForm = {
  productId: '',
  startDate: '',
  endDate: '',
  sortOrder: '0',
  active: true,
};

export function AdminHeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { showToast } = useStore();

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hero', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSlides(data.slides || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products?limit=100', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.products || []);
        setProducts(list.map((p: { id: string; name: string; image: string | null; price: number }) => ({
          id: p.id,
          name: p.name,
          image: p.image,
          price: p.price,
        })));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSlides();
    fetchProducts();
  }, [fetchSlides, fetchProducts]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditId(slide.id);
    setForm({
      productId: slide.productId,
      startDate: slide.startDate ? slide.startDate.slice(0, 10) : '',
      endDate: slide.endDate ? slide.endDate.slice(0, 10) : '',
      sortOrder: String(slide.sortOrder),
      active: slide.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.productId) {
      showToast('Please select a product', 'error');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        productId: form.productId,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        active: form.active,
      };

      let res: Response;
      if (editId) {
        res = await fetch(`/api/admin/hero?id=${editId}`, {
          method: 'PATCH',
          headers: adminHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/hero', {
          method: 'POST',
          headers: adminHeaders(),
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        showToast(editId ? 'Slide updated' : 'Slide created');
        setDialogOpen(false);
        fetchSlides();
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
      const res = await fetch(`/api/admin/hero?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showToast('Slide deleted');
        setDeleteTarget(null);
        fetchSlides();
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

  const handleToggleActive = async (slide: HeroSlide) => {
    setTogglingId(slide.id);
    try {
      const res = await fetch(`/api/admin/hero?id=${slide.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ active: !slide.active }),
      });
      if (res.ok) {
        showToast(slide.active ? 'Slide deactivated' : 'Slide activated');
        fetchSlides();
      } else {
        showToast('Failed to toggle', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const getProductName = (productId: string) => {
    const p = products.find(pr => pr.id === productId);
    return p ? p.name : 'Unknown Product';
  };

  const getProductImage = (productId: string) => {
    const p = products.find(pr => pr.id === productId);
    return p?.image || null;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{slides.length} slides</p>
        <Button onClick={openAdd} className="bg-foreground text-background text-xs tracking-wider h-9 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Slide
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : slides.length === 0 ? (
          <div className="py-16 text-center">
            <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hero slides yet</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">#</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Product</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Active Dates</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Status</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slides.map((slide, i) => (
                  <motion.tr
                    key={slide.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="p-3 text-xs font-medium w-12">{slide.sortOrder}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {getProductImage(slide.productId) && (
                          <img
                            src={getProductImage(slide.productId)!}
                            alt=""
                            className="w-10 h-10 rounded-md object-cover border border-border"
                          />
                        )}
                        <div>
                          <p className="text-xs font-medium">{slide.product?.name || getProductName(slide.productId)}</p>
                          <p className="text-[10px] text-muted-foreground">${slide.product?.price || 0}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {slide.startDate || slide.endDate ? (
                        <>
                          {slide.startDate ? new Date(slide.startDate).toLocaleDateString() : '—'}
                          <br />
                          {slide.endDate ? new Date(slide.endDate).toLocaleDateString() : '—'}
                        </>
                      ) : (
                        'Always'
                      )}
                    </td>
                    <td className="p-3">
                      {slide.active ? (
                        <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleActive(slide)}
                          disabled={togglingId === slide.id}
                          title={slide.active ? 'Deactivate' : 'Activate'}
                        >
                          {slide.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(slide)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog
                          open={!!deleteTarget && deleteTarget.id === slide.id}
                          onOpenChange={open => !open && setDeleteTarget(null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete slide">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Slide</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this hero slide? This action cannot be undone.
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? 'Edit Slide' : 'Add Slide'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product</Label>
              <select
                value={form.productId}
                onChange={e => setForm({ ...form, productId: e.target.value })}
                className="h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm"
              >
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>
                ))}
              </select>
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
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Sort Order</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                placeholder="0"
                className="h-9 bg-secondary border-border text-sm"
                min="0"
              />
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
