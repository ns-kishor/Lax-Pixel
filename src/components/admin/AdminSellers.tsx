'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Ban, Trash2, Store, ShieldOff, Eye, Mail, Phone, MapPin, Globe, Star, Package, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface SellerUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  avatar: string | null;
  banned: boolean;
  createdAt: string;
  _count: { orders: number; wishlist: number };
  productCount: number;
  totalRevenue: number;
}

interface SellerProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  salesCount: number;
  revenue: number;
  productCode: string | null;
  createdAt: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  sales: number;
}

interface SellerVerificationData {
  id: string;
  businessName: string;
  businessType: string;
  businessAddress: string;
  businessCity: string;
  businessCountry: string;
  nidNumber: string;
  phone: string;
  website: string | null;
  status: string;
  createdAt: string;
}

interface Seller {
  id: string;
  companyName: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  approved: boolean;
  rating: number;
  totalSales: number;
  totalOrders?: number;
  confirmedOrders?: number;
  createdAt: string;
  userId: string;
  user: SellerUser;
  products?: SellerProduct[];
  monthlyRevenue?: MonthlyRevenue[];
  verification?: SellerVerificationData | null;
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
  const [detailTarget, setDetailTarget] = useState<Seller | null>(null);
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
        <p className="text-xs text-muted-foreground">{sellers.length} seller{sellers.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search sellers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-48 rounded-md border border-border bg-secondary px-3 pl-8 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
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
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Owner</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium hidden lg:table-cell">Email</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium hidden md:table-cell">Phone</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium hidden xl:table-cell">Products</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium hidden xl:table-cell">Revenue</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium hidden lg:table-cell">Joined</th>
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
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {seller.logo ? (
                          <img src={seller.logo} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-medium">{seller.companyName.charAt(0)}</div>
                        )}
                        <span className="text-xs font-medium">{seller.companyName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs">{seller.user.name}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{seller.user.email}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{seller.user.phone || '—'}</td>
                    <td className="p-3 hidden xl:table-cell">
                      <Badge variant="secondary" className="text-[10px]">{seller.user.productCount}</Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden xl:table-cell">${seller.user.totalRevenue.toLocaleString()}</td>
                    <td className="p-3"><SellerStatusBadge seller={seller} /></td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{new Date(seller.user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setDetailTarget(seller)}
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
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
                                {deleting ? 'Deleting...' : 'Delete'}
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

      {/* Seller Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={open => !open && setDetailTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center justify-between">
              <span>Seller Performance & Details</span>
              {detailTarget && <SellerStatusBadge seller={detailTarget} />}
            </DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
              {/* Company Info */}
              <div className="flex items-center gap-4">
                {detailTarget.logo ? (
                  <img src={detailTarget.logo} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center text-lg font-bold">{detailTarget.companyName.charAt(0)}</div>
                )}
                <div>
                  <h3 className="text-base font-medium">{detailTarget.companyName}</h3>
                  <p className="text-xs text-muted-foreground">{detailTarget.user.name} ({detailTarget.user.email})</p>
                  {detailTarget.verification?.nidNumber && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      NID/Trade: <span className="text-foreground font-mono">{detailTarget.verification.nidNumber}</span> • Type: {detailTarget.verification.businessType}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border/50">
                  <Package className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-base font-medium">{detailTarget.user.productCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Products</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border/50">
                  <ShoppingCart className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-base font-medium">{detailTarget.totalOrders ?? detailTarget.user._count.orders}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Orders ({detailTarget.confirmedOrders ?? 0} Confirmed)</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border/50">
                  <p className="text-base font-medium text-green-500">${detailTarget.user.totalRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center border border-border/50">
                  <p className="text-base font-medium text-blue-500">{detailTarget.totalSales}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Items Sold</p>
                </div>
              </div>

              {/* Seller's Products Performance */}
              <div>
                <h4 className="text-xs tracking-wider uppercase text-muted-foreground font-medium mb-2.5">
                  Uploaded Products ({detailTarget.products?.length || 0})
                </h4>
                {(!detailTarget.products || detailTarget.products.length === 0) ? (
                  <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 text-center">No products uploaded by this seller yet.</p>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/70 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="p-2 text-left">Product</th>
                          <th className="p-2 text-right">Price</th>
                          <th className="p-2 text-center">Stock</th>
                          <th className="p-2 text-center">Sales</th>
                          <th className="p-2 text-right">Total Rev</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailTarget.products.map(p => (
                          <tr key={p.id} className="hover:bg-secondary/40">
                            <td className="p-2 flex items-center gap-2">
                              {p.image ? (
                                <img src={p.image} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                              ) : null}
                              <span className="truncate max-w-[180px] font-medium">{p.name}</span>
                            </td>
                            <td className="p-2 text-right">${p.price}</td>
                            <td className="p-2 text-center">{p.stock}</td>
                            <td className="p-2 text-center font-medium">{p.salesCount || 0}</td>
                            <td className="p-2 text-right font-medium text-green-500">${p.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Monthly Revenue Breakdown */}
              {detailTarget.monthlyRevenue && detailTarget.monthlyRevenue.length > 0 && (
                <div>
                  <h4 className="text-xs tracking-wider uppercase text-muted-foreground font-medium mb-2.5">
                    Monthly Revenue Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detailTarget.monthlyRevenue.map(m => (
                      <div key={m.month} className="p-2.5 bg-secondary/40 border border-border rounded-lg">
                        <p className="text-[10px] text-muted-foreground">{m.month}</p>
                        <p className="text-sm font-medium mt-0.5">${m.revenue.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{m.sales} units sold</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Business & Owner Info */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Business & Contact Info</h4>
                <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{detailTarget.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{detailTarget.verification?.phone || detailTarget.user.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{[detailTarget.verification?.businessAddress || detailTarget.user.address, detailTarget.verification?.businessCity || detailTarget.user.city, detailTarget.verification?.businessCountry || detailTarget.user.country].filter(Boolean).join(', ') || 'Not provided'}</span>
                  </div>
                  {detailTarget.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{detailTarget.website}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                {!detailTarget.approved && !detailTarget.user.banned && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-green-600 text-white hover:bg-green-700 gap-1.5"
                    onClick={() => { handleApprove(detailTarget); setDetailTarget(null); }}
                    disabled={actionId === detailTarget.id}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve Seller
                  </Button>
                )}
                {detailTarget.user.banned ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => { handleUnban(detailTarget); setDetailTarget(null); }}
                    disabled={actionId === detailTarget.id}
                  >
                    <ShieldOff className="w-3.5 h-3.5" /> Unban
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive hover:text-destructive gap-1.5"
                    onClick={() => { handleBan(detailTarget); setDetailTarget(null); }}
                    disabled={actionId === detailTarget.id}
                  >
                    <Ban className="w-3.5 h-3.5" /> Ban
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
