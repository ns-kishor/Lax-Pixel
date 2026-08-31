'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Trash2, ChevronLeft, ChevronRight, Users, Ban, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  city?: string;
  country?: string;
  banned: boolean;
  createdAt: string;
  _count?: { orders: number; wishlist: number };
  sellerProfile?: { companyName: string; approved: boolean } | null;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useStore();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter && roleFilter !== 'ALL') params.set('role', roleFilter);
      if (bannedFilter && bannedFilter !== 'ALL') params.set('banned', bannedFilter);
      const res = await fetch(`/api/admin/users?${params}`, { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data);
        setTotalPages(data.totalPages || 1);
      }
    } catch {} finally { setLoading(false); }
  }, [page, debouncedSearch, roleFilter, bannedFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'DELETE', headers: adminHeaders(), body: JSON.stringify({ id: deleteTarget.id }) });
      if (res.ok) { showToast('User deleted'); setDeleteTarget(null); fetchUsers(); }
      else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); } finally { setActionLoading(false); }
  };

  const handleToggleBan = async (user: AdminUser) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ id: user.id, banned: !user.banned }) });
      if (res.ok) { showToast(user.banned ? `${user.name} unbanned` : `${user.name} banned`); setBanTarget(null); fetchUsers(); }
      else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); } finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 bg-card border-border text-xs" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="h-9 w-full sm:w-36 rounded-md border border-border bg-card px-3 text-xs">
          <option value="ALL">All Roles</option>
          <option value="BUYER">Buyer</option>
          <option value="SELLER">Seller</option>
        </select>
        <select value={bannedFilter} onChange={e => { setBannedFilter(e.target.value); setPage(1); }} className="h-9 w-full sm:w-36 rounded-md border border-border bg-card px-3 text-xs">
          <option value="ALL">All Status</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden xl:table-cell">Orders</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden xl:table-cell">Wishlist</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr key={user.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-border hover:bg-secondary/50 transition-colors">
                    <td className="p-3">
                      <div className="text-xs font-medium">{user.name}</div>
                      <div className="text-[10px] text-muted-foreground lg:hidden">{user.email}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{user.email}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{user.phone || '—'}</td>
                    <td className="p-3">
                      <Badge variant={user.role === 'SELLER' ? 'default' : 'secondary'} className="text-[10px]">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden xl:table-cell">{user._count?.orders ?? 0}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden xl:table-cell">{user._count?.wishlist ?? 0}</td>
                    <td className="p-3">
                      {user.banned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-600"><Ban className="w-3 h-3" /> Banned</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600"><ShieldCheck className="w-3 h-3" /> Active</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title={user.banned ? 'Unban' : 'Ban'} onClick={() => setBanTarget(user)}>
                          {user.banned ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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

      {/* Ban Dialog */}
      <AlertDialog open={!!banTarget} onOpenChange={open => !open && setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{banTarget?.banned ? 'Unban User' : 'Ban User'}</AlertDialogTitle>
            <AlertDialogDescription>
              {banTarget?.banned
                ? `Are you sure you want to unban ${banTarget.name}? They will be able to log in again.`
                : `Are you sure you want to ban ${banTarget.name}? They will not be able to log in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => banTarget && handleToggleBan(banTarget)} disabled={actionLoading} className={!banTarget?.banned ? 'bg-destructive text-white hover:bg-destructive/90' : ''}>
              {actionLoading ? 'Processing...' : banTarget?.banned ? 'Unban' : 'Ban'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-destructive text-white hover:bg-destructive/90">
              {actionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
