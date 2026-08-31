'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, Receipt, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface PaymentProof {
  id: string;
  status: string;
  proofImage: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
  };
  paymentMethod: {
    id: string;
    name: string;
    icon: string | null;
  };
}

const STATUS_OPTIONS = ['All', 'PENDING', 'VERIFIED', 'REJECTED'];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'VERIFIED':
      return <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">Verified</Badge>;
    case 'REJECTED':
      return <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">Rejected</Badge>;
    case 'PENDING':
    default:
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-0 text-[10px]">Pending</Badge>;
  }
}

export function AdminPaymentProofs() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [detailProof, setDetailProof] = useState<PaymentProof | null>(null);
  const [imageProof, setImageProof] = useState<PaymentProof | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const { showToast } = useStore();

  const PER_PAGE = 20;

  const fetchProofs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/payment-proofs?${params}`, { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProofs(data.proofs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProofs();
  }, [fetchProofs]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const totalPages = Math.max(1, Math.ceil(proofs.length / PER_PAGE));
  const paginatedProofs = proofs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleVerify = async (proof: PaymentProof) => {
    setActionId(proof.id);
    try {
      const res = await fetch(`/api/admin/payment-proofs?id=${proof.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ status: 'VERIFIED' }),
      });
      if (res.ok) {
        showToast('Payment proof verified');
        fetchProofs();
        if (detailProof && detailProof.id === proof.id) {
          setDetailProof(null);
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to verify', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (proof: PaymentProof) => {
    setActionId(proof.id);
    try {
      const res = await fetch(`/api/admin/payment-proofs?id=${proof.id}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      if (res.ok) {
        showToast('Payment proof rejected');
        fetchProofs();
        if (detailProof && detailProof.id === proof.id) {
          setDetailProof(null);
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to reject', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadReceipt = (proof: PaymentProof) => {
    const receipt = `
${'='.repeat(50)}
          PAYMENT RECEIPT
${'='.repeat(50)}

Order: ${proof.order.orderNumber}
Date: ${new Date(proof.createdAt).toLocaleDateString()}

Customer: ${proof.user.name}
Email: ${proof.user.email}
${proof.user.phone ? `Phone: ${proof.user.phone}` : ''}

Payment Method: ${proof.paymentMethod.name}
Amount: $${proof.amount.toFixed(2)}
Status: ${proof.status}
${proof.verifiedAt ? `Verified At: ${new Date(proof.verifiedAt).toLocaleDateString()}` : ''}
${proof.notes ? `Notes: ${proof.notes}` : ''}

${'='.repeat(50)}
          Lax Pixel Ecommerce
${'='.repeat(50)}
`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family:monospace;padding:20px;font-size:14px;">${receipt}</pre>`);
      win.document.title = `Receipt - ${proof.order.orderNumber}`;
      win.document.close();
    } else {
      console.log(receipt);
      showToast('Receipt generated (check console)', 'info');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{proofs.length} payment proofs</p>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 w-40 rounded-md border border-border bg-secondary px-3 text-sm"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : paginatedProofs.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No payment proofs found</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Order #</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Customer</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Payment</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Amount</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Proof</th>
                  <th className="text-left p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Date</th>
                  <th className="text-right p-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProofs.map((proof, i) => (
                  <motion.tr
                    key={proof.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="p-3 font-mono text-xs font-medium">{proof.order.orderNumber}</td>
                    <td className="p-3 text-xs">{proof.user.name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{proof.paymentMethod.name}</td>
                    <td className="p-3 text-xs font-medium">${proof.amount.toFixed(2)}</td>
                    <td className="p-3"><StatusBadge status={proof.status} /></td>
                    <td className="p-3">
                      {proof.proofImage ? (
                        <button
                          onClick={() => setImageProof(proof)}
                          className="w-10 h-10 rounded-md border border-border overflow-hidden bg-secondary hover:opacity-80 transition-opacity"
                        >
                          <img src={proof.proofImage} alt="Proof" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-md border border-border bg-secondary flex items-center justify-center">
                          <ImageOff className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(proof.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {proof.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-500 hover:bg-green-500/10"
                              onClick={() => handleVerify(proof)}
                              disabled={actionId === proof.id}
                              title="Verify"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => handleReject(proof)}
                              disabled={actionId === proof.id}
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setDetailProof(proof)}
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Image Dialog */}
      <Dialog open={!!imageProof} onOpenChange={open => !open && setImageProof(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Proof Image</DialogTitle>
          </DialogHeader>
          {imageProof && imageProof.proofImage && (
            <div className="rounded-lg overflow-hidden border border-border bg-secondary">
              <img src={imageProof.proofImage} alt="Payment proof" className="w-full h-auto max-h-[70vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailProof} onOpenChange={open => !open && setDetailProof(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Payment Proof Details</DialogTitle>
          </DialogHeader>
          {detailProof && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Customer Name</p>
                  <p className="text-sm font-medium">{detailProof.user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Email</p>
                  <p className="text-sm">{detailProof.user.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Phone</p>
                  <p className="text-sm">{detailProof.user.phone || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Order Number</p>
                  <p className="text-sm font-mono">{detailProof.order.orderNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Payment Method</p>
                  <p className="text-sm">{detailProof.paymentMethod.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Amount</p>
                  <p className="text-sm font-medium">${detailProof.amount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Status</p>
                  <StatusBadge status={detailProof.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Submitted</p>
                  <p className="text-sm">{new Date(detailProof.createdAt).toLocaleDateString()}</p>
                </div>
                {detailProof.verifiedAt && (
                  <div className="space-y-1">
                    <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Verified At</p>
                    <p className="text-sm">{new Date(detailProof.verifiedAt).toLocaleDateString()}</p>
                  </div>
                )}
                {detailProof.notes && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Notes</p>
                    <p className="text-sm">{detailProof.notes}</p>
                  </div>
                )}
              </div>

              {/* Proof Image */}
              {detailProof.proofImage && (
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Proof Image</p>
                  <div className="rounded-lg overflow-hidden border border-border bg-secondary">
                    <img src={detailProof.proofImage} alt="Payment proof" className="w-full h-auto max-h-64 object-contain" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleDownloadReceipt(detailProof)}
                  variant="outline"
                  className="text-xs gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" /> Download Receipt
                </Button>
                {detailProof.status === 'PENDING' && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      onClick={() => handleReject(detailProof)}
                      disabled={actionId === detailProof.id}
                      className="bg-red-600 text-white hover:bg-red-700 text-xs gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                    <Button
                      onClick={() => handleVerify(detailProof)}
                      disabled={actionId === detailProof.id}
                      className="bg-green-600 text-white hover:bg-green-700 text-xs gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Verify
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
