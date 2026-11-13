import React, { useEffect, useState } from 'react';
import {
  Search,
  Truck,
  Phone,
  Clock,
  CheckCircle2,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { TRACKING_STAGES, type Booking } from '../types';
import { RouteMapView } from './RouteMapView';
import { apiFetch, formatDate } from '../lib/api';

interface LiveTrackingPageProps {
  bookings: Booking[];
  initialBookingId?: string | null;
  mapsApiKey: string;
}

export const LiveTrackingPage: React.FC<LiveTrackingPageProps> = ({
  bookings,
  initialBookingId,
  mapsApiKey,
}) => {
  const [searchId, setSearchId] = useState(
    initialBookingId || bookings.find((b) => b.status === 'Active')?.bookingId || bookings[0]?.bookingId || ''
  );
  const [tracked, setTracked] = useState<Booking | null>(() => {
    const targetId =
      initialBookingId || bookings.find((b) => b.status === 'Active')?.bookingId || bookings[0]?.bookingId;
    return bookings.find((b) => b.bookingId === targetId) || null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBookingId) {
      setSearchId(initialBookingId);
      handleTrack(initialBookingId);
    }
  }, [initialBookingId]);

  const handleTrack = async (idToTrack?: string) => {
    const code = (idToTrack ?? searchId).trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ booking: Booking }>(`/api/bookings/track/${encodeURIComponent(code)}`);
      setTracked(res.booking);
    } catch (err: any) {
      setError(err.message || 'Booking not found.');
      setTracked(null);
    } finally {
      setLoading(false);
    }
  };

  const progressRatio = tracked
    ? tracked.trackingStage >= 9
      ? 1
      : tracked.trackingStage <= 4
      ? 0.02
      : (tracked.trackingStage - 4) / 5
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Track My Move</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Enter your Booking ID to inspect live 9-stage relocation milestones, driver details, and route position.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="e.g. BK-2026-00001"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-nums text-white uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap"
          >
            {loading ? 'Tracking...' : 'Track Shipment'}
          </button>
        </form>
      </div>

      {/* Quick chips for user's own bookings */}
      {bookings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">Your Bookings:</span>
          {bookings.slice(0, 6).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setSearchId(b.bookingId);
                handleTrack(b.bookingId);
              }}
              className={`px-3 py-1.5 rounded-lg border font-mono-nums transition-colors ${
                tracked?.bookingId === b.bookingId
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {b.bookingId} ({b.status})
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {tracked && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 9-Stage Progress & Dispatch Details */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono-nums text-blue-400">
                    {tracked.bookingId} · {tracked.serviceType}
                  </div>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    {tracked.pickupCity} → {tracked.destinationCity}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-blue-300">
                  Stage {tracked.trackingStage}/9
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Status</span>
                  <span className="font-semibold text-white">
                    {tracked.status === 'Cancelled'
                      ? 'Cancelled'
                      : TRACKING_STAGES[tracked.trackingStage - 1]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Vehicle</span>
                  <span className="font-mono-nums text-slate-200">
                    {tracked.assignedVehicle || 'Pending Assignment'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Driver</span>
                  <span className="text-slate-200 inline-flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    {tracked.driverName || 'Awaiting Dispatch'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Driver Contact</span>
                  <span className="font-mono-nums text-slate-200 inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {tracked.driverPhone ? `+91 ${tracked.driverPhone}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estimated Arrival</span>
                  <span className="font-mono-nums text-amber-300 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {tracked.estimatedArrival || tracked.movingDate}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-slate-200">
                <div className="font-semibold text-blue-300 mb-0.5">
                  Latest Dispatch Update ({formatDate(tracked.updatedAt)})
                </div>
                <div>{tracked.lastUpdate}</div>
              </div>

              {/* 9 Milestones */}
              <div className="space-y-2 pt-1">
                {TRACKING_STAGES.map((stageLabel, idx) => {
                  const stageNum = idx + 1;
                  const completed = tracked.trackingStage >= stageNum;
                  const current = tracked.trackingStage === stageNum;
                  return (
                    <div key={stageLabel} className="flex items-center gap-3 text-xs">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                          completed
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'bg-slate-950 border-slate-700 text-slate-500'
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="font-mono-nums text-[10px]">{stageNum}</span>
                        )}
                      </div>
                      <span
                        className={
                          current
                            ? 'font-bold text-white'
                            : completed
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }
                      >
                        {stageNum}. {stageLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Live Corridor Map */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-400" />
                  Route Corridor &amp; Vehicle Position
                </span>
                <span className="text-slate-400">
                  {tracked.assignedVehicle
                    ? 'Route progress synced to latest milestone'
                    : 'Manual dispatch status active'}
                </span>
              </div>

              <RouteMapView
                apiKey={mapsApiKey}
                pickup={{
                  lat: tracked.pickupLat,
                  lng: tracked.pickupLng,
                  label: tracked.pickupCity,
                }}
                destination={{
                  lat: tracked.destinationLat,
                  lng: tracked.destinationLng,
                  label: tracked.destinationCity,
                }}
                vehicleProgress={tracked.trackingStage >= 2 ? progressRatio : undefined}
                vehicleLabel={tracked.assignedVehicle || 'MOVENTRA Truck'}
                heightClass="h-[480px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
