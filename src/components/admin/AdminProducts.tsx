'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Trash2, Pencil, Star, StarOff, ChevronLeft, ChevronRight, Package, Plus, X, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  featured: boolean;
  image: string;
  images: string;
  description: string;
  categoryId: string;
  productCode?: string;
  specs?: { id: string; label: string; value: string }[];
  category?: { id: string; name: string; slug: string } | null;
  seller?: { id: string; name: string } | null;
}

interface AdminCategory { id: string; name: string; slug: string; }

interface SpecField { label: string; value: string; }

const emptyForm = {
  name: '', price: '', comparePrice: '', stock: '', description: '',
  featured: false, categoryId: '', productCode: '', tags: '',
  images: '' as string, specs: [] as SpecField[],
};

export function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editTarget, setEditTarget] = useState<AdminProduct | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useStore();

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(t); }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category', categoryFilter);
      if (featuredFilter && featuredFilter !== 'ALL') params.set('featured', featuredFilter);
      const res = await fetch(`/api/admin/products?${params}`, { headers: adminHeaders() });
      if (res.ok) { const data = await res.json(); setProducts(data.products || data); setTotalPages(data.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  }, [page, debouncedSearch, categoryFilter, featuredFilter]);

  const fetchCategories = useCallback(async () => {
    try { const res = await fetch('/api/admin/categories', { headers: adminHeaders() }); if (res.ok) setCategories(await res.json()); } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openNew = () => {
    setIsNew(true);
    setEditTarget(null);
    setForm({ ...emptyForm, specs: [] });
  };

  const openEdit = (p: AdminProduct) => {
    setIsNew(false);
    setEditTarget(p);
    setForm({
      name: p.name, price: String(p.price), comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      stock: String(p.stock), description: p.description, featured: p.featured, categoryId: p.categoryId,
      productCode: p.productCode || '', tags: '', images: p.images || '',
      specs: (p.specs || []).map(s => ({ label: s.label, value: s.value })),
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-token': localStorage.getItem('admin-token') || '' }, body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json(); return data.url;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = form.images ? form.images.split(',').filter(Boolean) : [];
      for (const f of Array.from(files)) {
        const url = await uploadImage(f);
        urls.push(url);
      }
      setForm({ ...form, images: urls.join(',') });
    } catch { showToast('Image upload failed', 'error'); } finally { setUploading(false); }
  };

  const removeImage = (idx: number) => {
    const urls = (form.images || '').split(',').filter(Boolean);
    urls.splice(idx, 1);
    setForm({ ...form, images: urls.join(',') });
  };

  const addSpec = () => setForm({ ...form, specs: [...form.specs, { label: '', value: '' }] });
  const removeSpec = (idx: number) => setForm({ ...form, specs: form.specs.filter((_, i) => i !== idx) });
  const updateSpec = (idx: number, field: 'label' | 'value', val: string) => {
    const specs = [...form.specs]; specs[idx][field] = val; setForm({ ...form, specs });
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) { showToast('Name, price, and category are required', 'error'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name, price: parseFloat(form.price), categoryId: form.categoryId,
        description: form.description, featured: form.featured,
        stock: parseInt(form.stock, 10) || 0, tags: form.tags,
        productCode: form.productCode || null,
        comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
        images: form.images, specs: form.specs.filter(s => s.label),
      };

      if (isNew) {
        body.sellerId = 'system'; // Will be set by backend if needed
        const res = await fetch('/api/admin/products', { method: 'POST', headers: adminHeaders(), body: JSON.stringify(body) });
        if (res.ok) { showToast('Product created'); closeDialog(); fetchProducts(); }
        else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
      } else {
        body.id = editTarget!.id;
        const res = await fetch('/api/admin/products', { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify(body) });
        if (res.ok) { showToast('Product updated'); closeDialog(); fetchProducts(); }
        else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
      }
    } catch { showToast('Network error', 'error'); } finally { setSaving(false); }
  };

  const closeDialog = () => { setEditTarget(null); setIsNew(false); setForm(emptyForm); };

  const toggleFeatured = async (p: AdminProduct) => {
    try {
      const res = await fetch('/api/admin/products', { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ id: p.id, featured: !p.featured }) });
      if (res.ok) { showToast(p.featured ? 'Removed from featured' : 'Added to featured'); fetchProducts(); }
    } catch { showToast('Failed', 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/products', { method: 'DELETE', headers: adminHeaders(), body: JSON.stringify({ id: deleteTarget.id }) });
      if (res.ok) { showToast('Product deleted'); setDeleteTarget(null); fetchProducts(); }
      else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); } finally { setDeleting(false); }
  };

  const imageList = (form.images || '').split(',').filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 bg-card border-border text-xs" />
        </div>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} className="h-9 w-full sm:w-40 rounded-md border border-border bg-card px-3 text-xs">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={featuredFilter} onChange={e => { setFeaturedFilter(e.target.value); setPage(1); }} className="h-9 w-full sm:w-32 rounded-md border border-border bg-card px-3 text-xs">
          <option value="ALL">All</option>
          <option value="true">Featured</option>
          <option value="false">Not Featured</option>
        </select>
        <Button onClick={openNew} className="h-9 bg-foreground text-background text-xs gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Product</Button>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (<p className="p-4 text-sm text-muted-foreground">Loading...</p>) : products.length === 0 ? (
          <div className="py-16 text-center"><Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No products found</p></div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Image</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden lg:table-cell">Code</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Price</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden md:table-cell">Stock</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden lg:table-cell">Category</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Feat.</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-border hover:bg-secondary/50 transition-colors">
                    <td className="p-3"><div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary"><img src={p.image} alt={p.name} className="w-full h-full object-cover" /></div></td>
                    <td className="p-3 text-xs font-medium max-w-[180px] truncate">{p.name}</td>
                    <td className="p-3 text-xs font-mono text-muted-foreground hidden lg:table-cell">{p.productCode || '—'}</td>
                    <td className="p-3 text-xs">
                      <span>{p.price.toLocaleString()}</span>
                      {p.comparePrice && p.comparePrice > p.price && <span className="text-muted-foreground line-through ml-1.5 text-[10px]">{p.comparePrice.toLocaleString()}</span>}
                    </td>
                    <td className="p-3 text-xs hidden md:table-cell"><span className={p.stock <= 5 ? 'text-destructive font-medium' : ''}>{p.stock}</span></td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{p.category?.name || '—'}</td>
                    <td className="p-3">
                      <button onClick={() => toggleFeatured(p)} className="text-muted-foreground hover:text-foreground">{p.featured ? <Star className="w-4 h-4 text-yellow-500" /> : <StarOff className="w-4 h-4" />}</button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isNew || !!editTarget} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-base">{isNew ? 'Add Product' : 'Edit Product'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Base Price *</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Sale Price</Label>
                <Input type="number" value={form.comparePrice} onChange={e => setForm({ ...form, comparePrice: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Stock *</Label>
                <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product Code</Label>
                <Input value={form.productCode} onChange={e => setForm({ ...form, productCode: e.target.value })} className="h-9 bg-secondary border-border text-sm" placeholder="e.g. LP-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Category *</Label>
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm">
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description *</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="bg-secondary border-border text-sm resize-none" />
            </div>

            {/* Specifications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Specifications (optional)</Label>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={addSpec}><Plus className="w-3 h-3" /> Add</Button>
              </div>
              {form.specs.map((spec, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input placeholder="Label (e.g. Color)" value={spec.label} onChange={e => updateSpec(idx, 'label', e.target.value)} className="h-8 bg-secondary border-border text-xs flex-1" />
                  <Input placeholder="Value (e.g. Black)" value={spec.value} onChange={e => updateSpec(idx, 'value', e.target.value)} className="h-8 bg-secondary border-border text-xs flex-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeSpec(idx)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Images</Label>
              {imageList.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imageList.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3 text-white" /></button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload images'}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.featured} onCheckedChange={checked => setForm({ ...form, featured: checked })} />
              <Label className="text-xs">Featured product</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-foreground text-background text-xs">{saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">{deleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
