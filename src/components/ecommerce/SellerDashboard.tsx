'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore, authHeaders, safeImgSrc, buildSellerShareUrl } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Store, DollarSign, Package, Clock, Plus, CheckCircle2,
  XCircle, TrendingUp, Upload, User, MapPin, Phone, Mail, FileText,
  AlertCircle, ShieldCheck, Eye, Loader2, Save, Settings, Check, CreditCard,
  MessageCircle, ExternalLink, HelpCircle, FileCheck, CheckCheck, Filter,
  Share2, Ticket, Power, PowerOff, Trash2, Pencil, Copy, X,
  Award, KeyRound, ChevronLeft, Shield, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Product } from '@/lib/store';

export interface SellerPaymentConfigItem {
  name: string;
  icon?: string;
  active: boolean;
  accountNumber: string;
  accountType: 'PERSONAL' | 'AGENT' | 'MERCHANT';
  instructions: string;
}

const DEFAULT_METHODS: SellerPaymentConfigItem[] = [
  { name: 'bKash', icon: '/payment-methods/bkash.png', active: true, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Nagad', icon: '/payment-methods/nagad.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Rocket', icon: '/payment-methods/rocket.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Upay', icon: '/payment-methods/upay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'mCash', icon: '/payment-methods/mcash.webp', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'GPay', icon: '/payment-methods/gpay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Cellfin', icon: '/payment-methods/cellfin.jpg', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Mukto-Pay', icon: '/payment-methods/muktopay.webp', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Nexus-Pay', icon: '/payment-methods/nexuspay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'Pathao-Pay', icon: '/payment-methods/pathaopay.png', active: false, accountNumber: '', accountType: 'PERSONAL', instructions: '' },
  { name: 'cash_on_delivery', icon: '/payment-methods/cash_on_delivery.jpg', active: true, accountNumber: '', accountType: 'PERSONAL', instructions: 'ক্যাশ অন ডেলিভারি প্রযোজ্য' },
];

export function SellerDashboard() {
  const { user, sellerStats, sellerProducts, sellerOrders, setSellerData, categories, setView, selectProduct, showToast, sellerProfile } = useStore();
  const [approved, setApproved] = useState<boolean>(() => {
    return Boolean(sellerProfile?.approved || user?.role === 'SELLER');
  });
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedSellerOrder, setSelectedSellerOrder] = useState<any>(null);

  // Order status & payment proof management state
  const [sellerPaymentProofs, setSellerPaymentProofs] = useState<any[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [processingProofId, setProcessingProofId] = useState<string | null>(null);
  const [proofFilter, setProofFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [rejectingProofId, setRejectingProofId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [statusChangeState, setStatusChangeState] = useState<{ status: string; trackingNumber: string; notes: string }>({
    status: 'PENDING',
    trackingNumber: '',
    notes: '',
  });

  // License System State
  const [licenses, setLicenses] = useState<any[]>([]);
  const [softCopyLicense, setSoftCopyLicense] = useState<any | null>(null);
  const [hardCopyLicense, setHardCopyLicense] = useState<any | null>(null);
  const [licenseFee, setLicenseFee] = useState<number>(1000);
  const [licensePaymentMethods, setLicensePaymentMethods] = useState<any[]>([]);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [licenseModalView, setLicenseModalView] = useState<'SELECT' | 'HARD_PAYMENT'>('SELECT');
  const [selectedLicenseMethod, setSelectedLicenseMethod] = useState<any | null>(null);
  const [licenseTrxId, setLicenseTrxId] = useState('');
  const [licenseSenderNum, setLicenseSenderNum] = useState('');
  const [requestingLicense, setRequestingLicense] = useState(false);

  // Delivery verification modal state (for Hard Copy 7-digit code)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [submittingVerifyCode, setSubmittingVerifyCode] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    comparePrice: '',
    categoryId: '',
    stock: '',
    description: '',
    tags: '',
    image: '',
    images: '',
    colors: '',
    sizes: '',
    specs: [] as { label: string; value: string }[],
  });

  const addProductSpec = () => {
    setNewProduct(prev => ({
      ...prev,
      specs: [...(prev.specs || []), { label: '', value: '' }],
    }));
  };

  const updateProductSpec = (idx: number, field: 'label' | 'value', val: string) => {
    setNewProduct(prev => {
      const updated = [...(prev.specs || [])];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], [field]: val };
      }
      return { ...prev, specs: updated };
    });
  };

  const removeProductSpec = (idx: number) => {
    setNewProduct(prev => ({
      ...prev,
      specs: (prev.specs || []).filter((_, i) => i !== idx),
    }));
  };

  const [verificationForm, setVerificationForm] = useState({
    businessName: '',
    businessType: 'Retailer',
    businessAddress: '',
    businessCity: '',
    businessCountry: 'Bangladesh',
    nidNumber: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    description: '',
    paymentMethod: 'bKash',
    transactionId: '',
    senderNumber: '',
  });

  const [storeProfileForm, setStoreProfileForm] = useState({
    companyName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    country: 'Bangladesh',
    website: '',
    description: '',
  });

  const [verificationFee, setVerificationFee] = useState<number>(500);
  const [digitalPaymentMethods, setDigitalPaymentMethods] = useState<any[]>([]);
  const [sellerPaymentMethods, setSellerPaymentMethods] = useState<SellerPaymentConfigItem[]>(DEFAULT_METHODS);
  const [sellerProfileData, setSellerProfileData] = useState<any>(null);

  // Verification fee coupon state
  const [verificationCouponInput, setVerificationCouponInput] = useState('');
  const [checkingVerificationCoupon, setCheckingVerificationCoupon] = useState(false);
  const [appliedVerificationCoupon, setAppliedVerificationCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);

  // Seller store product coupons
  const [sellerCoupons, setSellerCoupons] = useState<any[]>([]);
  const [loadingSellerCoupons, setLoadingSellerCoupons] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '',
    maxUses: '',
    startDate: '',
    endDate: '',
    active: true,
  });
  const [savingCoupon, setSavingCoupon] = useState(false);

  const shareProfileUrl = useMemo(() => {
    const activeProf = sellerProfileData || sellerProfile;
    return buildSellerShareUrl(user, activeProf, storeProfileForm.companyName || verificationForm.businessName);
  }, [sellerProfileData, sellerProfile, storeProfileForm.companyName, verificationForm.businessName, user]);

  const copyShareProfileLink = () => {
    if (!shareProfileUrl) return;
    navigator.clipboard.writeText(shareProfileUrl);
    showToast('প্রোফাইল লিংক কপি করা হয়েছে! (Profile link copied)');
  };

  const loadSellerCoupons = async () => {
    try {
      setLoadingSellerCoupons(true);
      const res = await fetch('/api/seller/coupons', { headers: authHeaders(useStore.getState) });
      if (res.ok) {
        const d = await res.json();
        setSellerCoupons(d.coupons || []);
      }
    } catch {
      showToast('Failed to load store coupons', 'error');
    } finally {
      setLoadingSellerCoupons(false);
    }
  };

  const applyVerificationCoupon = async () => {
    if (!verificationCouponInput.trim()) return;
    setCheckingVerificationCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCouponInput.trim(),
          type: 'SELLER_VERIFICATION',
          subtotal: verificationFee,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || 'Invalid verification coupon', 'error');
        return;
      }
      setAppliedVerificationCoupon({
        code: d.coupon.code,
        discountAmount: d.coupon.discountAmount,
      });
      showToast(`Verification coupon '${d.coupon.code}' applied! Saved ৳${d.coupon.discountAmount}`);
    } catch {
      showToast('Failed to validate coupon', 'error');
    } finally {
      setCheckingVerificationCoupon(false);
    }
  };

  const removeVerificationCoupon = () => {
    setAppliedVerificationCoupon(null);
    setVerificationCouponInput('');
    showToast('Coupon removed');
  };

  const openAddCouponDialog = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderAmount: '',
      maxUses: '',
      startDate: '',
      endDate: '',
      active: true,
    });
    setCouponDialogOpen(true);
  };

  const openEditCouponDialog = (c: any) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount),
      maxUses: c.maxUses !== null ? String(c.maxUses) : '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      active: c.active,
    });
    setCouponDialogOpen(true);
  };

  const handleSaveSellerCoupon = async () => {
    if (!couponForm.code.trim()) {
      showToast('Coupon code is required', 'error');
      return;
    }
    const val = parseFloat(couponForm.discountValue);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid positive discount value', 'error');
      return;
    }
    if (couponForm.discountType === 'PERCENTAGE' && val > 100) {
      showToast('Percentage cannot exceed 100', 'error');
      return;
    }

    setSavingCoupon(true);
    try {
      const url = editingCoupon ? `/api/seller/coupons?id=${editingCoupon.id}` : '/api/seller/coupons';
      const method = editingCoupon ? 'PATCH' : 'POST';
      const payload: Record<string, unknown> = {
        code: couponForm.code.trim().toUpperCase(),
        discountType: couponForm.discountType,
        discountValue: val,
        minOrderAmount: parseFloat(couponForm.minOrderAmount) || 0,
        maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses, 10) : null,
        startDate: couponForm.startDate ? new Date(couponForm.startDate).toISOString() : null,
        endDate: couponForm.endDate ? new Date(couponForm.endDate).toISOString() : null,
        active: couponForm.active,
      };

      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || 'Failed to save coupon', 'error');
        return;
      }

      showToast(editingCoupon ? 'Coupon updated!' : 'Store coupon created!');
      setCouponDialogOpen(false);
      loadSellerCoupons();
    } catch {
      showToast('Failed to save coupon', 'error');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteSellerCoupon = async (id: string) => {
    try {
      const res = await fetch(`/api/seller/coupons?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(useStore.getState),
      });
      if (res.ok) {
        showToast('Coupon deleted');
        loadSellerCoupons();
      } else {
        const d = await res.json();
        showToast(d.error || 'Delete failed', 'error');
      }
    } catch {
      showToast('Failed to delete coupon', 'error');
    }
  };

  const handleToggleSellerCouponActive = async (c: any) => {
    try {
      const res = await fetch(`/api/seller/coupons?id=${c.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active }),
      });
      if (res.ok) {
        showToast(c.active ? 'Coupon deactivated' : 'Coupon activated');
        loadSellerCoupons();
      }
    } catch {
      showToast('Failed to toggle coupon status', 'error');
    }
  };

  const loadSellerData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch('/api/seller', { headers: authHeaders(useStore.getState) });
      if (res.ok) {
        const data = await res.json();
        setSellerData(data);
        setSellerProfileData(data.profile || null);
        if (data.profile) {
          useStore.getState().setSellerProfile(data.profile);
        }
        const isUserSellerApproved = Boolean(data.approved || user?.role === 'SELLER' || data.profile?.approved);
        setApproved(isUserSellerApproved);
        setVerification(data.verification || null);
        if (data.feeAmount !== undefined) {
          setVerificationFee(data.feeAmount);
        }
        if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
          setDigitalPaymentMethods(data.paymentMethods);
        }
        if (data.paymentProofs && Array.isArray(data.paymentProofs)) {
          setSellerPaymentProofs(data.paymentProofs);
        }

        // Initialize seller payment methods config
        const platformMethods = (data.allPaymentMethods && data.allPaymentMethods.length > 0)
          ? data.allPaymentMethods
          : DEFAULT_METHODS;

        let savedConfig: any[] = [];
        if (data.profile?.paymentMethodsConfig) {
          try {
            savedConfig = JSON.parse(data.profile.paymentMethodsConfig);
          } catch {}
        } else if (data.verification?.paymentMethodsData) {
          try {
            savedConfig = JSON.parse(data.verification.paymentMethodsData);
          } catch {}
        }

        const savedMap = new Map((Array.isArray(savedConfig) ? savedConfig : []).map(m => [String(m.name).toLowerCase(), m]));

        const initializedMethods: SellerPaymentConfigItem[] = platformMethods.map((pm: any) => {
          const saved = savedMap.get(String(pm.name).toLowerCase());
          const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(pm.name);
          return {
            name: pm.name,
            icon: pm.icon || `/payment-methods/${pm.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`,
            active: saved ? Boolean(saved.active) : (pm.name === 'bKash' || isCod),
            accountNumber: saved?.accountNumber || (isCod ? '' : (data.verification?.phone || user.phone || '')),
            accountType: (saved?.accountType as any) || 'PERSONAL',
            instructions: saved?.instructions || (isCod ? 'ক্যাশ অন ডেলিভারি প্রযোজ্য' : ''),
          };
        });

        setSellerPaymentMethods(initializedMethods);

        // Verification Form state
        if (data.verification) {
          setVerificationForm({
            businessName: data.verification.businessName || '',
            businessType: data.verification.businessType || 'Retailer',
            businessAddress: data.verification.businessAddress || '',
            businessCity: data.verification.businessCity || '',
            businessCountry: data.verification.businessCountry || 'Bangladesh',
            nidNumber: data.verification.nidNumber || '',
            phone: data.verification.phone || user.phone || '',
            whatsapp: data.verification.whatsapp || '',
            email: data.verification.email || user.email || '',
            website: data.verification.website || '',
            description: data.verification.description || '',
            paymentMethod: data.verification.paymentMethod || (data.paymentMethods?.[0]?.name ?? 'bKash'),
            transactionId: data.verification.transactionId || '',
            senderNumber: data.verification.senderNumber || '',
          });
        } else {
          setVerificationForm(prev => ({
            ...prev,
            phone: prev.phone || user.phone || '',
            email: prev.email || user.email || '',
          }));
        }

        // Store profile state
        setStoreProfileForm({
          companyName: data.profile?.companyName || data.verification?.businessName || '',
          phone: data.profile?.phone || data.verification?.phone || user.phone || '',
          whatsapp: data.profile?.whatsapp || data.verification?.whatsapp || '',
          email: data.profile?.email || data.verification?.email || user.email || '',
          address: data.profile?.address || data.verification?.businessAddress || '',
          city: data.profile?.city || data.verification?.businessCity || '',
          country: data.profile?.country || data.verification?.businessCountry || 'Bangladesh',
          website: data.profile?.website || data.verification?.website || '',
          description: data.profile?.description || data.verification?.description || '',
        });

        if (isUserSellerApproved) {
          fetchLicenseData();
        }
      }
    } catch (e) {
      console.error('Failed to load seller info:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenseData = async () => {
    try {
      const res = await fetch('/api/seller/license', { headers: authHeaders(useStore.getState) });
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
        setSoftCopyLicense(data.softCopy || null);
        setHardCopyLicense(data.hardCopy || null);
        if (data.licenseFee) setLicenseFee(data.licenseFee);
        if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
          setLicensePaymentMethods(data.paymentMethods);
          if (data.paymentMethods.length > 0) {
            setSelectedLicenseMethod(data.paymentMethods[0]);
          }
        }
      }
    } catch (e) {
      console.error('Fetch license data error:', e);
    }
  };

  const handleRequestSoftCopy = async () => {
    setRequestingLicense(true);
    try {
      const res = await fetch('/api/seller/license', {
        method: 'POST',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SOFT_COPY' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'সফট কপি লাইসেন্স অর্ডার সফলভাবে পাঠানো হয়েছে।');
        setLicenseModalOpen(false);
        fetchLicenseData();
      } else {
        showToast(data.error || 'আবেদন সম্পন্ন করা সম্ভব হয়নি', 'error');
      }
    } catch {
      showToast('সার্ভার এরর, পুনরায় চেষ্টা করুন', 'error');
    } finally {
      setRequestingLicense(false);
    }
  };

  const handleRequestHardCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenseMethod) {
      showToast('অনুগ্রহ করে একটি পেমেন্ট মেথড নির্বাচন করুন', 'error');
      return;
    }
    if (!licenseTrxId.trim()) {
      showToast('ট্রানজেকশন আইডি (TrxID) দেওয়া আবশ্যক', 'error');
      return;
    }
    if (!licenseSenderNum.trim()) {
      showToast('প্রেরকের ফোন নম্বর দেওয়া আবশ্যক', 'error');
      return;
    }

    setRequestingLicense(true);
    try {
      const res = await fetch('/api/seller/license', {
        method: 'POST',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'HARD_COPY',
          paymentMethod: selectedLicenseMethod.name,
          transactionId: licenseTrxId.trim(),
          senderNumber: licenseSenderNum.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'হার্ড কপি লাইসেন্স অর্ডার সফলভাবে সাবমিট হয়েছে।');
        setLicenseModalOpen(false);
        setLicenseTrxId('');
        setLicenseSenderNum('');
        fetchLicenseData();
      } else {
        showToast(data.error || 'আবেদন সম্পন্ন করা সম্ভব হয়নি', 'error');
      }
    } catch {
      showToast('সার্ভার এরর, পুনরায় চেষ্টা করুন', 'error');
    } finally {
      setRequestingLicense(false);
    }
  };

  const handleVerifyDeliveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput.trim()) {
      showToast('৭ সংখ্যার ভেরিফিকেশন কোড দেওয়া আবশ্যক', 'error');
      return;
    }

    setSubmittingVerifyCode(true);
    try {
      const res = await fetch('/api/seller/license/verify', {
        method: 'POST',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: hardCopyLicense?.id,
          verificationCode: verificationCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'অভিনন্দন! আপনার হার্ড কপি লাইসেন্স সফলভাবে ভেরিফাই হয়েছে।');
        setVerifyModalOpen(false);
        setVerificationCodeInput('');
        fetchLicenseData();
      } else {
        showToast(data.error || 'ভেরিফিকেশন কোড মেলেনি', 'error');
      }
    } catch {
      showToast('সার্ভার এরর, পুনরায় চেষ্টা করুন', 'error');
    } finally {
      setSubmittingVerifyCode(false);
    }
  };

  useEffect(() => {
    loadSellerData();
    loadSellerCoupons();
    if (user?.role === 'SELLER' || sellerProfile?.approved) {
      fetchLicenseData();
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-light">Sign in to access Seller Dashboard</p>
          <Button className="mt-4 bg-foreground text-background text-xs tracking-wider" onClick={() => setView('auth')}>
            Sign In / Register
          </Button>
        </div>
      </div>
    );
  }

  const updateSellerMethod = (index: number, patch: Partial<SellerPaymentConfigItem>) => {
    setSellerPaymentMethods(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  // Handle Order Status Change by Seller
  const handleUpdateOrderStatus = async (orderId: string, status: string, trackingNumber?: string, notes?: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/seller/orders', {
        method: 'PATCH',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, trackingNumber, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Order status updated to ${status}`);
        loadSellerData();
        if (selectedSellerOrder && selectedSellerOrder.id === orderId) {
          setSelectedSellerOrder((prev: any) => ({
            ...prev,
            status,
            trackingNumber: trackingNumber || prev.trackingNumber,
          }));
        }
      } else {
        showToast(data.error || 'Failed to update order status', 'error');
      }
    } catch {
      showToast('Failed to update order status', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle Payment Proof Approve or Reject by Seller
  const handlePaymentProofAction = async (proofId: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    setProcessingProofId(proofId);
    try {
      const res = await fetch('/api/seller/payment-proofs', {
        method: 'PATCH',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proofId, action, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Payment proof ${action === 'APPROVE' ? 'approved' : 'rejected'}`);
        setRejectingProofId(null);
        setRejectNotes('');
        loadSellerData();
        if (selectedSellerOrder) {
          setSelectedSellerOrder((prev: any) => ({
            ...prev,
            paymentStatus: action === 'APPROVE' ? 'PAID' : 'FAILED',
            paymentProofs: (prev.paymentProofs || []).map((p: any) =>
              p.id === proofId ? { ...p, status: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED' } : p
            ),
          }));
        }
      } else {
        showToast(data.error || 'Failed to update payment proof', 'error');
      }
    } catch {
      showToast('Failed to update payment proof', 'error');
    } finally {
      setProcessingProofId(null);
    }
  };

  // Handle image upload for product (multiple supported)
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-user-id': user.id },
          body: fd,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          newUrls.push(data.url);
        }
      }
      if (newUrls.length > 0) {
        setNewProduct(prev => {
          const currentList = prev.images ? prev.images.split(',').filter(Boolean) : (prev.image ? [prev.image] : []);
          const merged = [...currentList, ...newUrls];
          return {
            ...prev,
            image: merged[0] || '',
            images: merged.join(','),
          };
        });
        showToast(`${newUrls.length} image(s) uploaded successfully`);
      }
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProductImage = (idx: number) => {
    setNewProduct(prev => {
      const list = prev.images ? prev.images.split(',').filter(Boolean) : (prev.image ? [prev.image] : []);
      list.splice(idx, 1);
      return {
        ...prev,
        image: list[0] || '',
        images: list.join(','),
      };
    });
  };

  // Submit business verification form
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationForm.businessName || !verificationForm.businessType || !verificationForm.phone || !verificationForm.nidNumber || !verificationForm.businessAddress) {
      showToast('Please fill all required business fields', 'error');
      return;
    }

    if (!verificationForm.whatsapp.trim()) {
      showToast('Please enter your WhatsApp number for communication', 'error');
      return;
    }

    if (!verificationForm.email.trim()) {
      showToast('Please enter your contact email address', 'error');
      return;
    }

    const activeMethods = sellerPaymentMethods.filter(m => m.active);
    if (activeMethods.length === 0) {
      showToast('Please select at least one payment method for your products', 'error');
      return;
    }

    for (const m of activeMethods) {
      const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name);
      if (!isCod && !m.accountNumber.trim()) {
        showToast(`Please enter the account number for ${m.name}`, 'error');
        return;
      }
    }

    if (!verificationForm.paymentMethod || !verificationForm.transactionId.trim() || !verificationForm.senderNumber.trim()) {
      showToast('Please select payment method and provide Transaction ID (TrxID) and Sender Phone Number for verification fee', 'error');
      return;
    }

    setSubmittingVerification(true);
    try {
      const res = await fetch('/api/seller/verification', {
        method: 'POST',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...verificationForm,
          couponCode: appliedVerificationCoupon?.code || undefined,
          paymentMethodsData: sellerPaymentMethods,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Verification and profile details submitted! Admin will review your account.');
        loadSellerData();
      } else {
        showToast(data.error || 'Submission failed', 'error');
      }
    } catch {
      showToast('Failed to submit verification', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Save profile and payment methods (for approved sellers)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeProfileForm.companyName.trim()) {
      showToast('Store name is required', 'error');
      return;
    }

    const activeMethods = sellerPaymentMethods.filter(m => m.active);
    if (activeMethods.length === 0) {
      showToast('Please enable at least one payment method for your products', 'error');
      return;
    }

    for (const m of activeMethods) {
      const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name);
      if (!isCod && !m.accountNumber.trim()) {
        showToast(`Please enter the account number for ${m.name}`, 'error');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/seller', {
        method: 'PUT',
        headers: { ...authHeaders(useStore.getState), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...storeProfileForm,
          paymentMethodsConfig: sellerPaymentMethods,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Store profile & payment methods saved successfully!');
        loadSellerData();
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const createProduct = async () => {
    if (!approved) {
      showToast('You must be verified by admin before uploading products', 'error');
      return;
    }
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId) {
      showToast('Name, price and category are required', 'error');
      return;
    }
    const filteredSpecs = (newProduct.specs || []).filter(s => s.label.trim() && s.value.trim());
    const primaryImg = newProduct.image || (newProduct.images ? newProduct.images.split(',')[0].trim() : '') || '/products/hero.png';
    const allImages = newProduct.images || primaryImg;

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newProduct,
        specs: filteredSpecs,
        sellerId: user.id,
        price: parseFloat(newProduct.price) || 0,
        comparePrice: newProduct.comparePrice ? parseFloat(newProduct.comparePrice) : null,
        stock: parseInt(newProduct.stock, 10) || 0,
        image: primaryImg,
        images: allImages,
        colors: newProduct.colors || '',
        sizes: newProduct.sizes || '',
        featured: false,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Product created successfully!');
      setAddProductOpen(false);
      setNewProduct({ name: '', price: '', comparePrice: '', categoryId: '', stock: '', description: '', tags: '', image: '', images: '', colors: '', sizes: '', specs: [] });
      loadSellerData();
    } else {
      showToast(data.error || 'Failed to create product', 'error');
    }
  };

  const stats = sellerStats || {
    productCount: 0,
    totalRevenue: 0,
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    conversionRate: 0,
  };

  const statCards = [
    { label: 'Total Revenue', value: `৳ ${(stats.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
    { label: 'Items Sold', value: (stats.totalSales || 0).toLocaleString(), icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Products', value: stats.productCount || 0, icon: Package, color: 'text-purple-500' },
    { label: 'Orders', value: `${stats.totalOrders || 0} (${stats.pendingOrders || 0} Pending)`, icon: Clock, color: 'text-amber-500' },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    CONFIRMED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PROCESSING: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    SHIPPED: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    DELIVERED: 'bg-green-500/10 text-green-500 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const proofStatusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    VERIFIED: 'bg-green-500/10 text-green-500 border-green-500/20',
    REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const pendingProofsCount = sellerPaymentProofs.filter(p => p.status === 'PENDING').length;

  const filteredProofs = proofFilter === 'ALL'
    ? sellerPaymentProofs
    : sellerPaymentProofs.filter(p => p.status === proofFilter);

  // Reusable Component: Payment Methods Config List
  const renderPaymentMethodsManager = () => {
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
          <div>
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> আপনার প্রোডাক্টের পেমেন্ট মেথড নির্ধারণ করুন
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              আপনার আপলোড করা প্রডাক্টের ক্ষেত্রে ক্রেতা কোন কোন মাধ্যমে টাকা পাঠাবে তা নির্ধারণ করুন। নির্বাচিত মেথডের নাম্বার ও ধরণ (Personal / Agent) সঠিকভাবে দিন।
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto text-[10px] font-mono">
            {sellerPaymentMethods.filter(m => m.active).length}টি মেথড সক্রিয়
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {sellerPaymentMethods.map((m, idx) => {
            const isCod = ['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name);
            return (
              <div
                key={m.name}
                className={`p-3.5 rounded-xl border transition-all ${
                  m.active
                    ? 'border-foreground/40 bg-background shadow-sm ring-1 ring-foreground/10'
                    : 'border-border bg-secondary/30 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Header row: Icon, Name, and Toggle */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.icon ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-secondary/60 border border-border">
                        <img src={m.icon} alt={m.name} className="w-6 h-6 object-contain" />
                      </div>
                    ) : null}
                    <div>
                      <span className="font-semibold text-xs tracking-tight block truncate text-foreground">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {isCod ? 'Cash on Delivery' : 'Mobile / Digital Payment'}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={m.active}
                      onChange={e => updateSellerMethod(idx, { active: e.target.checked })}
                      className="w-4 h-4 rounded text-foreground accent-foreground cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-foreground">
                      {m.active ? 'সক্রিয়' : 'বন্ধ'}
                    </span>
                  </label>
                </div>

                {/* Sub-inputs when active */}
                {m.active && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    {isCod ? (
                      <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                        ✓ ক্যাশ অন ডেলিভারি সক্রিয় (ক্রেতা সরাসরি হোম ডেলিভারির সময় মূল্য পরিশোধ করবেন)
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              অ্যাকাউন্ট নাম্বার *
                            </Label>
                            <Input
                              required={m.active}
                              value={m.accountNumber}
                              onChange={e => updateSellerMethod(idx, { accountNumber: e.target.value })}
                              placeholder="e.g. 017XXXXXXXX"
                              className="mt-1 h-8 bg-secondary/60 border-border text-xs font-mono"
                            />
                          </div>

                          <div>
                            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              অ্যাকাউন্টের ধরণ *
                            </Label>
                            <select
                              value={m.accountType}
                              onChange={e => updateSellerMethod(idx, { accountType: e.target.value as any })}
                              className="mt-1 h-8 w-full px-2 bg-secondary/60 border border-border rounded-md text-xs font-medium"
                            >
                              <option value="PERSONAL">Personal (পার্সোনাল)</option>
                              <option value="AGENT">Agent (এজেন্ট)</option>
                              <option value="MERCHANT">Merchant (মার্চেন্ট)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            বিশেষ নির্দেশনা (ঐচ্ছিক)
                          </Label>
                          <Input
                            value={m.instructions}
                            onChange={e => updateSellerMethod(idx, { instructions: e.target.value })}
                            placeholder={`e.g. ${m.name} নাম্বারে সেন্ড মানি করুন...`}
                            className="mt-1 h-8 bg-secondary/60 border-border text-xs"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-light tracking-tight">Seller Dashboard</h1>
              {approved ? (
                <Badge className="bg-green-500/10 text-green-600 border border-green-500/20 gap-1.5 py-1 px-2.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Seller
                </Badge>
              ) : verification?.status === 'PENDING' ? (
                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 gap-1.5 py-1 px-2.5">
                  <Clock className="w-3.5 h-3.5" /> Verification Pending Review
                </Badge>
              ) : (
                <Badge className="bg-destructive/10 text-destructive border border-destructive/20 gap-1.5 py-1 px-2.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Verification Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Store: <span className="text-foreground font-medium">{storeProfileForm.companyName || verificationForm.businessName || user.name}</span> • Manage your exclusive catalog, payment proofs, and customer orders
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {shareProfileUrl && (
              <Button
                variant="outline"
                className="text-xs tracking-wider h-10 px-4 border-foreground/30 hover:border-foreground"
                onClick={copyShareProfileLink}
                title="শেয়ার প্রোফাইল লিংক কপি করুন"
              >
                <Share2 className="w-4 h-4 mr-2" />
                শেয়ার প্রোফাইল
              </Button>
            )}

            {/* ─── Business License Header Quick Actions ─── */}
            {approved && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Pending State */}
                {hardCopyLicense?.status === 'PENDING' ? (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-3.5 h-10 gap-1.5 flex items-center font-medium shadow-sm">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>পেন্ডিং (হার্ড কপি)</span>
                  </Badge>
                ) : softCopyLicense?.status === 'PENDING' && !hardCopyLicense ? (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-3.5 h-10 gap-1.5 flex items-center font-medium shadow-sm">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>পেন্ডিং (সফট কপি)</span>
                  </Badge>
                ) : null}

                {/* Hard Copy Approved */}
                {hardCopyLicense?.status === 'APPROVED' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {hardCopyLicense.licenseUrl && (
                      <Button
                        variant="outline"
                        className="text-xs tracking-wider h-10 px-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 font-medium shadow-sm"
                        onClick={() => window.open(hardCopyLicense.licenseUrl, '_blank')}
                        title="আপনার অফিসিয়াল লাইসেন্স দেখুন"
                      >
                        <ExternalLink className="w-4 h-4" /> ভিউ
                      </Button>
                    )}

                    {!hardCopyLicense.isDeliveryVerified ? (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs tracking-wider h-10 px-4 gap-1.5 font-medium shadow-sm"
                        onClick={() => {
                          setVerificationCodeInput('');
                          setVerifyModalOpen(true);
                        }}
                        title="হার্ড কপির সাথে প্রাপ্ত ৭ সংখ্যার কোড দিয়ে ভেরিফাই করুন"
                      >
                        <KeyRound className="w-4 h-4" /> ভেরিফাই
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-600 text-white text-xs h-10 px-3.5 gap-1.5 font-medium flex items-center shadow-sm">
                        <ShieldCheck className="w-4 h-4" /> ভেরিফাইড
                      </Badge>
                    )}
                  </div>
                ) : softCopyLicense?.status === 'APPROVED' ? (
                  /* Soft Copy Approved */
                  <div className="flex flex-wrap items-center gap-2">
                    {softCopyLicense.licenseUrl && (
                      <Button
                        variant="outline"
                        className="text-xs tracking-wider h-10 px-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 font-medium shadow-sm"
                        onClick={() => window.open(softCopyLicense.licenseUrl, '_blank')}
                        title="আপনার সফট কপি লাইসেন্স দেখুন"
                      >
                        <ExternalLink className="w-4 h-4" /> ভিউ
                      </Button>
                    )}

                    {(!hardCopyLicense || hardCopyLicense.status === 'REJECTED') && (
                      <Button
                        variant="outline"
                        className="text-xs tracking-wider h-10 px-4 border-primary/40 text-primary hover:bg-primary/10 gap-1.5 font-medium shadow-sm"
                        onClick={() => {
                          setLicenseModalView('HARD_PAYMENT');
                          setLicenseModalOpen(true);
                        }}
                        title="অফিসিয়াল হার্ড কপি সার্টিফিকেট অর্ডার করুন"
                      >
                        <Award className="w-4 h-4" /> গেট হার্ড কপি
                      </Button>
                    )}
                  </div>
                ) : (!softCopyLicense && !hardCopyLicense) ? (
                  /* Initial State: No license yet */
                  <Button
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs tracking-wider h-10 px-4 gap-1.5 font-medium shadow-sm"
                    onClick={() => {
                      setLicenseModalView('SELECT');
                      setLicenseModalOpen(true);
                    }}
                  >
                    <Award className="w-4 h-4" /> গেট লাইসেন্স
                  </Button>
                ) : null}
              </div>
            )}

            {approved ? (
              <Button
                className="bg-foreground text-background text-xs tracking-wider h-10 px-5"
                onClick={() => setAddProductOpen(!addProductOpen)}
              >
                <Plus className="w-4 h-4 mr-2" /> {addProductOpen ? 'Cancel' : 'Add New Product'}
              </Button>
            ) : (
              <Button
                disabled
                className="bg-secondary text-muted-foreground text-xs tracking-wider h-10 px-5 opacity-70"
                title="Complete account verification to upload products"
              >
                <Plus className="w-4 h-4 mr-2" /> Verification Required to Add Products
              </Button>
            )}
          </div>
        </div>

        {/* ─── Verification State Banner (When not approved) ───────────────── */}
        {!approved && !loading && (
          <div className="mb-10">
            {verification?.status === 'PENDING' ? (
              <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-foreground">
                      ভেরিফিকেশন রিকোয়েস্ট সফলভাবে জমা হয়েছে (Under Review)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      আপনার ব্যবসায়ের তথ্যাদি ও নির্বাচিত প্রোডাক্ট পেমেন্ট মেথড অ্যাডমিনের কাছে পৌঁছানো হয়েছে। অ্যাডমিন তথ্যগুলো যাচাই করে এপ্রুভ করলেই আপনি সরাসরি প্রোডাক্ট আপলোড ও সেল শুরু করতে পারবেন।
                    </p>

                    <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border grid sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Business Name</span>
                        <span className="font-medium">{verification.businessName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Business Type</span>
                        <span className="font-medium">{verification.businessType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Phone / Mobile</span>
                        <span className="font-mono">{verification.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">WhatsApp</span>
                        <span className="font-mono text-green-600 dark:text-green-400 font-medium">{verification.whatsapp || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Email</span>
                        <span>{verification.email || user.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">NID / Trade License</span>
                        <span className="font-mono font-medium">{verification.nidNumber}</span>
                      </div>
                      <div className="sm:col-span-3">
                        <span className="text-muted-foreground block text-[10px] uppercase">Address</span>
                        <span>{verification.businessAddress}, {verification.businessCity}, {verification.businessCountry}</span>
                      </div>

                      {/* Display summary of chosen seller payment methods */}
                      <div className="sm:col-span-3 pt-2 border-t border-border/60">
                        <span className="text-muted-foreground block text-[10px] uppercase mb-1.5">আপনার প্রোডাক্টের জন্য নির্বাচিত পেমেন্ট মেথড</span>
                        <div className="flex flex-wrap gap-2">
                          {sellerPaymentMethods.filter(m => m.active).map(m => (
                            <Badge key={m.name} variant="secondary" className="text-[10px] px-2 py-0.5">
                              {m.name} {m.accountType ? `(${m.accountType})` : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {verification.paymentMethod && (
                        <div className="sm:col-span-3 p-3 rounded-lg bg-background/60 border border-border mt-1 grid sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Approval Fee</span>
                            <span className="font-medium text-foreground">{verification.feeAmount ? `৳ ${verification.feeAmount}` : 'Paid'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Method</span>
                            <span className="font-medium text-foreground">{verification.paymentMethod}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">TrxID / Sender</span>
                            <span className="font-mono text-foreground">{verification.transactionId || '—'} ({verification.senderNumber || '—'})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-2xl bg-secondary/60 border border-border shadow-sm">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-foreground" />
                    <h2 className="text-lg font-medium">সেলার অ্যাকাউন্ট ভেরিফিকেশন ও প্রোফাইল ফর্ম (Seller Verification & Profile)</h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    ল্যাক্স পিক্সেলে সফলভাবে বিক্রেতা হতে আপনার যোগাযোগের তথ্য, ব্যবসার সঠিক বিবরণ এবং আপনার প্রোডাক্ট বিক্রির টাকা গ্রহণের জন্য পছন্দসই পেমেন্ট মেথডগুলো সেট করুন।
                  </p>

                  {verification?.status === 'REJECTED' && (
                    <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      <p className="font-semibold mb-1">পূর্বের আবেদনটি রিজেক্ট করা হয়েছিল:</p>
                      <p>{verification.rejectReason || 'প্রদত্ত তথ্যসমূহ সঠিক ছিল না। অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় জমা দিন।'}</p>
                    </div>
                  )}

                  <form onSubmit={handleVerificationSubmit} className="space-y-6">
                    {/* 1. Contact Information Section */}
                    <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Phone className="w-4 h-4 text-foreground" />
                        <h3 className="text-sm font-medium">১. বিক্রেতা যোগাযোগের তথ্য (Seller Contact Information)</h3>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Mobile Phone Number *</Label>
                          <Input
                            required
                            value={verificationForm.phone}
                            onChange={e => setVerificationForm({ ...verificationForm, phone: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">সরাসরি কল যোগাযোগের জন্য ফোন নাম্বার</p>
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-green-500" /> WhatsApp Number *
                          </Label>
                          <Input
                            required
                            value={verificationForm.whatsapp}
                            onChange={e => setVerificationForm({ ...verificationForm, whatsapp: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">গ্রাহক ও অ্যাডমিনের সাথে হোয়াটসঅ্যাপ চ্যাটের জন্য</p>
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email Address *
                          </Label>
                          <Input
                            required
                            type="email"
                            value={verificationForm.email}
                            onChange={e => setVerificationForm({ ...verificationForm, email: e.target.value })}
                            placeholder="seller@example.com"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">অর্ডার নোটিফিকেশন ও যোগাযোগ ইমেইল</p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Business Details Section */}
                    <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Store className="w-4 h-4 text-foreground" />
                        <h3 className="text-sm font-medium">২. ব্যবসায় ও স্টোর সংক্রান্ত তথ্য (Store Details)</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business / Store Name *</Label>
                          <Input
                            required
                            value={verificationForm.businessName}
                            onChange={e => setVerificationForm({ ...verificationForm, businessName: e.target.value })}
                            placeholder="e.g. Royal Fashion Boutique"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business Type *</Label>
                          <select
                            value={verificationForm.businessType}
                            onChange={e => setVerificationForm({ ...verificationForm, businessType: e.target.value })}
                            className="mt-1.5 h-10 w-full px-3 bg-secondary/50 border border-border rounded-md text-xs font-medium"
                          >
                            <option value="Retailer">Retailer (খুচরা বিক্রেতা)</option>
                            <option value="Wholesaler">Wholesaler (পাইকারি বিক্রেতা)</option>
                            <option value="Brand / Manufacturer">Brand / Manufacturer (ব্র্যান্ড বা প্রস্তুতকারক)</option>
                            <option value="Artisan / Designer">Artisan / Designer (শিল্পী বা ডিজাইনার)</option>
                            <option value="Individual Seller">Individual Seller (ব্যক্তিগত বিক্রেতা)</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">NID / Trade License / Tax ID *</Label>
                          <Input
                            required
                            value={verificationForm.nidNumber}
                            onChange={e => setVerificationForm({ ...verificationForm, nidNumber: e.target.value })}
                            placeholder="National ID or Trade License #"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Website / Facebook Page (Optional)</Label>
                          <Input
                            value={verificationForm.website}
                            onChange={e => setVerificationForm({ ...verificationForm, website: e.target.value })}
                            placeholder="https://..."
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Full Business / Pickup Address *</Label>
                          <Input
                            required
                            value={verificationForm.businessAddress}
                            onChange={e => setVerificationForm({ ...verificationForm, businessAddress: e.target.value })}
                            placeholder="Shop/Office number, Street, Area"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City / District *</Label>
                          <Input
                            required
                            value={verificationForm.businessCity}
                            onChange={e => setVerificationForm({ ...verificationForm, businessCity: e.target.value })}
                            placeholder="Dhaka, Chittagong, Sylhet, etc."
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country *</Label>
                          <Input
                            required
                            value={verificationForm.businessCountry}
                            onChange={e => setVerificationForm({ ...verificationForm, businessCountry: e.target.value })}
                            placeholder="Bangladesh"
                            className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business Description / Bio</Label>
                          <textarea
                            rows={3}
                            value={verificationForm.description}
                            onChange={e => setVerificationForm({ ...verificationForm, description: e.target.value })}
                            placeholder="Tell us about the products you intend to sell, your business background, etc."
                            className="mt-1.5 w-full p-3 bg-secondary/50 border border-border rounded-md text-xs resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Product Payment Methods Section */}
                    <div className="p-5 rounded-xl bg-background border border-border">
                      {renderPaymentMethodsManager()}
                    </div>

                    {/* 4. Verification & Approval Fee Payment Section */}
                    <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">৪. প্ল্যাটফর্ম ভেরিফিকেশন ও অনুমোদন ফি (Approval Fee)</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            সেলার অ্যাকাউন্ট ভেরিফিকেশনের জন্য নির্ধারিত ফি প্রদান করে নিচে ট্রানজেকশন আইডি ও আপনার সেন্ডার নাম্বার দিন।
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {appliedVerificationCoupon ? (
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground line-through mr-1.5">৳ {verificationFee}</span>
                              <Badge className="bg-green-500/10 text-green-600 border border-green-500/30 text-sm font-bold">
                                ৳ {Math.max(0, verificationFee - appliedVerificationCoupon.discountAmount)}
                              </Badge>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-sm self-start sm:self-auto shrink-0">
                              ফি: ৳ {verificationFee}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Coupon input for verification fee */}
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5" /> ভেরিফিকেশন ফি কুপন (Coupon Code)
                        </Label>
                        {appliedVerificationCoupon ? (
                          <div className="flex items-center justify-between p-2 rounded-md bg-green-500/10 border border-green-500/30">
                            <span className="text-xs font-mono font-medium text-green-700 dark:text-green-300">
                              ✓ {appliedVerificationCoupon.code} (-৳{appliedVerificationCoupon.discountAmount})
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={removeVerificationCoupon}
                              className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              value={verificationCouponInput}
                              onChange={e => setVerificationCouponInput(e.target.value.toUpperCase())}
                              placeholder="কুপন কোড লিখুন..."
                              className="h-9 bg-background border-border text-xs font-mono uppercase"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={checkingVerificationCoupon || !verificationCouponInput.trim()}
                              onClick={applyVerificationCoupon}
                              className="h-9 px-4 text-xs shrink-0"
                            >
                              {checkingVerificationCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Payment Method Selector Grid */}
                      <div className="space-y-2 mb-4">
                        <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">অ্যাডমিন ফি পেমেন্ট মেথড সিলেক্ট করুন *</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {digitalPaymentMethods.map((m) => {
                            const isSelected = verificationForm.paymentMethod === m.name;
                            return (
                              <button
                                key={m.id || m.name}
                                type="button"
                                onClick={() => setVerificationForm({ ...verificationForm, paymentMethod: m.name })}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                                  isSelected
                                    ? 'border-foreground bg-secondary ring-1 ring-foreground'
                                    : 'border-border bg-card hover:border-muted-foreground/40'
                                }`}
                              >
                                {m.icon && (
                                  <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                    <img src={m.icon} alt={m.name} className="w-full h-full object-contain" />
                                  </div>
                                )}
                                <span className="text-[11px] font-medium leading-tight">{m.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Method Instructions */}
                      {(() => {
                        const activeMethod = digitalPaymentMethods.find(m => m.name === verificationForm.paymentMethod);
                        return activeMethod?.instructions ? (
                          <div className="p-3 rounded-lg bg-secondary/80 border border-border text-xs text-muted-foreground mb-4">
                            <p className="font-medium text-foreground mb-1">{activeMethod.name} পেমেন্ট নির্দেশনা:</p>
                            <p className="leading-relaxed">{activeMethod.instructions}</p>
                          </div>
                        ) : null;
                      })()}

                      {/* TrxID & Sender Phone Number inputs */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                            Transaction ID (TrxID) *
                          </Label>
                          <Input
                            required
                            value={verificationForm.transactionId}
                            onChange={e => setVerificationForm({ ...verificationForm, transactionId: e.target.value })}
                            placeholder="e.g. 9J8B7C6D5E"
                            className="mt-1.5 h-10 bg-secondary/50 border-border font-mono text-xs uppercase"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">পেমেন্ট সফল হওয়ার পর প্রাপ্ত ট্রানজেকশন আইডি দিন</p>
                        </div>
                        <div>
                          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                            Sender Phone Number * (প্রেরকের নাম্বার)
                          </Label>
                          <Input
                            required
                            value={verificationForm.senderNumber}
                            onChange={e => setVerificationForm({ ...verificationForm, senderNumber: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            className="mt-1.5 h-10 bg-secondary/50 border-border font-mono text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">যে মোবাইল নাম্বার থেকে ফি পাঠিয়েছেন</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingVerification}
                      className="bg-foreground text-background text-xs tracking-wider h-11 px-8 rounded-lg mt-2"
                    >
                      {submittingVerification ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                        </span>
                      ) : (
                        'Submit Verification & Profile to Admin'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Official Business License Status Banner ───────────────────────── */}
        {approved && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-secondary/40 border border-border/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold tracking-wide">অফিসিয়াল মার্চেন্ট ও ব্যবসায়িক লাইসেন্স</h3>
                    {hardCopyLicense?.isDeliveryVerified ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] h-5 px-2 gap-1 font-medium flex items-center">
                        <ShieldCheck className="w-3 h-3" /> ফুল ভেরিফাইড মার্চেন্ট
                      </Badge>
                    ) : hardCopyLicense?.status === 'APPROVED' ? (
                      <Badge className="bg-blue-600 text-white text-[10px] h-5 px-2 gap-1 font-medium flex items-center">
                        <Sparkles className="w-3 h-3" /> হার্ড কপি অনুমোদিত
                      </Badge>
                    ) : softCopyLicense?.status === 'APPROVED' ? (
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] h-5 px-2 gap-1 font-medium flex items-center">
                        <CheckCircle2 className="w-3 h-3" /> সফট কপি অ্যাক্টিভ
                      </Badge>
                    ) : (hardCopyLicense?.status === 'PENDING' || softCopyLicense?.status === 'PENDING') ? (
                      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] h-5 px-2 gap-1 font-medium flex items-center">
                        <Clock className="w-3 h-3 animate-pulse" /> অনুমোদন পর্যালোচনাধীন
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground border-border">
                        লাইসেন্স অপশনাল
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                    Lax Pixel প্ল্যাটফর্মে আপনার স্টোরের ক্রেতাদের সর্বোচ্চ আস্থা ও বিশ্বাসযোগ্যতা নিশ্চিত করতে অফিসিয়াল ব্যবসায়িক লাইসেন্স গ্রহণ করুন।
                    সফট কপি সম্পূর্ণ ফ্রি এবং হার্ড কপি কুরিয়ারে পেতে নির্দিষ্ট ফি পরিশোধ সাপেক্ষ।
                  </p>

                  {/* Active Licenses List */}
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    {softCopyLicense && (
                      <div className="flex items-center gap-2 text-xs bg-background/60 border border-border/60 px-3 py-1.5 rounded-lg">
                        <span className="text-muted-foreground">সফট কপি:</span>
                        <span className={`font-medium ${softCopyLicense.status === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' : softCopyLicense.status === 'PENDING' ? 'text-amber-500' : 'text-rose-500'}`}>
                          {softCopyLicense.status === 'APPROVED' ? 'অনুমোদিত' : softCopyLicense.status === 'PENDING' ? 'পেন্ডিং' : 'বাতিল'}
                        </span>
                        {softCopyLicense.licenseUrl && softCopyLicense.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => window.open(softCopyLicense.licenseUrl, '_blank')}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1 ml-1"
                          >
                            <Eye className="w-3 h-3" /> ভিউ
                          </button>
                        )}
                      </div>
                    )}

                    {hardCopyLicense && (
                      <div className="flex items-center gap-2 text-xs bg-background/60 border border-border/60 px-3 py-1.5 rounded-lg">
                        <span className="text-muted-foreground">হার্ড কপি:</span>
                        <span className={`font-medium ${hardCopyLicense.status === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' : hardCopyLicense.status === 'PENDING' ? 'text-amber-500' : 'text-rose-500'}`}>
                          {hardCopyLicense.status === 'APPROVED' ? 'অনুমোদিত' : hardCopyLicense.status === 'PENDING' ? 'পেন্ডিং' : 'বাতিল'}
                        </span>
                        {hardCopyLicense.licenseUrl && hardCopyLicense.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => window.open(hardCopyLicense.licenseUrl, '_blank')}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1 ml-1"
                          >
                            <Eye className="w-3 h-3" /> ভিউ
                          </button>
                        )}
                        {hardCopyLicense.status === 'APPROVED' && (
                          hardCopyLicense.isDeliveryVerified ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 ml-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> ভেরিফাইড
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white ml-1 gap-1"
                              onClick={() => {
                                setVerificationCodeInput('');
                                setVerifyModalOpen(true);
                              }}
                            >
                              <KeyRound className="w-3 h-3" /> কোড ভেরিফাই
                            </Button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* When no soft copy or hard copy is requested yet */}
                {!softCopyLicense && !hardCopyLicense && (
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs tracking-wider h-10 px-5 gap-2 font-medium shadow-sm"
                    onClick={() => {
                      setLicenseModalView('SELECT');
                      setLicenseModalOpen(true);
                    }}
                  >
                    <Award className="w-4 h-4" /> গেট লাইসেন্স
                  </Button>
                )}

                {/* If soft copy is pending */}
                {softCopyLicense?.status === 'PENDING' && !hardCopyLicense && (
                  <Button
                    disabled
                    variant="outline"
                    className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs tracking-wider h-10 px-5 gap-2 font-medium"
                  >
                    <Clock className="w-4 h-4 animate-pulse" /> পেন্ডিং (পর্যালোচনাধীন)
                  </Button>
                )}

                {/* If soft copy is approved, can view soft copy and order hard copy */}
                {softCopyLicense?.status === 'APPROVED' && !hardCopyLicense && (
                  <>
                    {softCopyLicense.licenseUrl && (
                      <Button
                        variant="outline"
                        className="text-xs tracking-wider h-10 px-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 font-medium"
                        onClick={() => window.open(softCopyLicense.licenseUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" /> ভিউ লাইসেন্স
                      </Button>
                    )}
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs tracking-wider h-10 px-4 gap-1.5 font-medium shadow-sm"
                      onClick={() => {
                        setLicenseModalView('HARD_PAYMENT');
                        setLicenseModalOpen(true);
                      }}
                    >
                      <Award className="w-4 h-4" /> গেট হার্ড কপি
                    </Button>
                  </>
                )}

                {/* If hard copy is pending */}
                {hardCopyLicense?.status === 'PENDING' && (
                  <Button
                    disabled
                    variant="outline"
                    className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs tracking-wider h-10 px-5 gap-2 font-medium"
                  >
                    <Clock className="w-4 h-4 animate-pulse" /> পেন্ডিং (হার্ড কপি পর্যালোচনাধীন)
                  </Button>
                )}

                {/* If hard copy is approved */}
                {hardCopyLicense?.status === 'APPROVED' && (
                  <div className="flex flex-wrap items-center gap-2">
                    {hardCopyLicense.licenseUrl && (
                      <Button
                        variant="outline"
                        className="text-xs tracking-wider h-10 px-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 font-medium"
                        onClick={() => window.open(hardCopyLicense.licenseUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" /> ভিউ
                      </Button>
                    )}
                    {!hardCopyLicense.isDeliveryVerified ? (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs tracking-wider h-10 px-4 gap-1.5 font-medium shadow-sm"
                        onClick={() => {
                          setVerificationCodeInput('');
                          setVerifyModalOpen(true);
                        }}
                      >
                        <KeyRound className="w-4 h-4" /> ভেরিফাই
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-600 text-white text-xs h-10 px-4 gap-1.5 font-medium flex items-center shadow-sm">
                        <ShieldCheck className="w-4 h-4" /> ভেরিফাইড
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Seller Personal Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl bg-secondary/60 border border-border/80"
            >
              <div className="flex items-center justify-between">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">My Store</span>
              </div>
              <p className="text-2xl font-light mt-3">{s.value}</p>
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── Add Product Modal Form ──────────────────────────────────────── */}
        {addProductOpen && approved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-6 rounded-2xl bg-secondary/80 border border-border shadow-sm"
          >
            <h3 className="text-sm font-medium tracking-wide mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Product Under Your Store
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product Name *</Label>
                <Input
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. Handmade Silk Scarf"
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Category *</Label>
                <select
                  value={newProduct.categoryId}
                  onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  className="mt-1.5 h-10 w-full px-3 bg-background border border-border rounded-md text-sm"
                >
                  <option value="">Select Category...</option>
                  {(categories || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Price (৳) *</Label>
                <Input
                  type="number"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Compare Price (৳)</Label>
                <Input
                  type="number"
                  value={newProduct.comparePrice}
                  onChange={e => setNewProduct({ ...newProduct, comparePrice: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Stock Available</Label>
                <Input
                  type="number"
                  value={newProduct.stock}
                  onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                />
              </div>

              {/* Colors & Sizes (Optional) - Placed directly below price/stock */}
              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Colors (Optional)</Label>
                <Input
                  value={newProduct.colors}
                  onChange={e => setNewProduct({ ...newProduct, colors: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                  placeholder="e.g. Black, White, Navy Blue"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Separate multiple colors with comma</p>
              </div>

              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Sizes (Optional)</Label>
                <Input
                  value={newProduct.sizes}
                  onChange={e => setNewProduct({ ...newProduct, sizes: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                  placeholder="e.g. S, M, L, XL, XXL"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Separate multiple sizes with comma</p>
              </div>

              {/* Multiple Images Upload Component */}
              <div className="sm:col-span-2">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Product Images * (Multiple allowed)</Label>
                <div className="mt-1.5 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 px-4 h-10 rounded-md border border-border bg-background cursor-pointer hover:bg-secondary text-xs transition-colors shrink-0">
                      <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{uploadingImage ? 'Uploading...' : 'Choose Images'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleProductImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Select one or multiple photos (JPG, PNG, WebP)
                    </span>
                  </div>

                  {/* Uploaded Images Thumbnails */}
                  {(newProduct.images || newProduct.image) && (
                    <div className="flex gap-2.5 flex-wrap pt-1">
                      {(newProduct.images ? newProduct.images.split(',').filter(Boolean) : [newProduct.image]).map((imgUrl, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-background group shrink-0">
                          <Image src={safeImgSrc(imgUrl)} alt={`Product ${idx + 1}`} fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => removeProductImage(idx)}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                            title="Remove photo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-foreground/80 text-background text-[8px] text-center font-medium py-0.5">
                              Main
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Description</Label>
                <textarea
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={3}
                  className="mt-1.5 w-full p-3 bg-background border border-border rounded-md text-sm resize-none"
                  placeholder="Describe craftsmanship, materials, dimensions..."
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Tags</Label>
                <Input
                  value={newProduct.tags}
                  onChange={e => setNewProduct({ ...newProduct, tags: e.target.value })}
                  className="mt-1.5 h-10 bg-background border-border text-sm"
                  placeholder="luxury, handmade, authentic"
                />
              </div>

              {/* Product Specifications (Optional) */}
              <div className="sm:col-span-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label className="text-[10px] tracking-wider uppercase text-muted-foreground font-semibold">
                      Product Specifications (Optional)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Add custom details like Material, Color, Size, Warranty, etc.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-border"
                    onClick={addProductSpec}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Specification
                  </Button>
                </div>

                {(newProduct.specs || []).length > 0 && (
                  <div className="space-y-2 mt-3">
                    {newProduct.specs.map((spec, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Label (e.g. Material)"
                          value={spec.label}
                          onChange={e => updateProductSpec(idx, 'label', e.target.value)}
                          className="h-9 bg-background border-border text-xs flex-1"
                        />
                        <Input
                          placeholder="Value (e.g. 100% Cotton)"
                          value={spec.value}
                          onChange={e => updateProductSpec(idx, 'value', e.target.value)}
                          className="h-9 bg-background border-border text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeProductSpec(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
              <Button className="bg-foreground text-background text-xs tracking-wider h-10 px-6 rounded-lg" onClick={createProduct}>
                Create Product
              </Button>
              <Button variant="outline" className="h-10 text-xs px-4 rounded-lg" onClick={() => setAddProductOpen(false)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Main Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="products">
          <TabsList className="bg-secondary h-11 p-1 rounded-xl">
            <TabsTrigger value="products" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              My Products ({sellerProducts.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              Customer Orders ({sellerOrders.length})
            </TabsTrigger>
            <TabsTrigger value="proofs" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg flex items-center gap-1.5">
              Payment Proofs
              {pendingProofsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingProofsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="coupons" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5" />
              Store Coupons ({sellerCoupons.length})
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs tracking-wider h-9 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-lg">
              Store Profile & Payments
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Products Content */}
          <TabsContent value="products" className="mt-6">
            {sellerProducts.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm font-medium">No products listed yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {approved
                    ? 'Click "Add New Product" above to list your first luxury item for customers worldwide.'
                    : 'Once your seller verification is approved by admin, you will be able to upload products.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sellerProducts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-2xl bg-secondary/60 border border-border hover:border-foreground/30 transition-all cursor-pointer group"
                    onClick={() => selectProduct(p)}
                  >
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-background relative mb-3">
                      <Image src={safeImgSrc(p.image)} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] tracking-wider uppercase text-muted-foreground">{p.category?.name}</p>
                        <h4 className="text-sm font-medium tracking-wide truncate mt-0.5">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold">৳ {p.price.toLocaleString()}</span>
                          {p.comparePrice && <span className="text-xs text-muted-foreground line-through">৳ {p.comparePrice.toLocaleString()}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                        Stock: {p.stock}
                      </Badge>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{p.salesCount || 0} sold</span>
                      <span>Rating: {p.rating} ★</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Orders Content */}
          <TabsContent value="orders" className="mt-6">
            {sellerOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm font-medium">No customer orders yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  When customers purchase your listed products, their orders and items will appear right here.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden bg-secondary/40 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/80 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-3 text-left font-medium">Order Number</th>
                        <th className="p-3 text-left font-medium">Customer</th>
                        <th className="p-3 text-left font-medium">Your Items</th>
                        <th className="p-3 text-right font-medium">Your Total</th>
                        <th className="p-3 text-center font-medium">Payment Proof</th>
                        <th className="p-3 text-center font-medium">Status / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sellerOrders.map((order: any) => {
                        const proof = order.paymentProofs?.[0];
                        return (
                          <tr key={order.id} className="hover:bg-secondary/60 transition-colors">
                            <td className="p-3 font-mono font-medium">
                              {order.orderNumber}
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-foreground">{order.user?.name || 'Customer'}</span>
                              <span className="block text-[10px] text-muted-foreground">{order.shippingCity}, {order.shippingCountry}</span>
                              {order.user?.phone && (
                                <span className="block text-[10px] font-mono text-muted-foreground">{order.user.phone}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-medium">{order.items?.length || 0} item(s)</span>
                              <div className="space-y-1 mt-1">
                                {order.items?.map((i: any) => (
                                  <div key={i.id} className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                                    <span className="font-medium text-foreground">{i.productName}</span> (×{i.quantity})
                                    {(i.selectedColor || i.selectedSize) && (
                                      <span className="ml-1 text-[10px] text-foreground font-medium bg-secondary px-1.5 py-0.5 rounded border border-border">
                                        {[i.selectedColor && `Color: ${i.selectedColor}`, i.selectedSize && `Size: ${i.selectedSize}`].filter(Boolean).join(' | ')}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-right font-semibold text-green-500">
                              ৳ {(order.sellerTotal || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              {proof ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] uppercase px-2 py-0.5 cursor-pointer ${
                                    proofStatusColors[proof.status] || ''
                                  }`}
                                  onClick={() => setSelectedSellerOrder(order)}
                                >
                                  {proof.status === 'PENDING' ? 'Proof: Pending' : proof.status === 'VERIFIED' ? 'Proof: Approved' : 'Proof: Rejected'}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">COD / No Proof</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Quick status select */}
                                <select
                                  disabled={updatingOrderId === order.id}
                                  value={order.status}
                                  onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                                  className={`h-7 px-2 text-[11px] rounded-lg border bg-background font-medium ${
                                    statusColors[order.status] || ''
                                  }`}
                                >
                                  <option value="PENDING">PENDING</option>
                                  <option value="CONFIRMED">CONFIRMED</option>
                                  <option value="PROCESSING">PROCESSING</option>
                                  <option value="SHIPPED">SHIPPED</option>
                                  <option value="DELIVERED">DELIVERED</option>
                                  <option value="CANCELLED">CANCELLED</option>
                                </select>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-secondary"
                                  onClick={() => {
                                    setSelectedSellerOrder(order);
                                    setStatusChangeState({
                                      status: order.status,
                                      trackingNumber: order.trackingNumber || '',
                                      notes: '',
                                    });
                                  }}
                                  title="View order details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Dedicated Payment Proofs Content */}
          <TabsContent value="proofs" className="mt-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                <div>
                  <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-foreground" />
                    ক্রেতাদের পেমেন্ট প্রুফ ভেরিফিকেশন (Payment Proofs)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    আপনার প্রোডাক্ট কেনার সময় ক্রেতাদের দেওয়া Transaction ID ও প্রেরক নাম্বার যাচাই করে এপ্রুভ বা রিজেক্ট করুন।
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setProofFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        proofFilter === f
                          ? 'bg-foreground text-background shadow-sm'
                          : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f === 'ALL' ? 'All' : f === 'PENDING' ? `Pending (${pendingProofsCount})` : f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProofs.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-secondary/20">
                  <FileCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                  <p className="text-sm font-medium">No payment proofs found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {proofFilter === 'PENDING'
                      ? 'No pending payment proofs right now. All proofs are up to date!'
                      : 'When buyers submit payment transaction IDs, they will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProofs.map((p) => {
                    const isPending = p.status === 'PENDING';
                    const isRejecting = rejectingProofId === p.id;
                    const isProcessing = processingProofId === p.id;

                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl bg-secondary/50 border border-border shadow-sm flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {p.paymentMethod?.icon ? (
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-background border border-border">
                                  <img src={p.paymentMethod.icon} alt={p.paymentMethod.name || "Payment method"} className="w-6 h-6 object-contain" />
                                </div>
                              ) : null}
                              <div>
                                <h4 className="font-semibold text-xs text-foreground">{p.paymentMethod?.name || 'Digital Payment'}</h4>
                                <span className="font-mono text-[10px] text-muted-foreground">Order: {p.orderNumber || p.order?.orderNumber}</span>
                              </div>
                            </div>

                            <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${proofStatusColors[p.status] || ''}`}>
                              {p.status}
                            </Badge>
                          </div>

                          <div className="p-3 rounded-xl bg-background border border-border/80 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Buyer:</span>
                              <span className="font-medium text-foreground">{p.buyer?.name || p.user?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-semibold text-green-500">৳ {(p.amount || p.orderTotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Date:</span>
                              <span className="text-[11px] text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="pt-1.5 mt-1 border-t border-border/60">
                              <span className="text-muted-foreground block text-[10px] uppercase font-semibold mb-0.5">TrxID & Sender Details:</span>
                              <p className="font-mono text-xs text-foreground bg-secondary/70 p-1.5 rounded select-all break-all">
                                {p.notes || 'No TrxID details attached'}
                              </p>
                            </div>

                            {p.proofImage && (
                              <div className="pt-1">
                                <a href={p.proofImage} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline inline-flex items-center gap-1">
                                  View Screenshot Image <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-border/60">
                          {isPending ? (
                            isRejecting ? (
                              <div className="space-y-2">
                                <Input
                                  value={rejectNotes}
                                  onChange={e => setRejectNotes(e.target.value)}
                                  placeholder="রিজেক্ট করার কারণ (যেমন: ফেক TrxID / টাকা আসেনি)..."
                                  className="h-8 text-xs bg-background"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    disabled={isProcessing}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                                    onClick={() => handlePaymentProofAction(p.id, 'REJECT', rejectNotes)}
                                  >
                                    {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-8"
                                    onClick={() => { setRejectingProofId(null); setRejectNotes(''); }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={isProcessing}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8 gap-1.5"
                                  onClick={() => handlePaymentProofAction(p.id, 'APPROVE')}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isProcessing}
                                  className="flex-1 text-destructive hover:bg-destructive/10 text-xs h-8 border-destructive/30 gap-1"
                                  onClick={() => setRejectingProofId(p.id)}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </Button>
                              </div>
                            )
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                                {p.status === 'VERIFIED' ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    পেমেন্ট ভেরিফাইড ও এপ্রুভড
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                                    পেমেন্ট রিজেক্টেড
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 4: Seller Store Coupons */}
          <TabsContent value="coupons" className="mt-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-secondary/40 border border-border space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-foreground" />
                    আপনার স্টোরের প্রডাক্ট কুপনসমূহ (Store Coupons)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    এই কুপনগুলো ক্রেতারা শুধুমাত্র আপনার স্টোরের পণ্যসমূহ ক্রয়ের সময় চেকআউটে ব্যবহার করতে পারবেন।
                  </p>
                </div>
                <Button
                  onClick={openAddCouponDialog}
                  disabled={!approved}
                  className="bg-foreground text-background text-xs tracking-wider h-10 px-5 shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> নতুন কুপন তৈরি করুন
                </Button>
              </div>

              {!approved && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                  সেলার অ্যাকাউন্ট অনুমোদনের পর আপনি আপনার প্রোডাক্টের জন্য ডিসকাউন্ট কুপন তৈরি করতে পারবেন।
                </div>
              )}

              {loadingSellerCoupons ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-xs">কুপন লোড হচ্ছে...</p>
                </div>
              ) : sellerCoupons.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Ticket className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm font-medium">কোনো কুপন তৈরি করা হয়নি</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    আপনার ক্রেতাদের বিশেষ ছাড় দিতে &quot;নতুন কুপন তৈরি করুন&quot; বাটনে ক্লিক করুন।
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                        <tr>
                          <th className="p-3 text-left">কুপন কোড</th>
                          <th className="p-3 text-left">ডিসকাউন্ট</th>
                          <th className="p-3 text-left">মিনিমাম অর্ডার</th>
                          <th className="p-3 text-left">ব্যবহার</th>
                          <th className="p-3 text-left">মেয়াদ</th>
                          <th className="p-3 text-left">স্ট্যাটাস</th>
                          <th className="p-3 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sellerCoupons.map((c) => (
                          <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-foreground">
                              {c.code}
                            </td>
                            <td className="p-3 font-semibold text-green-600 dark:text-green-400">
                              {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `৳${c.discountValue} OFF`}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {c.minOrderAmount ? `৳${c.minOrderAmount}` : 'কোনো শর্ত নেই'}
                            </td>
                            <td className="p-3 text-muted-foreground font-mono">
                              {c.usedCount || 0} {c.maxUses ? `/ ${c.maxUses}` : 'বার'}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {c.startDate || c.endDate ? (
                                <span className="text-[11px]">
                                  {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'} হতে{' '}
                                  {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'সীমাহীন'}
                                </span>
                              ) : (
                                'আজীবন'
                              )}
                            </td>
                            <td className="p-3">
                              {c.banned ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  Banned by Admin
                                </Badge>
                              ) : c.active ? (
                                <Badge className="bg-green-500/10 text-green-600 border border-green-500/20 text-[10px]">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Inactive
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={c.banned}
                                  onClick={() => handleToggleSellerCouponActive(c)}
                                  className="h-8 w-8 p-0"
                                  title={c.active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                                >
                                  {c.active ? <Power className="w-3.5 h-3.5 text-amber-500" /> : <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={c.banned}
                                  onClick={() => openEditCouponDialog(c)}
                                  className="h-8 w-8 p-0"
                                  title="এডিট করুন"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteSellerCoupon(c.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 5: Store Profile & Payment Methods Settings */}
          <TabsContent value="profile" className="mt-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-secondary/40 border border-border space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-5 h-5 text-foreground" />
                  <h3 className="text-lg font-medium text-foreground">স্টোর প্রোফাইল ও পেমেন্ট মেথড সেটিংস</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  আপনার যোগাযোগের নাম্বারসমূহ, স্টোরের তথ্যাদি এবং আপনার প্রোডাক্ট চেকআউটে প্রদর্শিত পেমেন্ট মেথডগুলো এখান থেকে যেকোনো সময় আপডেট করতে পারবেন।
                </p>
              </div>

              {/* Public Store Link Card */}
              {shareProfileUrl && (
                <div className="p-4 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider">আপনার পাবলিক স্টোর লিংক (Share Profile Link)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono break-all">{shareProfileUrl}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyShareProfileLink}
                    className="shrink-0 text-xs h-9 gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> লিংক কপি করুন
                  </Button>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Contact info */}
                <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Phone className="w-4 h-4 text-foreground" />
                    <h4 className="text-sm font-medium">যোগাযোগের তথ্য (Contact Information)</h4>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Mobile Phone Number *</Label>
                      <Input
                        required
                        value={storeProfileForm.phone}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, phone: e.target.value })}
                        placeholder="e.g. 017XXXXXXXX"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp Number *
                      </Label>
                      <Input
                        required
                        value={storeProfileForm.whatsapp}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, whatsapp: e.target.value })}
                        placeholder="e.g. 017XXXXXXXX"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> Email Address *
                      </Label>
                      <Input
                        required
                        type="email"
                        value={storeProfileForm.email}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, email: e.target.value })}
                        placeholder="seller@example.com"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Store info */}
                <div className="p-5 rounded-xl bg-background border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Store className="w-4 h-4 text-foreground" />
                    <h4 className="text-sm font-medium">স্টোর তথ্য (Store Details)</h4>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Store / Company Name *</Label>
                      <Input
                        required
                        value={storeProfileForm.companyName}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, companyName: e.target.value })}
                        placeholder="e.g. Royal Fashion Boutique"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Website / Social Page (Optional)</Label>
                      <Input
                        value={storeProfileForm.website}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, website: e.target.value })}
                        placeholder="https://..."
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Business / Pickup Address</Label>
                      <Input
                        value={storeProfileForm.address}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, address: e.target.value })}
                        placeholder="Shop/Office number, Street, Area"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">City / District</Label>
                      <Input
                        value={storeProfileForm.city}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, city: e.target.value })}
                        placeholder="Dhaka, Chittagong, etc."
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Country</Label>
                      <Input
                        value={storeProfileForm.country}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, country: e.target.value })}
                        placeholder="Bangladesh"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Store Bio / Description</Label>
                      <textarea
                        rows={3}
                        value={storeProfileForm.description}
                        onChange={e => setStoreProfileForm({ ...storeProfileForm, description: e.target.value })}
                        placeholder="Describe your brand, craftsmanship, customer guarantee..."
                        className="mt-1.5 w-full p-3 bg-secondary/50 border border-border rounded-md text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods Config */}
                <div className="p-5 rounded-xl bg-background border border-border">
                  {renderPaymentMethodsManager()}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-foreground text-background text-xs tracking-wider h-11 px-8 rounded-lg gap-2"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Profile & Payment Methods
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Order Detail Modal for Seller ───────────────────────────────── */}
        <Dialog open={Boolean(selectedSellerOrder)} onOpenChange={() => setSelectedSellerOrder(null)}>
          <DialogContent className="max-w-xl bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-medium flex items-center justify-between">
                <span>Order #{selectedSellerOrder?.orderNumber}</span>
                <Badge variant="outline" className={`text-xs ${selectedSellerOrder ? statusColors[selectedSellerOrder.status] : ''}`}>
                  {selectedSellerOrder?.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {selectedSellerOrder && (
              <div className="space-y-4 text-xs mt-2">
                {/* 1. Update Order Status Controls */}
                <div className="p-3.5 bg-background border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] tracking-wider uppercase text-foreground font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> অর্ডারের স্ট্যাটাস পরিবর্তন করুন (Update Status)
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Current: <span className="font-semibold text-foreground">{selectedSellerOrder.status}</span>
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Select New Status</Label>
                      <select
                        value={statusChangeState.status || selectedSellerOrder.status}
                        onChange={e => setStatusChangeState({ ...statusChangeState, status: e.target.value })}
                        className="mt-1 h-9 w-full px-2.5 bg-secondary border border-border rounded-lg text-xs font-medium"
                      >
                        <option value="PENDING">PENDING (অপেক্ষমাণ)</option>
                        <option value="CONFIRMED">CONFIRMED (কনফার্মড)</option>
                        <option value="PROCESSING">PROCESSING (প্রসেসিং)</option>
                        <option value="SHIPPED">SHIPPED (শিপড / কুরিয়ারে প্রেরিত)</option>
                        <option value="DELIVERED">DELIVERED (ডেলিভার্ড সম্পন্ন)</option>
                        <option value="CANCELLED">CANCELLED (বাতিল)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Tracking Number (Courier)</Label>
                      <Input
                        value={statusChangeState.trackingNumber}
                        onChange={e => setStatusChangeState({ ...statusChangeState, trackingNumber: e.target.value })}
                        placeholder="e.g. STEADFAST-12345"
                        className="mt-1 h-9 bg-secondary border-border text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-muted-foreground">
                      স্ট্যাটাস পরিবর্তন করলে ক্রেতা সরাসরি তার ট্র্যাকিং পেজে আপডেট দেখতে পাবেন।
                    </p>
                    <Button
                      size="sm"
                      disabled={updatingOrderId === selectedSellerOrder.id}
                      className="bg-foreground text-background text-xs h-8 px-4 shrink-0 gap-1.5"
                      onClick={() => handleUpdateOrderStatus(
                        selectedSellerOrder.id,
                        statusChangeState.status || selectedSellerOrder.status,
                        statusChangeState.trackingNumber,
                        statusChangeState.notes
                      )}
                    >
                      {updatingOrderId === selectedSellerOrder.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" /> Save Status
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 2. Customer Delivery Information */}
                <div className="p-3.5 bg-secondary/50 rounded-xl space-y-1.5 border border-border">
                  <h4 className="text-[10px] tracking-wider uppercase text-muted-foreground font-semibold mb-1">
                    Customer Delivery Information
                  </h4>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{selectedSellerOrder.user?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedSellerOrder.user?.email}</span>
                  </div>
                  {selectedSellerOrder.user?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-mono">{selectedSellerOrder.user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 pt-1 border-t border-border/50">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>
                      {[selectedSellerOrder.shippingAddress, selectedSellerOrder.shippingCity, selectedSellerOrder.shippingCountry, selectedSellerOrder.shippingZip].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>

                {/* 3. Payment Proof Verification & Actions inside Modal */}
                <div className="p-3.5 bg-secondary/50 rounded-xl space-y-2 border border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> পেমেন্ট ভেরিফিকেশন (Payment Proof)
                    </h4>
                    <span className="font-medium text-foreground">
                      Method: <span className="font-semibold">{selectedSellerOrder.paymentMethod}</span>
                    </span>
                  </div>

                  {selectedSellerOrder.paymentProofs && selectedSellerOrder.paymentProofs.length > 0 ? (
                    selectedSellerOrder.paymentProofs.map((p: any) => {
                      const isPending = p.status === 'PENDING';
                      const isProcessing = processingProofId === p.id;

                      return (
                        <div key={p.id} className="p-3 rounded-lg bg-background border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-foreground">{p.paymentMethod?.name || selectedSellerOrder.paymentMethod}</span>
                            <Badge variant="outline" className={`text-[9px] uppercase font-semibold ${proofStatusColors[p.status] || ''}`}>
                              {p.status}
                            </Badge>
                          </div>

                          <div className="p-2 rounded bg-secondary/50 border border-border/50">
                            <span className="text-[10px] text-muted-foreground block uppercase font-medium">TrxID & Sender Details:</span>
                            <p className="font-mono text-xs font-semibold select-all mt-0.5">{p.notes || 'No TrxID provided'}</p>
                          </div>

                          {p.proofImage && (
                            <div>
                              <a href={p.proofImage} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline inline-flex items-center gap-1">
                                View Proof Screenshot <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}

                          {isPending ? (
                            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8 gap-1.5"
                                onClick={() => handlePaymentProofAction(p.id, 'APPROVE')}
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                )}
                                Approve Payment (এপ্রুভ করুন)
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                className="text-destructive hover:bg-destructive/10 text-xs h-8 border-destructive/30"
                                onClick={() => {
                                  const reason = prompt('পেমেন্ট রিজেক্ট করার কারণ লিখুন:');
                                  if (reason !== null) {
                                    handlePaymentProofAction(p.id, 'REJECT', reason);
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              Status: <span className="font-medium text-foreground">{p.status === 'VERIFIED' ? 'Approved by you' : 'Rejected'}</span>
                              {p.verifiedAt && ` on ${new Date(p.verifiedAt).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 bg-background rounded-lg border border-border text-muted-foreground">
                      {selectedSellerOrder.paymentMethod?.toLowerCase().includes('cash') || selectedSellerOrder.paymentMethod?.toLowerCase().includes('cod') ? (
                        <p className="text-green-600 dark:text-green-400 font-medium">
                          ক্যাশ অন ডেলিভারি অর্ডার — অগ্রিম পেমেন্ট প্রুফের প্রয়োজন নেই। পণ্য ডেলিভারির পর স্ট্যাটাস DELIVERED করে দিন।
                        </p>
                      ) : (
                        <p>এই অর্ডারের জন্য এখনও কোনো পেমেন্ট প্রুফ জমা পড়েনি।</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Items from this Seller */}
                <div>
                  <h4 className="text-[10px] tracking-wider uppercase text-muted-foreground font-semibold mb-2">
                    Your Products in this Order
                  </h4>
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {selectedSellerOrder.items?.map((item: any) => (
                      <div key={item.id} className="p-3 flex items-center justify-between text-xs bg-secondary/20">
                        <div className="flex items-center gap-3">
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productName || "Product item"} className="w-9 h-9 rounded-lg object-cover" />
                          ) : null}
                          <div>
                            <p className="font-medium text-foreground">{item.productName}</p>
                            <p className="text-[10px] text-muted-foreground">Qty: {item.quantity} × ৳{item.price}</p>
                            {(item.selectedColor || item.selectedSize) && (
                              <div className="flex items-center gap-1.5 mt-1">
                                {item.selectedColor && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background border border-border text-foreground">
                                    Color: <span className="ml-1 font-semibold">{item.selectedColor}</span>
                                  </span>
                                )}
                                {item.selectedSize && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background border border-border text-foreground">
                                    Size: <span className="ml-1 font-semibold">{item.selectedSize}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between p-3 bg-secondary/40 rounded-xl text-xs">
                    <span className="text-muted-foreground">Your Total for this Order:</span>
                    <span className="text-sm font-semibold text-green-500">৳{(selectedSellerOrder.sellerTotal || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedSellerOrder(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Coupon Create/Edit Dialog */}
        <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-medium flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                {editingCoupon ? 'কুপন এডিট করুন' : 'নতুন স্টোর কুপন তৈরি করুন'}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSellerCoupon();
              }}
              className="space-y-4 text-xs mt-2"
            >
              <div>
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">কুপন কোড (Coupon Code) *</Label>
                <Input
                  required
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER10, NOIR20"
                  className="mt-1.5 h-10 font-mono uppercase bg-secondary/50 border-border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">ডিসকাউন্টের ধরণ *</Label>
                  <select
                    value={couponForm.discountType}
                    onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value })}
                    className="mt-1.5 h-10 w-full px-2.5 bg-secondary/50 border border-border rounded-md text-xs font-medium"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                    পরিমাণ {couponForm.discountType === 'PERCENTAGE' ? '(%)' : '(৳)'} *
                  </Label>
                  <Input
                    required
                    type="number"
                    min="1"
                    step="any"
                    value={couponForm.discountValue}
                    onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    placeholder={couponForm.discountType === 'PERCENTAGE' ? '10' : '20'}
                    className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">মিনিমাম অর্ডার (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={couponForm.minOrderAmount}
                    onChange={e => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                    placeholder="e.g. 50"
                    className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">সর্বোচ্চ ব্যবহার (Uses)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={couponForm.maxUses}
                    onChange={e => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">শুরুর তারিখ</Label>
                  <Input
                    type="date"
                    value={couponForm.startDate}
                    onChange={e => setCouponForm({ ...couponForm, startDate: e.target.value })}
                    className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">মেয়াদ শেষের তারিখ</Label>
                  <Input
                    type="date"
                    value={couponForm.endDate}
                    onChange={e => setCouponForm({ ...couponForm, endDate: e.target.value })}
                    className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCouponDialogOpen(false)}
                  className="text-xs h-9"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={savingCoupon}
                  className="bg-foreground text-background text-xs h-9 px-5"
                >
                  {savingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  {editingCoupon ? 'আপডেট করুন' : 'কুপন তৈরি করুন'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── Business License Request Modal (Soft Copy / Hard Copy) ───────── */}
        <Dialog open={licenseModalOpen} onOpenChange={setLicenseModalOpen}>
          <DialogContent className="max-w-xl bg-card border-border p-6 max-h-[90vh] overflow-y-auto">
            {licenseModalView === 'SELECT' ? (
              <div>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" /> ব্যবসায়িক লাইসেন্স নির্বাচন করুন
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    আপনার স্টোরের অফিসিয়াল বৈধতা ও গ্রাহক আস্থা বৃদ্ধির জন্য ডিজিটাল সফট কপি অথবা ডাকযোগে ফিজিক্যাল হার্ড কপি লাইসেন্স গ্রহণ করুন।
                  </p>
                </DialogHeader>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  {/* Option 1: Soft Copy */}
                  <div className="p-5 rounded-xl border-2 border-border/80 hover:border-primary/60 bg-secondary/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-emerald-500" />
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-bold">
                          ফ্রি (Free)
                        </Badge>
                      </div>
                      <h4 className="text-sm font-semibold mb-1">গেট সফট কপি</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        ডিজিটাল পিডিএফ লাইসেন্স। কোনো ফি প্রদান করতে হবে না। এডমিন অনুমোদন দিলে সরাসরি ড্যাশবোর্ড থেকে দেখতে ও ডাউনলোড করতে পারবেন।
                      </p>
                    </div>

                    <Button
                      type="button"
                      disabled={requestingLicense}
                      className="w-full mt-5 bg-foreground text-background hover:opacity-90 text-xs h-10 gap-2 font-medium"
                      onClick={handleRequestSoftCopy}
                    >
                      {requestingLicense ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      গেট সফট কপি
                    </Button>
                  </div>

                  {/* Option 2: Hard Copy */}
                  <div className="p-5 rounded-xl border-2 border-primary/40 hover:border-primary bg-primary/5 transition-all flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                      প্রস্তাবিত
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Award className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-primary">
                          ৳ {licenseFee}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold mb-1">গেট হার্ড কপি</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        অফিসিয়াল সিলমোহর, ফ্রেমযোগ্য প্রিমিয়াম পেপার এবং সিক্রেট ৭-ডিজিট ভেরিফিকেশন কোড যুক্ত ফিজিক্যাল সার্টিফিকেট কুরিয়ারে পৌঁছে দেওয়া হবে।
                      </p>
                    </div>

                    <Button
                      type="button"
                      className="w-full mt-5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-10 gap-2 font-medium shadow-sm"
                      onClick={() => setLicenseModalView('HARD_PAYMENT')}
                    >
                      <CreditCard className="w-4 h-4" />
                      গেট হার্ড কপি
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Hard Copy Payment Flow */
              <form onSubmit={handleRequestHardCopy}>
                <DialogHeader className="mb-4">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" /> হার্ড কপি লাইসেন্স পেমেন্ট
                    </DialogTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-muted-foreground"
                      onClick={() => setLicenseModalView('SELECT')}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> পেছনে যান
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    হার্ড কপি লাইসেন্স ও কুরিয়ার ফি বাবদ মোট <strong className="text-primary font-bold">৳ {licenseFee}</strong> টাকা নিচে উল্লেখিত যেকোনো মাধ্যমে পরিশোধ করুন।
                  </p>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Select Payment Method */}
                  <div>
                    <Label className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2 block">
                      পেমেন্ট মেথড নির্বাচন করুন *
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                      {licensePaymentMethods.map(pm => {
                        const isSelected = selectedLicenseMethod?.id === pm.id || selectedLicenseMethod?.name === pm.name;
                        return (
                          <button
                            key={pm.id || pm.name}
                            type="button"
                            onClick={() => setSelectedLicenseMethod(pm)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-sm'
                                : 'border-border/80 bg-secondary/30 hover:border-border'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden relative">
                              {pm.icon ? (
                                <Image
                                  src={pm.icon}
                                  alt={pm.name}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                  onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate">{pm.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {pm.accountType || 'Personal'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Details of Selected Method */}
                  {selectedLicenseMethod && (
                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">পেমেন্ট মেথড:</span>
                        <span className="font-semibold">{selectedLicenseMethod.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">প্রাপক অ্যাকাউন্ট নম্বর:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">
                            {selectedLicenseMethod.accountNumber || '01XXXXXXXXX'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedLicenseMethod.accountNumber || '');
                              showToast('অ্যাকাউন্ট নম্বর কপি করা হয়েছে');
                            }}
                            className="text-muted-foreground hover:text-foreground"
                            title="কপি করুন"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">অ্যাকাউন্ট টাইপ:</span>
                        <span className="uppercase text-[11px] font-medium">{selectedLicenseMethod.accountType || 'PERSONAL'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        <span className="text-muted-foreground">পরিশোধযোগ্য টাকার পরিমাণ:</span>
                        <span className="text-sm font-bold text-primary">৳ {licenseFee}</span>
                      </div>
                      {selectedLicenseMethod.instructions && (
                        <p className="text-[11px] text-muted-foreground pt-1 italic">
                          নির্দেশনা: {selectedLicenseMethod.instructions}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Payment Proof Inputs */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                        যে নম্বর থেকে টাকা পাঠিয়েছেন (Sender Phone) *
                      </Label>
                      <Input
                        required
                        value={licenseSenderNum}
                        onChange={e => setLicenseSenderNum(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                        ট্রানজেকশন আইডি (Transaction ID / TrxID) *
                      </Label>
                      <Input
                        required
                        value={licenseTrxId}
                        onChange={e => setLicenseTrxId(e.target.value)}
                        placeholder="e.g. 9J29AK10M"
                        className="mt-1.5 h-10 bg-secondary/50 border-border text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLicenseModalOpen(false)}
                      className="text-xs h-9"
                    >
                      বাতিল
                    </Button>
                    <Button
                      type="submit"
                      disabled={requestingLicense}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-6 font-medium shadow-sm"
                    >
                      {requestingLicense ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                      অর্ডার সাবমিট করুন
                    </Button>
                  </DialogFooter>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── 7-Digit Verification Code Modal (Hard Copy Delivery Verification) ─── */}
        <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
          <DialogContent className="max-w-md bg-card border-border p-6">
            <form onSubmit={handleVerifyDeliveryCode}>
              <DialogHeader className="mb-4 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center mb-2">
                  <KeyRound className="w-6 h-6 text-blue-500" />
                </div>
                <DialogTitle className="text-base font-semibold">
                  হার্ড কপি ডেলিভারি ভেরিফিকেশন
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  আপনার প্রাপ্ত হার্ড কপি সার্টিফিকেটের সিকিউরিটি স্টিকার বা ডকুমেন্টে থাকা <strong className="text-foreground">৭ সংখ্যার কোডটি</strong> প্রবেশ করিয়ে নিশ্চিত করুন।
                </p>
              </DialogHeader>

              <div className="my-4">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground text-center block mb-2">
                  ৭ সংখ্যার সিক্রেট ভেরিফিকেশন কোড *
                </Label>
                <Input
                  required
                  maxLength={7}
                  autoFocus
                  value={verificationCodeInput}
                  onChange={e => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • • •"
                  className="h-14 text-center text-2xl font-mono tracking-[0.5em] font-bold bg-secondary/50 border-2 border-primary/40 focus:border-primary"
                />
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  সঠিক কোড সাবমিট করলে আপনার প্রোফাইল ও এডমিন প্যানেলে লাইসেন্সটি &quot;ভেরিফাইড&quot; হিসেবে চিহ্নিত হবে।
                </p>
              </div>

              <DialogFooter className="pt-2 sm:justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerifyModalOpen(false)}
                  className="text-xs h-10 px-5"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={submittingVerifyCode || verificationCodeInput.length !== 7}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 px-6 font-medium shadow-sm"
                >
                  {submittingVerifyCode ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  ভেরিফাই করুন
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
