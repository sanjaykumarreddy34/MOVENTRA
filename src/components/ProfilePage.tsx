import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  KeyRound,
  LogOut,
  MapPin,
  Phone,
  Plus,
  Trash2,
  AlertCircle,
  History,
} from 'lucide-react';
import type { SavedAddress, ServiceCity, User } from '../types';
import { apiFetch, formatDate } from '../lib/api';

interface ProfilePageProps {
  user: User;
  cities: ServiceCity[];
  onUserUpdated: (user: User) => void;
  onViewHistory: () => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  cities,
  onUserUpdated,
  onViewHistory,
  onLogout,
}) => {
  const [fullName, setFullName] = useState(user.fullName);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user.profilePhoto);
  const [addresses, setAddresses] = useState<SavedAddress[]>(user.savedAddresses || []);

  // New Address Form
  const [addrLabel, setAddrLabel] = useState('');
  const [addrCity, setAddrCity] = useState(cities[0]?.cityName || 'Hyderabad');
  const [addrText, setAddrText] = useState('');

  // Change Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Phone Verification Update
  const [newPhone, setNewPhone] = useState(user.phone);
  const [otpSent, setOtpSent] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErr('Profile photograph must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setProfilePhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await apiFetch<{ user: User; message: string }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, profilePhoto, savedAddresses: addresses }),
      });
      onUserUpdated(res.user);
      setMsg(res.message);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddAddress = async () => {
    if (!addrLabel.trim() || !addrText.trim()) return;
    const next: SavedAddress[] = [
      ...addresses,
      {
        id: `addr-${Date.now()}`,
        label: addrLabel.trim(),
        city: addrCity,
        address: addrText.trim(),
      },
    ];
    setAddresses(next);
    setAddrLabel('');
    setAddrText('');
    try {
      const res = await apiFetch<{ user: User }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ savedAddresses: next }),
      });
      onUserUpdated(res.user);
      setMsg('Saved address added.');
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleRemoveAddress = async (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    setAddresses(next);
    try {
      const res = await apiFetch<{ user: User }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ savedAddresses: next }),
      });
      onUserUpdated(res.user);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/profile/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRequestOtp = async () => {
    setMsg(null);
    setErr(null);
    try {
      const res = await apiFetch<{ message: string; demoOtp: string }>('/api/profile/phone-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: newPhone }),
      });
      setOtpSent(res.demoOtp);
      setMsg(`${res.message} Demo OTP Code: ${res.demoOtp}`);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleVerifyPhone = async () => {
    setMsg(null);
    setErr(null);
    try {
      const res = await apiFetch<{ user: User; message: string }>('/api/profile/verify-phone', {
        method: 'POST',
        body: JSON.stringify({ phone: newPhone, otp: otpInput }),
      });
      onUserUpdated(res.user);
      setOtpSent(null);
      setOtpInput('');
      setMsg(res.message);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile &amp; Customer ID</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your verified MOVENTRA identity, saved addresses, and account security.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewHistory}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            <History className="w-4 h-4" />
            Booking History
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-semibold text-rose-300"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}
      {err && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Identity Summary & Profile Edit */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              {profilePhoto ? (
                <img src={profilePhoto} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-300">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
              )}
              <label className="absolute bottom-1 right-1 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
            <div>
              <div className="text-xs font-mono-nums text-blue-400 font-semibold">
                Customer ID: {user.customerId}
              </div>
              <h2 className="text-lg font-bold text-white">{user.fullName}</h2>
              <div className="text-xs text-slate-400">
                Registered {formatDate(user.createdAt)} · {user.stats?.totalBookings || 0} Total Bookings
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email Address (Verified)</label>
              <input
                type="text"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Save Profile Changes
          </button>
        </form>

        {/* Phone Verification & Password Change */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400" />
              Update Verified Mobile Number
            </h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="tel"
                maxLength={10}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
              />
              <button
                type="button"
                onClick={handleRequestOtp}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-300"
              >
                Send Verification OTP
              </button>
            </div>
            {otpSent && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-blue-500/40 text-sm font-mono-nums text-white"
                />
                <button
                  type="button"
                  onClick={handleVerifyPhone}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Verify &amp; Update
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              Change Password
            </h3>
            <input
              type="password"
              required
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="password"
                required
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <input
                type="password"
                required
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Saved Addresses Manager */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          Manage Saved Addresses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
            >
              <div>
                <div className="text-xs font-semibold text-blue-300">
                  {addr.label} · {addr.city}
                </div>
                <div className="text-xs text-slate-300 mt-1">{addr.address}</div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAddress(addr.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
          <input
            type="text"
            placeholder="Label (e.g. Parents Home)"
            value={addrLabel}
            onChange={(e) => setAddrLabel(e.target.value)}
            className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
          />
          <select
            value={addrCity}
            onChange={(e) => setAddrCity(e.target.value)}
            className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.cityName}>
                {c.cityName}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Complete Street Address & Pincode"
            value={addrText}
            onChange={(e) => setAddrText(e.target.value)}
            className="sm:col-span-4 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
          />
          <button
            type="button"
            onClick={handleAddAddress}
            className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
