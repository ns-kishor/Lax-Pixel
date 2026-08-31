'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, CreditCard, Power, PowerOff, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface PaymentMethod {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  proofRequired: string | null;
  instructions: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface MethodForm {
  name: string;
  description: string;
  icon: string;
  proofRequired: string;
  instructions: string;
  active: boolean;
  sortOrder: string;
}

const emptyForm: MethodForm = {
  name: '',
  description: '',
  icon: '',
  proofRequired: '',
  instructions: '',
  active: true,
  sortOrder: '0',
};

export function AdminPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MethodForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const { showToast } = useStore();

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-methods', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (method: PaymentMethod) => {
    setEditId(method.id);
    setForm({
      name: method.name,
      description: method.description || '',
      icon: method.icon || '',
      proofRequired: method.proofRequired || '',
      instructions: method.instructions || '',
      active: method.active,
      sortOrder: String(method.sortOrder),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showToast('Name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        icon: form.icon || null,
        proofRequired: form.proofRequired || null,
        instructions: form.instructions || null,
        active: form.active,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };

      let res: Response;
      if (editId) {
        res = await fetch(`/api/admin/payment-methods?id=${editId}`, {
          method: 'PATCH',
          headers: adminHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/payment-methods', {
          method: 'POST',
          headers: adminHeaders(),
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        showToast(editId ? 'Payment method updated' : 'Payment method created');
        setDialogOpen(false);
        fetchMethods();
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
      const res = await fetch(`/api/admin/payment-methods?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showToast('Payment method deleted');
        setDeleteTarget(null);
        fetchMethods();
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

  const handleToggleActive = async (method: PaymentMethod) => {
    setTogglingId(method.id);
    try {
      const res = await fetch(`/api/admin/payment-methods?id=${method.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ active: !method.active }),
      });
      if (res.ok) {
        showToast(method.active ? 'Deactivated' : 'Activated');
        fetchMethods();
      } else {
        showToast('Failed to toggle', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/payment-methods?seed=true', {
        method: 'POST',
        headers: adminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Seed complete');
        fetchMethods();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to seed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{methods.length} payment methods</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs tracking-wider h-9 gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            {seeding ? 'Seeding…' : 'Seed Bangladeshi Methods'}
          </Button>
          <Button onClick={openAdd} className="bg-foreground text-background text-xs tracking-wider h-9 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Method
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : methods.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No payment methods yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click &quot;Seed Bangladeshi Methods&quot; to add defaults</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Description</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Proof Required</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Instructions</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Active</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Order</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method, i) => (
                  <motion.tr
                    key={method.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {method.icon && <span className="text-base">{method.icon}</span>}
                        <span className="text-xs font-medium">{method.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[160px] truncate">
                      {method.description || '—'}
                    </td>
                    <td className="p-3">
                      {method.proofRequired ? (
                        <Badge variant="secondary" className="text-[10px]">{method.proofRequired}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[180px] truncate">
                      {method.instructions || '—'}
                    </td>
                    <td className="p-3">
                      {method.active ? (
                        <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{method.sortOrder}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleActive(method)}
                          disabled={togglingId === method.id}
                          title={method.active ? 'Deactivate' : 'Activate'}
                        >
                          {method.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(method)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog
                          open={!!deleteTarget && deleteTarget.id === method.id}
                          onOpenChange={open => !open && setDeleteTarget(null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete method">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <span className="font-medium text-foreground">{method.name}</span>? This action cannot be undone.
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[400px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="bKash"
                  className="h-9 bg-secondary border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Icon</Label>
                <Input
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  placeholder="📱 or credit-card"
                  className="h-9 bg-secondary border-border text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description"
                className="h-9 bg-secondary border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Proof Required</Label>
              <Textarea
                value={form.proofRequired}
                onChange={e => setForm({ ...form, proofRequired: e.target.value })}
                placeholder="e.g. TRANSACTION_ID, BANK_RECEIPT — what proof of payment is needed"
                rows={2}
                className="bg-secondary border-border text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Instructions</Label>
              <Textarea
                value={form.instructions}
                onChange={e => setForm({ ...form, instructions: e.target.value })}
                placeholder="Payment instructions shown to customers"
                rows={3}
                className="bg-secondary border-border text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-center justify-end gap-3 pt-5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Active</Label>
                <Switch checked={form.active} onCheckedChange={checked => setForm({ ...form, active: checked })} />
              </div>
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
