import React, { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  Bell,
  CalendarClock,
  CheckCheck,
  Compass,
  HeadphonesIcon,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Navigation,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { MoventraLogo } from './components/MoventraLogo';
import { AuthScreen } from './components/AuthScreen';
import { CustomerHomeDashboard } from './components/CustomerHomeDashboard';
import { BookingWizard } from './components/BookingWizard';
import { MyBookingsPage } from './components/MyBookingsPage';
import { BookingHistoryPage } from './components/BookingHistoryPage';
import { LiveTrackingPage } from './components/LiveTrackingPage';
import { PathFinderPage } from './components/PathFinderPage';
import { ServicesAndCoveragePage } from './components/ServicesAndCoveragePage';
import { ProfilePage } from './components/ProfilePage';
import { SupportAndNotificationsPage } from './components/SupportAndNotificationsPage';
import { AdminDashboard } from './components/AdminDashboard';
import { apiFetch, clearStoredToken, formatDate } from './lib/api';
import type {
  AppNotification,
  Booking,
  ServiceCity,
  ServiceType,
  User,
} from './types';

type ActiveView =
  | 'home'
  | 'dashboard'
  | 'book'
  | 'bookings'
  | 'history'
  | 'track'
  | 'pathfinder'
  | 'services'
  | 'profile'
  | 'support'
  | 'admin';

const NAV_LABELS: Record<ActiveView, string> = {
  home: 'Home',
  dashboard: 'My Dashboard',
  book: 'Book a Move',
  bookings: 'My Bookings',
  history: 'Booking History',
  track: 'Track My Move',
  pathfinder: 'Path Finder',
  services: 'Our Services',
  profile: 'My Profile',
  support: 'Contact Support',
  admin: 'Admin Dashboard',
};

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const [bookingPrefill, setBookingPrefill] = useState<{
    serviceType?: ServiceType;
    pickupCity?: string;
    destinationCity?: string;
  } | null>(null);
  const [trackingTargetId, setTrackingTargetId] = useState<string | null>(null);

  // Google Maps API key resolution & Tier 1/2 quota fallback listener
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    if (!mapsApiKey) {
      apiFetch<{ apiKey: string }>('/api/config/maps')
        .then((res) => {
          if (res.apiKey) setMapsApiKey(res.apiKey);
        })
        .catch(() => {});
    }
  }, [mapsApiKey]);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [citiesRes, bookingsRes, notifRes] = await Promise.all([
        apiFetch<{ cities: ServiceCity[] }>('/api/cities'),
        apiFetch<{ bookings: Booking[] }>('/api/bookings'),
        apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),
      ]);
      setCities(citiesRes.cities || []);
      setBookings(bookingsRes.bookings || []);
      setNotifications(notifRes.notifications || []);
    } catch {
      // Errors handled silently if user is mid-logout
    }
  }, []);

  useEffect(() => {
    apiFetch<{ user: User }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        setActiveView(res.user.role === 'admin' ? 'admin' : 'home');
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
      loadWorkspaceData();
    }
  }, [user, loadWorkspaceData]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAuthenticated = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveView(loggedInUser.role === 'admin' ? 'admin' : 'home');
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network hiccups during logout
    }
    clearStoredToken();
    setUser(null);
    setBookings([]);
    setNotifications([]);
    setNotifOpen(false);
    setMobileMenuOpen(false);
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    apiFetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    apiFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
  };

  const handleStartBooking = (prefill?: {
    serviceType?: ServiceType;
    pickupCity?: string;
    destinationCity?: string;
  }) => {
    setBookingPrefill(prefill || null);
    setActiveView('book');
    setMobileMenuOpen(false);
  };

  const handleTrackBooking = (bookingId: string) => {
    setTrackingTargetId(bookingId);
    setActiveView('track');
    setMobileMenuOpen(false);
  };

  const navigateTo = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const quotaBanner = quotaExceeded ? (
    <div
      role="alert"
      className="sticky top-0 z-[100] w-full bg-amber-950/95 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-100 flex items-center justify-center gap-2 text-center"
    >
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-300 hover:text-white"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#060b19] text-slate-100 flex flex-col">
        {quotaBanner}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <MoventraLogo size="lg" showTagline />
          <div className="text-xs text-slate-400 tracking-wide">
            Initializing MOVENTRA Relocation Platform...
          </div>
        </div>
      </div>
    );
  }

  // Strictly show ONLY Login & Registration screen before authentication
  if (!user) {
    return (
      <>
        {quotaBanner}
        <AuthScreen onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4 shrink-0" /> },
    { id: 'dashboard', label: 'My Dashboard', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'book', label: 'Book a Move', icon: <PlusCircle className="w-4 h-4 shrink-0" /> },
    { id: 'bookings', label: 'My Bookings', icon: <CalendarClock className="w-4 h-4 shrink-0" /> },
    { id: 'history', label: 'Booking History', icon: <History className="w-4 h-4 shrink-0" /> },
    { id: 'track', label: 'Track My Move', icon: <Navigation className="w-4 h-4 shrink-0" /> },
    { id: 'pathfinder', label: 'Path Finder', icon: <Compass className="w-4 h-4 shrink-0" /> },
    { id: 'services', label: 'Our Services', icon: <MapIcon className="w-4 h-4 shrink-0" /> },
    { id: 'profile', label: 'My Profile', icon: <UserIcon className="w-4 h-4 shrink-0" /> },
    { id: 'support', label: 'Contact Support', icon: <HeadphonesIcon className="w-4 h-4 shrink-0" /> },
    ...(user.role === 'admin'
      ? [{ id: 'admin' as ActiveView, label: 'Admin Console', icon: <ShieldCheck className="w-4 h-4 shrink-0" /> }]
      : []),
  ];

  const mainContent = (
    <div className="min-h-screen bg-[#060b19] text-slate-100 flex flex-col">
      {quotaBanner}

      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/90 bg-slate-950/95 z-30">
          <div className="h-16 px-5 border-b border-slate-800/90 flex items-center">
            <MoventraLogo size="sm" />
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/35'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-800/90 space-y-2.5">
            <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-xs font-semibold text-white truncate">{user.fullName}</div>
              <div className="text-[11px] font-mono-nums text-blue-300 mt-0.5">
                {user.customerId}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 flex flex-col h-full z-10">
              <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
                <MoventraLogo size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const active = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap ${
                        active
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/35'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Workspace Column */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          {/* Top Utility Header */}
          <header className="sticky top-0 z-20 h-16 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="lg:hidden">
                <MoventraLogo size="sm" />
              </div>
              <h2 className="hidden lg:block text-base font-bold text-white truncate">
                {NAV_LABELS[activeView]}
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {activeView !== 'book' && (
                <button
                  type="button"
                  onClick={() => handleStartBooking()}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Book a Move
                </button>
              )}

              {/* Notification Centre Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  className="relative p-2 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold font-mono-nums flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            className={`w-full text-left p-3.5 hover:bg-slate-900/80 transition-colors cursor-pointer ${
                              !n.isRead ? 'bg-blue-950/20' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-white">{n.title}</span>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-slate-500 mt-1.5 block font-mono-nums">
                              {formatDate(n.createdAt)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Quick Trigger */}
              <button
                type="button"
                onClick={() => navigateTo('profile')}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-colors cursor-pointer"
              >
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.fullName}
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/25 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left leading-tight">
                  <div className="text-xs font-semibold text-white whitespace-nowrap">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] font-mono-nums text-slate-400 whitespace-nowrap">
                    {user.customerId}
                  </div>
                </div>
              </button>
            </div>
          </header>

          {/* Main View Canvas */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {(activeView === 'home' || activeView === 'dashboard') && (
              <CustomerHomeDashboard
                mode={activeView}
                user={user}
                bookings={bookings}
                cities={cities}
                onNavigate={(target) => navigateTo(target)}
                onStartBooking={handleStartBooking}
                onTrackBooking={handleTrackBooking}
              />
            )}

            {activeView === 'book' && (
              <BookingWizard
                user={user}
                cities={cities}
                mapsApiKey={mapsApiKey}
                initialPrefill={bookingPrefill}
                onBookingCreated={() => {
                  loadWorkspaceData();
                }}
                onNavigateToBookings={() => navigateTo('bookings')}
                onNavigateToTrack={(bookingId) => handleTrackBooking(bookingId)}
              />
            )}

            {activeView === 'bookings' && (
              <MyBookingsPage
                bookings={bookings}
                onRefresh={loadWorkspaceData}
                onTrackBooking={handleTrackBooking}
                onBookNew={() => handleStartBooking()}
              />
            )}

            {activeView === 'history' && (
              <BookingHistoryPage user={user} bookings={bookings} />
            )}

            {activeView === 'track' && (
              <LiveTrackingPage
                bookings={bookings}
                initialBookingId={trackingTargetId}
                mapsApiKey={mapsApiKey}
              />
            )}

            {activeView === 'pathfinder' && (
              <PathFinderPage
                cities={cities}
                mapsApiKey={mapsApiKey}
                onUseRouteForBooking={(pickupCity, destinationCity) =>
                  handleStartBooking({ pickupCity, destinationCity })
                }
              />
            )}

            {activeView === 'services' && (
              <ServicesAndCoveragePage
                cities={cities}
                mapsApiKey={mapsApiKey}
                onStartBooking={(prefill) => handleStartBooking(prefill)}
              />
            )}

            {activeView === 'profile' && (
              <ProfilePage
                user={user}
                cities={cities}
                onUserUpdated={(updated) => setUser(updated)}
                onViewHistory={() => navigateTo('history')}
                onLogout={handleLogout}
              />
            )}

            {activeView === 'support' && (
              <SupportAndNotificationsPage bookings={bookings} />
            )}

            {activeView === 'admin' && user.role === 'admin' && <AdminDashboard />}
          </main>
        </div>
      </div>
    </div>
  );

  // Wrap authenticated workspace in APIProvider only when an API key is resolved
  return mapsApiKey ? (
    <APIProvider apiKey={mapsApiKey} language="en" region="IN">
      {mainContent}
    </APIProvider>
  ) : (
    mainContent
  );
}
