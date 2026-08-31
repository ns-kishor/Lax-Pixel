'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, Eye, Facebook, Instagram, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

interface FooterData {
  footer_description: string;
  footer_copyright: string;
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  social_tiktok: string;
  social_whatsapp: string;
}

const defaultData: FooterData = {
  footer_description: '',
  footer_copyright: '',
  social_facebook: '',
  social_instagram: '',
  social_youtube: '',
  social_tiktok: '',
  social_whatsapp: '',
};

const SOCIAL_LINKS = [
  { key: 'social_facebook' as const, label: 'Facebook URL', placeholder: 'https://facebook.com/laxpixel' },
  { key: 'social_instagram' as const, label: 'Instagram URL', placeholder: 'https://instagram.com/laxpixel' },
  { key: 'social_youtube' as const, label: 'YouTube URL', placeholder: 'https://youtube.com/@laxpixel' },
  { key: 'social_tiktok' as const, label: 'TikTok URL', placeholder: 'https://tiktok.com/@laxpixel' },
];

export function AdminFooter() {
  const [form, setForm] = useState<FooterData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useStore();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || {};
        setForm({
          footer_description: settings.footer_description || '',
          footer_copyright: settings.footer_copyright || '',
          social_facebook: settings.social_facebook || '',
          social_instagram: settings.social_instagram || '',
          social_youtube: settings.social_youtube || '',
          social_tiktok: settings.social_tiktok || '',
          social_whatsapp: settings.social_whatsapp || '',
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ settings: form }),
      });
      if (res.ok) {
        showToast('Footer settings saved');
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

  const handleChange = (key: keyof FooterData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const activeSocials = [
    form.social_facebook && { key: 'fb', url: form.social_facebook },
    form.social_instagram && { key: 'ig', url: form.social_instagram },
    form.social_youtube && { key: 'yt', url: form.social_youtube },
    form.social_tiktok && { key: 'tt', url: form.social_tiktok },
    form.social_whatsapp && { key: 'wa', url: form.social_whatsapp },
  ].filter(Boolean) as { key: string; url: string }[];

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-card border border-border overflow-hidden"
      >
        <div className="flex items-center gap-2 px-6 pt-5 pb-3">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Live Preview</h3>
        </div>

        <div className="border-t border-border">
          <div className="bg-background px-6 py-8">
            <div className="max-w-3xl mx-auto text-center">
              {/* Logo area */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
                  <span className="text-xs font-bold">LP</span>
                </div>
                <span className="text-sm font-light tracking-[0.15em]">Lax Pixel</span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
                {form.footer_description || 'No description set'}
              </p>

              {/* Social icons */}
              {activeSocials.length > 0 && (
                <div className="flex items-center justify-center gap-3 mb-6">
                  {form.social_facebook && (
                    <a href={form.social_facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
                      <Facebook className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {form.social_instagram && (
                    <a href={form.social_instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {form.social_youtube && (
                    <a href={form.social_youtube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
                      <Youtube className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {form.social_tiktok && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                      TT
                    </div>
                  )}
                  {form.social_whatsapp && (
                    <a href={`https://wa.me/${form.social_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors text-[10px] font-bold">
                      WA
                    </a>
                  )}
                </div>
              )}

              <Separator className="my-4" />

              {/* Copyright */}
              <p className="text-[10px] text-muted-foreground">
                {form.footer_copyright || '© 2024 Lax Pixel. All rights reserved.'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-card border border-border p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Footer Settings</h3>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-foreground text-background text-xs tracking-wider h-9 gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save Footer'}
          </Button>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-5 max-w-lg">
            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Footer Description</Label>
              <Textarea
                value={form.footer_description}
                onChange={e => handleChange('footer_description', e.target.value)}
                placeholder="A brief description shown in the footer..."
                rows={3}
                className="bg-secondary border-border text-sm resize-none"
              />
            </div>

            {/* Copyright */}
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Copyright Text</Label>
              <Input
                value={form.footer_copyright}
                onChange={e => handleChange('footer_copyright', e.target.value)}
                placeholder="© 2024 Lax Pixel. All rights reserved."
                className="h-9 bg-secondary border-border text-sm"
              />
            </div>

            <Separator />

            {/* Social Links */}
            <div className="space-y-4">
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Social Links</p>
              {SOCIAL_LINKS.map(item => (
                <div key={item.key} className="space-y-1.5">
                  <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">{item.label}</Label>
                  <Input
                    value={form[item.key]}
                    onChange={e => handleChange(item.key, e.target.value)}
                    placeholder={item.placeholder}
                    className="h-9 bg-secondary border-border text-sm"
                  />
                </div>
              ))}

              {/* WhatsApp Number */}
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">WhatsApp Number</Label>
                <Input
                  value={form.social_whatsapp}
                  onChange={e => handleChange('social_whatsapp', e.target.value)}
                  placeholder="+8801234567890"
                  className="h-9 bg-secondary border-border text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
