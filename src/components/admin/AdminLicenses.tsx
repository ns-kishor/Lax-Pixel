'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Award, Clock, CheckCircle2, XCircle, Search, Copy, Check, ExternalLink,
  ShieldCheck, CreditCard, Send, Edit3, Save, RefreshCw, AlertCircle, FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminHeaders } from '@/lib/admin-utils';
import { cn } from '@/lib/utils';

interface LicenseOrder {
  id: string;
  userId: string;
  type: 'SOFT_COPY' | 'HARD_COPY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  licenseUrl: string | null;
  verificationCode: string | null;
  isDeliveryVerified: boolean;
  deliveryVerifiedAt: string | null;
  feeAmount: number | null;
  paymentMethod: string | null;
  transactionId: string | null;
  senderNumber: string | null;
  paymentStatus: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    sellerProfile: {
      companyName: string;
      sellerCode: string | null;
      approved: boolean;
    } | null;
  };
}

export function AdminLicenses() {
  const [licenses, setLicenses] = useState<LicenseOrder[]>([]);
  const [licenseFee, setLicenseFee] = useState<number>(1000);
  const [editingFee, setEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState<string>('1000');
  const [savingFee, setSavingFee] = useState(false);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'HARD_COPY' | 'SOFT_COPY' | 'VERIFIED'>('ALL');

  // Approval Modal State
  const [approvingLicense, setApprovingLicense] = useState<LicenseOrder | null>(null);
  const [licenseUrlInput, setLicenseUrlInput] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Reject Modal State
  const [rejectingLicense, setRejectingLicense] = useState<LicenseOrder | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Copied code feedback
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const fetchLicenses = async () => {
    try {
      const res = await fetch('/api/admin/licenses', { headers: adminHeaders() });
      const data = await res.json();
      if (data.licenses) {
        setLicenses(data.licenses);
      }
      if (data.licenseFee !== undefined) {
        setLicenseFee(data.licenseFee);
        setFeeInput(String(data.licenseFee));
      }
    } catch (err) {
      console.error('Failed to load license orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleSaveFee = async () => {
    const num = parseFloat(feeInput);
    if (isNaN(num) || num < 0) {
      alert('Please enter a valid amount');
      return;
    }
    setSavingFee(true);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'PUT',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_FEE', feeAmount: num }),
      });
      const data = await res.json();
      if (data.success) {
        setLicenseFee(data.feeAmount);
        setEditingFee(false);
      } else {
        alert(data.error || 'Failed to update fee');
      }
    } catch {
      alert('Error updating fee');
    } finally {
      setSavingFee(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingLicense) return;
    if (!licenseUrlInput.trim()) {
      alert('License URL is required!');
      return;
    }

    setApprovalLoading(true);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'PUT',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          licenseId: approvingLicense.id,
          licenseUrl: licenseUrlInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovingLicense(null);
        setLicenseUrlInput('');
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to approve');
      }
    } catch {
      alert('Failed to approve license');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingLicense) return;
    setRejectLoading(true);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'PUT',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          licenseId: rejectingLicense.id,
          rejectReason: rejectReasonInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectingLicense(null);
        setRejectReasonInput('');
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to reject');
      }
    } catch {
      alert('Failed to reject license');
    } finally {
      setRejectLoading(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Filtered List
  const filteredLicenses = licenses.filter((lic) => {
    // Search
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      lic.user.name.toLowerCase().includes(q) ||
      (lic.user.sellerProfile?.companyName && lic.user.sellerProfile.companyName.toLowerCase().includes(q)) ||
      (lic.user.email && lic.user.email.toLowerCase().includes(q)) ||
      (lic.user.phone && lic.user.phone.toLowerCase().includes(q)) ||
      (lic.transactionId && lic.transactionId.toLowerCase().includes(q)) ||
      (lic.verificationCode && lic.verificationCode.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (filter === 'PENDING') return lic.status === 'PENDING';
    if (filter === 'APPROVED') return lic.status === 'APPROVED';
    if (filter === 'HARD_COPY') return lic.type === 'HARD_COPY';
    if (filter === 'SOFT_COPY') return lic.type === 'SOFT_COPY';
    if (filter === 'VERIFIED') return lic.isDeliveryVerified;
    return true;
  });

  // Metrics
  const totalCount = licenses.length;
  const pendingCount = licenses.filter((l) => l.status === 'PENDING').length;
  const hardCopyCount = licenses.filter((l) => l.type === 'HARD_COPY').length;
  const softCopyCount = licenses.filter((l) => l.type === 'SOFT_COPY').length;
  const verifiedCount = licenses.filter((l) => l.isDeliveryVerified).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Fee Settings */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Seller License Management</h2>
              <p className="text-xs text-muted-foreground">
                Review, approve, and track verification codes for approved sellers&apos; soft and hard copy licenses.
              </p>
            </div>
          </div>
        </div>

        {/* Hard copy fee customizer */}
        <div className="flex items-center gap-3 bg-secondary/60 px-4 py-2.5 rounded-xl border border-border">
          <div className="text-xs">
            <span className="text-muted-foreground block text-[10px]">Hard Copy License Fee</span>
            {editingFee ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-semibold">৳</span>
                <Input
                  type="number"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="h-7 w-24 text-xs px-2"
                />
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleSaveFee}
                  disabled={savingFee}
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setEditingFee(false); setFeeInput(String(licenseFee)); }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <span className="text-sm font-semibold tracking-tight text-foreground">
                ৳ {licenseFee.toLocaleString('en-US')}
              </span>
            )}
          </div>
          {!editingFee && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5 gap-1 ml-2"
              onClick={() => setEditingFee(true)}
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Fee
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Applications</p>
          <p className="text-2xl font-light mt-1">{totalCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-[11px] text-amber-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </p>
          <p className="text-2xl font-light mt-1 text-amber-600 dark:text-amber-400">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <p className="text-[11px] text-blue-500 uppercase tracking-wider">Hard Copy Orders</p>
          <p className="text-2xl font-light mt-1 text-blue-600 dark:text-blue-400">{hardCopyCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Soft Copy Orders</p>
          <p className="text-2xl font-light mt-1">{softCopyCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] text-emerald-500 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Delivery Verified
          </p>
          <p className="text-2xl font-light mt-1 text-emerald-600 dark:text-emerald-400">{verifiedCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search seller name, store, phone, or TrxID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'PENDING', label: `Pending (${pendingCount})` },
              { key: 'APPROVED', label: 'Approved' },
              { key: 'HARD_COPY', label: 'Hard Copy' },
              { key: 'SOFT_COPY', label: 'Soft Copy' },
              { key: 'VERIFIED', label: `Verified (${verifiedCount})` },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={filter === tab.key ? 'default' : 'outline'}
              className="h-8 text-xs px-3"
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={fetchLicenses}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* License Orders Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading license data...
          </div>
        ) : filteredLicenses.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Award className="w-8 h-8 opacity-40 text-muted-foreground" />
            No license orders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-3 px-4">Seller / Store</th>
                  <th className="py-3 px-4">License Type</th>
                  <th className="py-3 px-4">Payment Details (Hard Copy)</th>
                  <th className="py-3 px-4">7-Digit Verification Code</th>
                  <th className="py-3 px-4">Status & Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLicenses.map((lic) => {
                  const storeName = lic.user.sellerProfile?.companyName || 'Store';
                  const sellerName = lic.user.name || 'Seller';
                  const isHardCopy = lic.type === 'HARD_COPY';

                  return (
                    <tr key={lic.id} className="hover:bg-secondary/30 transition-colors">
                      {/* Seller & Store */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground text-sm">{storeName}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {sellerName} • {lic.user.phone || lic.user.email}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                          Applied: {new Date(lic.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        </div>
                      </td>

                      {/* License Type */}
                      <td className="py-3.5 px-4">
                        {isHardCopy ? (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1 px-2.5 py-0.5">
                            <CreditCard className="w-3 h-3" /> Hard Copy (Paid)
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[11px] gap-1 px-2.5 py-0.5">
                            <FileText className="w-3 h-3" /> Soft Copy (Free)
                          </Badge>
                        )}
                        {lic.licenseUrl && (
                          <div className="mt-1.5">
                            <a
                              href={lic.licenseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              View Link <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Payment Details (For Hard Copy) */}
                      <td className="py-3.5 px-4">
                        {isHardCopy ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <span>{lic.paymentMethod || 'Manual'}</span>
                              <span className="text-[11px] text-primary font-semibold">
                                ৳ {lic.feeAmount || licenseFee}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              TrxID: <span className="text-foreground">{lic.transactionId || 'N/A'}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Sender: <span className="text-foreground">{lic.senderNumber || 'N/A'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">— Not Applicable —</span>
                        )}
                      </td>

                      {/* 7-digit Verification Code (Hard Copy) */}
                      <td className="py-3.5 px-4">
                        {isHardCopy ? (
                          lic.verificationCode ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm tracking-widest font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                                {lic.verificationCode}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => copyCode(lic.verificationCode!, lic.id)}
                                title="Copy code"
                              >
                                {copiedCodeId === lic.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Generated upon approval
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-[11px]">— Not Applicable —</span>
                        )}
                      </td>

                      {/* Status & Delivery Verification */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {lic.status === 'PENDING' && (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] gap-1 px-2.5">
                              <Clock className="w-3 h-3" /> Pending Review
                            </Badge>
                          )}
                          {lic.status === 'APPROVED' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1 px-2.5">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </Badge>
                          )}
                          {lic.status === 'REJECTED' && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] gap-1 px-2.5">
                              <XCircle className="w-3 h-3" /> Rejected
                            </Badge>
                          )}

                          {/* Specific Delivery Verification Tag for Hard Copy */}
                          {isHardCopy && lic.status === 'APPROVED' && (
                            <div>
                              {lic.isDeliveryVerified ? (
                                <Badge className="bg-emerald-600 text-white font-medium gap-1 text-[11px] px-2.5 py-0.5 shadow-sm">
                                  <ShieldCheck className="w-3 h-3" /> Verified (Received)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[10px] gap-1 border-dashed">
                                  <Clock className="w-2.5 h-2.5" /> Seller has not submitted code yet
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lic.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => {
                                  setApprovingLicense(lic);
                                  setLicenseUrlInput(lic.licenseUrl || '');
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs px-2.5"
                                onClick={() => {
                                  setRejectingLicense(lic);
                                  setRejectReasonInput('');
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </Button>
                            </>
                          )}

                          {lic.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 gap-1"
                              onClick={() => {
                                setApprovingLicense(lic);
                                setLicenseUrlInput(lic.licenseUrl || '');
                              }}
                              title="Edit Link"
                            >
                              <Edit3 className="w-3 h-3" /> Edit Link
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Approval Modal (With License Link Input) ─── */}
      <Dialog open={Boolean(approvingLicense)} onOpenChange={(o) => !o && setApprovingLicense(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> License Approval & Link
            </DialogTitle>
          </DialogHeader>

          {approvingLicense && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">Store / Shop: </span>
                  <span className="font-semibold text-foreground">
                    {approvingLicense.user.sellerProfile?.companyName || approvingLicense.user.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">License Type: </span>
                  <span className="font-medium">
                    {approvingLicense.type === 'HARD_COPY' ? 'Hard Copy' : 'Soft Copy'}
                  </span>
                </div>
                {approvingLicense.type === 'HARD_COPY' && (
                  <div>
                    <span className="text-muted-foreground">Payment Method & TrxID: </span>
                    <span className="font-mono text-primary font-medium">
                      {approvingLicense.paymentMethod} • {approvingLicense.transactionId}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseUrl" className="text-xs font-medium">
                  License Link (URL) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="licenseUrl"
                  placeholder="https://drive.google.com/... or license certificate URL"
                  value={licenseUrlInput}
                  onChange={(e) => setLicenseUrlInput(e.target.value)}
                  className="text-xs h-9"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  This link will be directly accessible to the seller via the &quot;View&quot; button in their dashboard.
                </p>
              </div>

              {approvingLicense.type === 'HARD_COPY' && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Hard Copy Verification Code
                  </p>
                  <p>
                    Upon clicking approve, the system will automatically generate a 7-digit code. Please include this code on the physical certificate sent via courier.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApprovingLicense(null)}
              disabled={approvalLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={handleApprove}
              disabled={approvalLoading || !licenseUrlInput.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              {approvalLoading ? 'Sending...' : 'Send & Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Modal ─── */}
      <Dialog open={Boolean(rejectingLicense)} onOpenChange={(o) => !o && setRejectingLicense(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" /> Reject License Application
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Specify reason for rejection (seller will be able to see this reason):
            </p>
            <Input
              placeholder="e.g. Invalid transaction ID or payment not received"
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingLicense(null)}
              disabled={rejectLoading}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={rejectLoading}
            >
              {rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
