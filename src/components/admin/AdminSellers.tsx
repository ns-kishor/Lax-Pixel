'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle, Ban, Trash2, Store, ShieldOff, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface SellerUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  banned: boolean;
  createdAt: string;
  _count: { orders: number };
  productCount: number;
}

interface Seller {
  id: string;
  companyName: string;
  approved: boolean;
  createdAt: string;
  userId: string;
  user: SellerUser;
}

const STATUS_OPTIONS = ['All', 'approved', 'pending', 'banned'];

function SellerStatusBadge({ seller }: { seller: Seller }) {
  if (seller.user.banned) {
    return <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">Banned</Badge>;
  }
  if (seller.approved) {
    return <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">Approved</Badge>;
  }
  return <Badge className="bg-yellow-500/10 text-yellow-600 border-0 text-[10px]">Pending</Badge>;
}

export function AdminSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const { showToast } = useStore();

  const PER_PAGE = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/sellers?${params}`, { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSellers(data.sellers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  // Client-side search filtering
  const filteredSellers = debouncedSearch
    ? sellers.filter(s =>
        s.companyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.user.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.user.email.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : sellers;

  const totalPages = Math.max(1, Math.ceil(filteredSellers.length / PER_PAGE));
  const paginatedSellers = filteredSellers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleApprove = async (seller: Seller) => {
    setActionId(seller.id);
    try {
      const res = await fetch(`/api/admin/sellers?id=${seller.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ approved: true }),
      });
      if (res.ok) {
        showToast('Seller approved');
        fetchSellers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to approve', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleBan = async (seller: Seller) => {
    setActionId(seller.id);
    try {
      const res = await fetch(`/api/admin/sellers?id=${seller.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ userId: seller.user.id, banned: true }),
      });
      if (res.ok) {
        showToast('Seller banned');
        fetchSellers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to ban', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleUnban = async (seller: Seller) => {
    setActionId(seller.id);
    try {
      const res = await fetch(`/api/admin/sellers?id=${seller.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ userId: seller.user.id, banned: false }),
      });
      if (res.ok) {
        showToast('Seller unbanned');
        fetchSellers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to unban', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/sellers?id=${deleteTarget.id}&userId=${deleteTarget.user.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showToast('Seller deleted');
        setDeleteTarget(null);
        fetchSellers();
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground">{sellers.length} sellers</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search sellers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-48 rounded-md border border-border bg-secondary px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 w-36 rounded-md border border-border bg-secondary px-3 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : paginatedSellers.length === 0 ? (
          <div className="py-16 text-center">
            <Store className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No sellers found</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Company</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Email</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Phone</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Products</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Orders</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Joined</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSellers.map((seller, i) => (
                  <motion.tr
                    key={seller.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="p-3 text-xs font-medium">{seller.companyName}</td>
                    <td className="p-3 text-xs">{seller.user.name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{seller.user.email}</td>
                    <td className="p-3 text-xs text-muted-foreground">{seller.user.phone || '—'}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">{seller.user.productCount}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">{seller.user._count.orders}</Badge>
                    </td>
                    <td className="p-3"><SellerStatusBadge seller={seller} /></td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(seller.user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {!seller.approved && !seller.user.banned && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-500 hover:bg-green-500/10"
                            onClick={() => handleApprove(seller)}
                            disabled={actionId === seller.id}
                            title="Approve"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {seller.user.banned ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleUnban(seller)}
                            disabled={actionId === seller.id}
                            title="Unban"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleBan(seller)}
                            disabled={actionId === seller.id}
                            title="Ban"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <AlertDialog
                          open={!!deleteTarget && deleteTarget.id === seller.id}
                          onOpenChange={open => !open && setDeleteTarget(null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete seller"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Seller</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <span className="font-medium text-foreground">{seller.user.name}</span> ({seller.companyName})? This will permanently delete the seller profile and user account. This action cannot be undone.
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
    </div>
  );
}
