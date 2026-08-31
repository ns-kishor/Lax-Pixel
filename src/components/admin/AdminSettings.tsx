'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminHeaders } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { User, Settings, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

const SETTINGS_KEYS = [
  { key: 'footer_description', label: 'Footer Description', type: 'textarea' as const },
  { key: 'footer_copyright', label: 'Footer Copyright', type: 'text' as const },
  { key: 'social_facebook', label: 'Facebook URL', type: 'text' as const },
  { key: 'social_instagram', label: 'Instagram URL', type: 'text' as const },
  { key: 'social_youtube', label: 'YouTube URL', type: 'text' as const },
  { key: 'social_tiktok', label: 'TikTok URL', type: 'text' as const },
  { key: 'social_whatsapp', label: 'WhatsApp Number', type: 'text' as const },
];

export function AdminSettings() {
  const { adminUser, setAdminUser, showToast } = useStore();
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load admin info from store
  useEffect(() => {
    if (adminUser) {
      setAdminName(adminUser.name);
      setAdminEmail(adminUser.email);
    }
  }, [adminUser]);

  // Fetch site settings
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data.settings || {});
      }
    } catch {
      // ignore
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingChange = (key: string, value: string) => {
    setSiteSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ settings: siteSettings }),
      });
      if (res.ok) {
        showToast('Settings saved');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showToast('Current password is required', 'error');
      return;
    }
    if (!newPassword) {
      showToast('New password is required', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          action: 'change-password',
          currentPassword,
          newPassword,
        }),
      });
      if (res.ok) {
        showToast('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to change password', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-card border border-border p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Admin Profile</h3>
        </div>

        <div className="grid gap-4 max-w-md">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Name</Label>
            <Input
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              className="h-9 bg-secondary border-border text-sm"
              disabled
            />
            <p className="text-[10px] text-muted-foreground">Name is read-only</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email</Label>
            <Input
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              className="h-9 bg-secondary border-border text-sm"
              disabled
            />
            <p className="text-[10px] text-muted-foreground">Email is read-only</p>
          </div>
        </div>

        <Separator className="my-6" />

        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">Change Password</p>
          <div className="grid gap-4 max-w-md">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-9 bg-secondary border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-9 bg-secondary border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-9 bg-secondary border-border text-sm"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="bg-foreground text-background text-xs tracking-wider h-9 gap-1.5 w-fit"
            >
              {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {changingPassword ? 'Changing…' : 'Change Password'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Site Settings Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-card border border-border p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Site Settings</h3>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={savingSettings || loadingSettings}
            className="bg-foreground text-background text-xs tracking-wider h-9 gap-1.5"
          >
            {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {savingSettings ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>

        {loadingSettings ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-4 max-w-lg">
            {SETTINGS_KEYS.map(item => (
              <div key={item.key} className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">{item.label}</Label>
                {item.type === 'textarea' ? (
                  <Textarea
                    value={siteSettings[item.key] || ''}
                    onChange={e => handleSettingChange(item.key, e.target.value)}
                    placeholder={`Enter ${item.label.toLowerCase()}`}
                    rows={3}
                    className="bg-secondary border-border text-sm resize-none"
                  />
                ) : (
                  <Input
                    value={siteSettings[item.key] || ''}
                    onChange={e => handleSettingChange(item.key, e.target.value)}
                    placeholder={`Enter ${item.label.toLowerCase()}`}
                    className="h-9 bg-secondary border-border text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
