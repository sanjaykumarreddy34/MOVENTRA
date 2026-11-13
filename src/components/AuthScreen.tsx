import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { MoventraLogo } from './MoventraLogo';
import { ThreeDScene } from './ThreeDScene';
import { apiFetch, setStoredToken } from '../lib/api';
import type { User } from '../types';
import heroTruckImg from '../assets/images/hero_moventra_truck_1794551054512.jpg';

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'admin';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password fields
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ user: User; token: string; message: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim(),
            password,
            rememberMe,
            portal: mode === 'admin' ? 'admin' : 'customer',
          }),
        }
      );
      setStoredToken(res.token, rememberMe);
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(cleanEmail)) {
      setError('Please enter a valid Gmail address ending in @gmail.com.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ user: User; token: string; message: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password,
            confirmPassword,
          }),
        }
      );
      setStoredToken(res.token, true);
      setSuccess(res.message);
      setTimeout(() => {
        onAuthenticated(res.user);
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          phone: resetPhone.replace(/\D/g, ''),
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      setSuccess(res.message);
      setTimeout(() => switchMode('login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCustomer = () => {
    switchMode('login');
    setEmail('aarav.sharma@gmail.com');
    setPassword('Moventra@2026');
  };

  const fillDemoAdmin = () => {
    switchMode('admin');
    setEmail('admin@moventra.in');
    setPassword('Admin@Moventra2026');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060b19] flex items-center justify-center p-4 sm:p-8">
      {/* Live Photorealistic 3D WebGL Truck & Apartment Scene Backdrop */}
      <div className="fixed inset-0 z-0">
        <ThreeDScene mode="background" />
        {/* Electric Blue & Purple Atmospheric Lighting Gradient Scrim */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.24), transparent 45%), radial-gradient(circle at 82% 75%, rgba(124, 58, 237, 0.22), transparent 48%), linear-gradient(120deg, rgba(6, 11, 25, 0.86) 0%, rgba(6, 11, 25, 0.56) 50%, rgba(6, 11, 25, 0.90) 100%)',
          }}
        />
      </div>

      {/* Main Split Glassmorphism Container */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Visual Showcase Column */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <MoventraLogo size="lg" showTagline />

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12] text-balance">
            Commercial Relocation Across India, Engineered with Precision.
          </h1>

          <p className="text-slate-300 text-base leading-relaxed max-w-xl">
            Verified closed-container fleet, trained packing &amp; carpentry teams, live Google Maps highway route planning, and end-to-end milestone tracking from your doorstep to your new address.
          </p>

          {/* Realistic Commercial Fleet & Residential Loading Visual Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="rounded-xl overflow-hidden border border-white/15 bg-slate-950/75 shadow-xl">
              <div className="h-32 overflow-hidden relative">
                <img
                  src={heroTruckImg}
                  alt="MOVENTRA commercial moving truck parked at Indian residential apartments"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-blue-300">20+ Indian Metro &amp; Tier-2 Hubs</div>
                <div className="text-xs text-slate-400 mt-0.5">GPS-tracked closed container fleet</div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/15 bg-slate-950/75 shadow-xl">
              <div className="h-32 overflow-hidden relative">
                <img
                  src="/assets/aistudio/Screenshot_2026-11-13_114955_c9251a10.png"
                  alt="Professional Indian packing crew loading furniture and boxes"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-indigo-300">Zero-Damage Guarantee</div>
                <div className="text-xs text-slate-400 mt-0.5">5-layer packing &amp; master carpentry</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 pt-1">
            <span className="font-mono-nums">20 Active Indian Cities</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time Route Calculation</span>
            <span aria-hidden="true">·</span>
            <span>Unique Customer ID Issuance</span>
          </div>
        </div>

        {/* Right Glassmorphism Authentication Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div
            className="w-full max-w-md rounded-2xl border border-blue-400/25 p-6 sm:p-8 shadow-[0_24px_80px_rgba(15,23,42,0.85)]"
            style={{
              backgroundColor: 'rgba(10, 17, 38, 0.84)',
              backdropFilter: 'blur(18px)',
            }}
          >
            {/* Portal Selector Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Customer Login
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => switchMode('admin')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin Login
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {(mode === 'login' || mode === 'admin') && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {mode === 'admin' ? 'Administrator Console Sign In' : 'Sign In to MOVENTRA'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {mode === 'admin'
                      ? 'Authorized operations personnel only.'
                      : 'Access your bookings, live shipment tracking, and route planner.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === 'admin' ? 'admin@moventra.in' : 'name@gmail.com'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remember me</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  <span>{loading ? 'Signing in...' : mode === 'admin' ? 'Sign In as Admin' : 'Login to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Quick Sample / Demo Access */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>Sample Demo Credentials:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fillDemoCustomer}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      Demo Customer
                    </button>
                    <button
                      type="button"
                      onClick={fillDemoAdmin}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors"
                    >
                      Demo Admin
                    </button>
                  </div>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <h2 className="text-xl font-bold text-white">Create Customer Account</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Receive your unique Customer ID (MOV-2026-XXXXX) instantly.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohan Kulkarni"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gmail Address (@gmail.com only)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Indian Mobile Number (10 Digits)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-mono-nums text-blue-300 font-semibold">
                      +91
                    </span>
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-11" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full pl-16 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm font-mono-nums text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>One account per unique Gmail and 10-digit Indian mobile number.</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Account & Generate ID'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-400" />
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verify your registered email and 10-digit Indian mobile number to set a new password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Registered 10-Digit Mobile
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm font-mono-nums text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New</label>
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:text-white"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                  >
                    {loading ? 'Updating...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
