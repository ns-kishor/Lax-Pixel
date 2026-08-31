'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count: { products: number };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const emptyForm = { name: '', slug: '', description: '' };

type FormState = typeof emptyForm;

export function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useStore();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { headers: adminHeaders() });
      if (res.ok) setCategories(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      showToast('Name and slug are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = '/api/admin/categories';
      const method = editId ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
      };
      if (editId) body.id = editId;

      const res = await fetch(url, {
        method,
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(editId ? 'Category updated' : 'Category created');
        setDialogOpen(false);
        fetchCategories();
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
      const res = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        showToast('Category deleted');
        setDeleteTarget(null);
        fetchCategories();
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
      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{categories.length} categories</p>
        <Button onClick={openAdd} className="bg-foreground text-background text-xs tracking-wider h-9 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Category
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <FolderTree className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No categories yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] tracking-wider uppercase">Name</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase">Slug</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase">Products</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, i) => (
                <motion.tr
                  key={cat.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border hover:bg-secondary transition-colors"
                >
                  <td className="p-2 text-xs font-medium">{cat.name}</td>
                  <td className="p-2 text-xs font-mono text-muted-foreground">{cat.slug}</td>
                  <td className="p-2">
                    <Badge variant="secondary" className="text-[10px]">{cat._count.products}</Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(cat)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog
                        open={!!deleteTarget && deleteTarget.id === cat.id}
                        onOpenChange={open => !open && setDeleteTarget(null)}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={cat._count.products > 0}
                            title={cat._count.products > 0 ? 'Cannot delete: has products' : 'Delete category'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <span className="font-medium text-foreground">{cat.name}</span>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              disabled={deleting}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
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
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value, slug: editId ? form.slug : slugify(e.target.value) })}
                placeholder="Category name"
                className="h-9 bg-secondary border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Slug</Label>
              <Input
                value={form.slug}
                onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="category-slug"
                className="h-9 bg-secondary border-border text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
                className="bg-secondary border-border text-sm resize-none"
              />
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
