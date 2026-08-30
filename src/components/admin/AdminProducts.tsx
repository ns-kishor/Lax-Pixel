'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Trash2, Pencil, Star, StarOff, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import Image from 'next/image';

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  featured: boolean;
  image: string;
  description: string;
  categoryId: string;
  category?: { id: string; name: string; slug: string } | null;
  seller?: { id: string; name: string } | null;
}

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
}

const emptyForm = {
  name: '', price: '', comparePrice: '', stock: '', description: '', featured: false, categoryId: '',
};

type FormState = typeof emptyForm;

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
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useStore();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category', categoryFilter);
      if (featuredFilter && featuredFilter !== 'ALL') params.set('featured', featuredFilter);
      const res = await fetch(`/api/admin/products?${params}`, { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter, featuredFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories', { headers: adminHeaders() });
      if (res.ok) setCategories(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openEdit = (p: AdminProduct) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      stock: String(p.stock),
      description: p.description,
      featured: p.featured,
      categoryId: p.categoryId,
    });
  };

  const handleSave = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { id: editProduct.id };
      if (form.name) body.name = form.name;
      if (form.price) body.price = parseFloat(form.price);
      if (form.comparePrice) body.comparePrice = parseFloat(form.comparePrice);
      if (form.stock) body.stock = parseInt(form.stock, 10);
      if (form.description !== undefined) body.description = form.description;
      body.featured = form.featured;
      if (form.categoryId) body.categoryId = form.categoryId;

      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast('Product updated');
        setEditProduct(null);
        fetchProducts();
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

  const toggleFeatured = async (p: AdminProduct) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ id: p.id, featured: !p.featured }),
      });
      if (res.ok) {
        showToast(p.featured ? 'Removed from featured' : 'Added to featured');
        fetchProducts();
      }
    } catch {
      showToast('Failed to toggle featured', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        showToast('Product deleted');
        setDeleteTarget(null);
        fetchProducts();
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

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 bg-card border-border text-xs"
          />
        </div>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44 h-9 bg-card border-border text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={featuredFilter} onValueChange={v => { setFeaturedFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36 h-9 bg-card border-border text-xs">
            <SelectValue placeholder="Featured" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="true">Featured</SelectItem>
            <SelectItem value="false">Not Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] tracking-wider uppercase">Image</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Name</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Price</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Stock</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Category</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase">Featured</TableHead>
                  <TableHead className="text-[10px] tracking-wider uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, i) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="p-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary relative">
                        <Image src={product.image} alt={product.name} fill className="object-cover" sizes="40px" />
                      </div>
                    </td>
                    <td className="p-2 text-xs font-medium max-w-[200px] truncate">{product.name}</td>
                    <td className="p-2 text-xs">
                      <span>${product.price.toLocaleString()}</span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="text-muted-foreground line-through ml-1.5 text-[10px]">
                          ${product.comparePrice.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className={`text-xs ${product.stock <= 5 ? 'text-destructive font-medium' : ''}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{product.category?.name || '—'}</td>
                    <td className="p-2">
                      {product.featured ? (
                        <Badge variant="default" className="text-[10px] bg-foreground text-background">Featured</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => toggleFeatured(product)} title={product.featured ? 'Unfeature' : 'Feature'}>
                          {product.featured ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(product)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog open={!!deleteTarget && deleteTarget.id === product.id} onOpenChange={open => !open && setDeleteTarget(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <span className="font-medium text-foreground">{product.name}</span>? This will remove all associated data.
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

      {/* Edit dialog */}
      <Dialog open={!!editProduct} onOpenChange={open => !open && setEditProduct(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-96 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Price ($)</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Compare Price ($)</Label>
                <Input type="number" value={form.comparePrice} onChange={e => setForm({ ...form, comparePrice: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Stock</Label>
                <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="h-9 bg-secondary border-border text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Category</Label>
                <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="h-9 bg-secondary border-border text-xs">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="bg-secondary border-border text-sm resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.featured} onCheckedChange={checked => setForm({ ...form, featured: checked })} />
              <Label className="text-xs">Featured product</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-foreground text-background text-xs">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
