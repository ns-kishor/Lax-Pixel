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
      alert('সঠিক টাকার পরিমাণ দিন');
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
      alert('লাইসেন্স এর লিংক প্রদান করা আবশ্যক!');
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
              <h2 className="text-lg font-medium">বিক্রেতা লাইসেন্স ম্যানেজমেন্ট (Seller Licenses)</h2>
              <p className="text-xs text-muted-foreground">
                অনুমোদিত বিক্রেতাদের সফট কপি ও হার্ড কপি লাইসেন্স অর্ডার পর্যালোচনা, অনুমোদন ও ভেরিফিকেশন কোড ট্র্যাকিং
              </p>
            </div>
          </div>
        </div>

        {/* Hard copy fee customizer */}
        <div className="flex items-center gap-3 bg-secondary/60 px-4 py-2.5 rounded-xl border border-border">
          <div className="text-xs">
            <span className="text-muted-foreground block text-[10px]">হার্ড কপি লাইসেন্স ফি</span>
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
                  <Save className="w-3.5 h-3.5 mr-1" /> সেভ
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setEditingFee(false); setFeeInput(String(licenseFee)); }}
                >
                  বাতিল
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
              <Edit3 className="w-3.5 h-3.5" /> ফি পরিবর্তন
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট আবেদন</p>
          <p className="text-2xl font-light mt-1">{totalCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-[11px] text-amber-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> পেন্ডিং রিভিউ
          </p>
          <p className="text-2xl font-light mt-1 text-amber-600 dark:text-amber-400">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <p className="text-[11px] text-blue-500 uppercase tracking-wider">হার্ড কপি অর্ডার</p>
          <p className="text-2xl font-light mt-1 text-blue-600 dark:text-blue-400">{hardCopyCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">সফট কপি অর্ডার</p>
          <p className="text-2xl font-light mt-1">{softCopyCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] text-emerald-500 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> হাতে পাওয়া ভেরিফাইড
          </p>
          <p className="text-2xl font-light mt-1 text-emerald-600 dark:text-emerald-400">{verifiedCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="বিক্রেতার নাম, স্টোরের নাম, ফোন বা TrxID খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'ALL', label: 'সবগুলো' },
              { key: 'PENDING', label: `পেন্ডিং (${pendingCount})` },
              { key: 'APPROVED', label: 'অনুমোদিত' },
              { key: 'HARD_COPY', label: 'হার্ড কপি' },
              { key: 'SOFT_COPY', label: 'সফট কপি' },
              { key: 'VERIFIED', label: `ভেরিফাইড (${verifiedCount})` },
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
            title="রিফ্রেশ করুন"
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
            লাইসেন্স ডাটা লোড হচ্ছে...
          </div>
        ) : filteredLicenses.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Award className="w-8 h-8 opacity-40 text-muted-foreground" />
            কোনো লাইসেন্স অর্ডার পাওয়া যায়নি
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-3 px-4">বিক্রেতা / স্টোর</th>
                  <th className="py-3 px-4">লাইসেন্স ধরণ</th>
                  <th className="py-3 px-4">পেমেন্ট বিবরণ (হার্ড কপি)</th>
                  <th className="py-3 px-4">৭ সংখ্যার ভেরিফিকেশন কোড</th>
                  <th className="py-3 px-4">স্ট্যাটাস ও ভেরিফিকেশন</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
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
                          আবেদনের তারিখ: {new Date(lic.createdAt).toLocaleDateString('bn-BD', { dateStyle: 'medium' })}
                        </div>
                      </td>

                      {/* License Type */}
                      <td className="py-3.5 px-4">
                        {isHardCopy ? (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1 px-2.5 py-0.5">
                            <CreditCard className="w-3 h-3" /> হার্ড কপি (Paid)
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[11px] gap-1 px-2.5 py-0.5">
                            <FileText className="w-3 h-3" /> সফট কপি (Free)
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
                              ভিউ লিংক <ExternalLink className="w-3 h-3" />
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
                          <span className="text-muted-foreground text-[11px]">— প্রযোজ্য নয় —</span>
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
                                title="কোড কপি করুন (হার্ড কপিতে লেখার জন্য)"
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
                              অনুমোদনের পর জেনারেট হবে
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-[11px]">— প্রযোজ্য নয় —</span>
                        )}
                      </td>

                      {/* Status & Delivery Verification */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {lic.status === 'PENDING' && (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] gap-1 px-2.5">
                              <Clock className="w-3 h-3" /> পেন্ডিং রিভিউ
                            </Badge>
                          )}
                          {lic.status === 'APPROVED' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1 px-2.5">
                              <CheckCircle2 className="w-3 h-3" /> অনুমোদিত
                            </Badge>
                          )}
                          {lic.status === 'REJECTED' && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] gap-1 px-2.5">
                              <XCircle className="w-3 h-3" /> বাতিলকৃত
                            </Badge>
                          )}

                          {/* Specific Delivery Verification Tag for Hard Copy */}
                          {isHardCopy && lic.status === 'APPROVED' && (
                            <div>
                              {lic.isDeliveryVerified ? (
                                <Badge className="bg-emerald-600 text-white font-medium gap-1 text-[11px] px-2.5 py-0.5 shadow-sm">
                                  <ShieldCheck className="w-3 h-3" /> ভেরিফাইড (হাতে পেয়েছে)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[10px] gap-1 border-dashed">
                                  <Clock className="w-2.5 h-2.5" /> বিক্রেতা এখনো কোড সাবমিট করেনি
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
                                <CheckCircle2 className="w-3.5 h-3.5" /> এপ্রুভ করুন
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
                                <XCircle className="w-3.5 h-3.5" /> বাতিল
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
                              title="লিংক এডিট করুন"
                            >
                              <Edit3 className="w-3 h-3" /> লিংক এডিট
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
              <Award className="w-5 h-5 text-primary" /> লাইসেন্স অনুমোদন ও লিংক প্রদান
            </DialogTitle>
          </DialogHeader>

          {approvingLicense && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">স্টোর / শপ: </span>
                  <span className="font-semibold text-foreground">
                    {approvingLicense.user.sellerProfile?.companyName || approvingLicense.user.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">লাইসেন্স ধরণ: </span>
                  <span className="font-medium">
                    {approvingLicense.type === 'HARD_COPY' ? 'হার্ড কপি (Hard Copy)' : 'সফট কপি (Soft Copy)'}
                  </span>
                </div>
                {approvingLicense.type === 'HARD_COPY' && (
                  <div>
                    <span className="text-muted-foreground">পেমেন্ট মেথড ও TrxID: </span>
                    <span className="font-mono text-primary font-medium">
                      {approvingLicense.paymentMethod} • {approvingLicense.transactionId}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseUrl" className="text-xs font-medium">
                  লাইসেন্স এর লিংক (URL) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="licenseUrl"
                  placeholder="https://drive.google.com/... বা লাইসেন্স সার্টিফিকেটের লিংক দিন"
                  value={licenseUrlInput}
                  onChange={(e) => setLicenseUrlInput(e.target.value)}
                  className="text-xs h-9"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  এই লিংকটি বিক্রেতার ড্যাশবোর্ডে "ভিউ" বাটনের মাধ্যমে সরাসরি প্রদর্শিত হবে।
                </p>
              </div>

              {approvingLicense.type === 'HARD_COPY' && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> হার্ড কপি ভেরিফিকেশন কোড
                  </p>
                  <p>
                    অনুমোদন বাটনে ক্লিক করলে সিস্টেম স্বয়ংক্রিয়ভাবে একটি ৭ সংখ্যার কোড তৈরি করবে। সেই কোডটি কুরিয়ারে পাঠানো ফিজিক্যাল লাইসেন্সের সাথে অন্তর্ভুক্ত করুন।
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
              বাতিল
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={handleApprove}
              disabled={approvalLoading || !licenseUrlInput.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              {approvalLoading ? 'পাঠানো হচ্ছে...' : 'সেন্ড ও অনুমোদন করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Modal ─── */}
      <Dialog open={Boolean(rejectingLicense)} onOpenChange={(o) => !o && setRejectingLicense(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" /> লাইসেন্স আবেদন বাতিল করুন
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              বাতিল করার কারণ উল্লেখ করুন (বিক্রেতা এই কারণটি দেখতে পারবে):
            </p>
            <Input
              placeholder="যেমন: ভুল ট্রানজেকশন আইডি বা পেমেন্ট পাওয়া যায়নি"
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
              ফিরে যান
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={rejectLoading}
            >
              {rejectLoading ? 'বাতিল হচ্ছে...' : 'আবেদন বাতিল নিশ্চিত করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
