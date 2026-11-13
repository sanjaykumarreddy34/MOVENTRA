import React from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Compass,
  History,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  ShieldCheck,
  Truck,
  UserCheck,
} from 'lucide-react';
import {
  SERVICE_DETAILS,
  TRACKING_STAGES,
  type Booking,
  type ServiceCity,
  type ServiceType,
  type User,
} from '../types';
import { ThreeDScene } from './ThreeDScene';
import { formatDate, formatINR } from '../lib/api';
import heroTruckImg from '../assets/images/hero_moventra_truck_1794551054512.jpg';

export type CustomerNavTarget =
  | 'home'
  | 'dashboard'
  | 'book'
  | 'bookings'
  | 'history'
  | 'track'
  | 'pathfinder'
  | 'services'
  | 'profile'
  | 'support';

interface CustomerHomeDashboardProps {
  mode: 'home' | 'dashboard';
  user: User;
  bookings: Booking[];
  cities: ServiceCity[];
  onNavigate: (tab: CustomerNavTarget) => void;
  onStartBooking: (prefill?: {
    serviceType?: ServiceType;
    pickupCity?: string;
    destinationCity?: string;
  }) => void;
  onTrackBooking: (bookingId: string) => void;
}

export const CustomerHomeDashboard: React.FC<CustomerHomeDashboardProps> = ({
  mode,
  user,
  bookings,
  cities,
  onNavigate,
  onStartBooking,
  onTrackBooking,
}) => {
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) => b.status === 'Active').length;
  const completedBookings = bookings.filter((b) => b.status === 'Completed').length;
  const upcomingBookings = bookings.filter((b) => b.status === 'Upcoming').length;

  const activeCitiesCount = cities.filter((c) => c.isActive).length || 20;
  const highlightedMove =
    bookings.find((b) => b.status === 'Active') ||
    bookings.find((b) => b.status === 'Upcoming') ||
    bookings[0] ||
    null;

  return (
    <div className="space-y-6">
      {/* Personalized Welcome & Customer Identity Strip */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0d1730] to-slate-950 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Verified MOVENTRA Relocation Account
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome Back, {user.fullName}!
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300 pt-1">
              <span>
                Customer ID:{' '}
                <strong className="font-mono-nums text-blue-300">{user.customerId}</strong>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                |
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono-nums">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                +91 {user.phone}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                |
              </span>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onStartBooking()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-900/30 transition-colors cursor-pointer"
            >
              Book a Move
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pathfinder')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4 text-blue-400" />
              Path Finder
            </button>
          </div>
        </div>

        {/* Customer Booking Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-800/90">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400">Total Bookings</div>
              <div className="text-2xl font-bold text-white font-mono-nums mt-1">
                {totalBookings}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono-nums">
                {upcomingBookings} upcoming scheduled
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400">Active Bookings</div>
              <div className="text-2xl font-bold text-blue-300 font-mono-nums mt-1">
                {activeBookings}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Live GPS corridor tracking
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400">Completed Bookings</div>
              <div className="text-2xl font-bold text-emerald-300 font-mono-nums mt-1">
                {completedBookings}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                GST invoices ready in history
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Home Mode Hero Showcase OR Dashboard Active Move & 3D Fleet Overview */}
      {mode === 'home' ? (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden flex flex-col">
            <div className="relative h-56 overflow-hidden">
              <img
                src={heroTruckImg}
                alt="MOVENTRA commercial moving truck parked outside Indian residences"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  Pan-India Relocation Network
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  YOUR CITY TO ANY CITY – WE MOVE IT ALL.
                </h2>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Relocate across <strong className="text-white font-mono-nums">{activeCitiesCount}</strong> active Indian metropolitan and Tier-2 logistics corridors with closed-container weatherproof trucks, master carpenters, and real-time Google Maps highway path calculation.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-blue-500/50 text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-white">India Coverage Map</div>
                  <div className="text-slate-400 mt-0.5">Explore hubs &amp; price calculator</div>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('track')}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-blue-500/50 text-left transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-white">Live 9-Stage Tracker</div>
                  <div className="text-slate-400 mt-0.5">Verify vehicle &amp; driver ETA</div>
                </button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-7 rounded-2xl border border-slate-800 bg-[#060b19] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Interactive 3D Commercial Fleet &amp; Loading Bay
                </h2>
                <p className="text-xs text-slate-400">
                  Drag to orbit 360° or switch camera angles below
                </p>
              </div>
              <span className="text-xs font-mono-nums text-blue-300">WebGL PBR Scene</span>
            </div>
            <div className="h-[370px] sm:h-[420px] w-full">
              <ThreeDScene mode="showcase" />
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Active Shipment Telemetry Card */}
          <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  {highlightedMove ? 'Latest Move Snapshot' : 'Ready for Your First Move'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {highlightedMove
                    ? 'Direct milestone progress and assigned carrier details'
                    : 'Schedule a house shifting, office move, or carpentry service in 5 steps'}
                </p>
              </div>
              {highlightedMove && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  {highlightedMove.status}
                </span>
              )}
            </div>

            {highlightedMove ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono-nums text-sm font-bold text-white">
                      {highlightedMove.bookingId}
                    </span>
                    <span className="text-xs text-slate-400">{highlightedMove.serviceType}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="font-medium">{highlightedMove.pickupCity}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="font-medium">{highlightedMove.destinationCity}</span>
                    <span className="ml-auto font-mono-nums text-xs text-slate-400">
                      {highlightedMove.distanceKm} km
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-blue-300 font-medium">
                        Stage {highlightedMove.trackingStage} of 9:{' '}
                        {TRACKING_STAGES[Math.max(0, highlightedMove.trackingStage - 1)]}
                      </span>
                      <span className="font-mono-nums text-slate-400">
                        {Math.round((highlightedMove.trackingStage / 9) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((highlightedMove.trackingStage / 9) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400 block">Moving Date</span>
                      <span className="text-slate-200 font-medium font-mono-nums">
                        {formatDate(highlightedMove.movingDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Estimated Amount</span>
                      <span className="text-slate-200 font-semibold font-mono-nums">
                        {formatINR(highlightedMove.finalAmount || highlightedMove.estimatedPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Assigned Vehicle</span>
                      <span className="text-slate-200 font-mono-nums">
                        {highlightedMove.assignedVehicle || 'Pending Dispatch'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Driver Contact</span>
                      <span className="text-slate-200 font-mono-nums">
                        {highlightedMove.driverName
                          ? `${highlightedMove.driverName}`
                          : 'Awaiting Assignment'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onTrackBooking(highlightedMove.bookingId)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Track This Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('bookings')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    View All Bookings
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center space-y-3">
                <Truck className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-sm text-slate-300">
                  No relocations scheduled yet under {user.customerId}.
                </p>
                <button
                  type="button"
                  onClick={() => onStartBooking()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Start 5-Step Smart Booking
                </button>
              </div>
            )}
          </div>

          {/* 3D Fleet Visualizer */}
          <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-[#060b19] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <span className="text-sm font-semibold text-white">
                3D Commercial Fleet Inspection
              </span>
              <span className="text-xs text-slate-400">Eicher / Tata Closed-Container</span>
            </div>
            <div className="h-[340px] w-full">
              <ThreeDScene mode="showcase" />
            </div>
          </div>
        </section>
      )}

      {/* Quick Action Command Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('bookings')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-blue-500/50 p-4 text-left transition-colors cursor-pointer group"
        >
          <Calendar className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
            My Bookings
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Upcoming, active, completed &amp; cancelled
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('history')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-blue-500/50 p-4 text-left transition-colors cursor-pointer group"
        >
          <History className="w-5 h-5 text-indigo-400 mb-2" />
          <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
            Booking History
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Filter moves &amp; download GST invoices
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('track')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-blue-500/50 p-4 text-left transition-colors cursor-pointer group"
        >
          <Navigation className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
            Track My Move
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            9-stage live truck &amp; driver milestones
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-blue-500/50 p-4 text-left transition-colors cursor-pointer group"
        >
          <UserCheck className="w-5 h-5 text-amber-400 mb-2" />
          <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
            My Profile
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Saved addresses, phone &amp; security
          </div>
        </button>
      </section>

      {/* Photorealistic Core Relocation Services */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Our Relocation &amp; Shifting Services</h2>
            <p className="text-xs text-slate-400">
              Select a specialized crew to launch the 5-step smart booking estimator
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
          >
            View India Coverage &amp; Calculator
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {SERVICE_DETAILS.map((svc) => (
            <div
              key={svc.type}
              className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden flex flex-col hover:border-blue-500/40 transition-colors"
            >
              <div className="h-40 relative overflow-hidden">
                <img
                  src={svc.image}
                  alt={svc.type}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-base font-bold text-white">{svc.type}</h3>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-300 leading-relaxed">{svc.subtitle}</p>
                  <ul className="space-y-1.5">
                    {svc.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-xs text-slate-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onStartBooking({ serviceType: svc.type })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Book {svc.type}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
