import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Eye,
  Navigation,
  XCircle,
  CreditCard,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Booking, BookingStatus } from '../types';
import { apiFetch, formatDate, formatINR } from '../lib/api';

interface MyBookingsPageProps {
  bookings: Booking[];
  onRefresh: () => void;
  onTrackBooking: (bookingId: string) => void;
  onBookNew: () => void;
}

const CATEGORIES: { key: BookingStatus; label: string }[] = [
  { key: 'Upcoming', label: 'Upcoming Bookings' },
  { key: 'Active', label: 'Active Bookings' },
  { key: 'Completed', label: 'Completed Bookings' },
  { key: 'Cancelled', label: 'Cancelled Bookings' },
];

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({
  bookings,
  onRefresh,
  onTrackBooking,
  onBookNew,
}) => {
  const [activeTab, setActiveTab] = useState<BookingStatus>('Upcoming');
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = bookings.filter((b) => b.status === activeTab);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.bookingId);
    setFeedback(null);
    try {
      await apiFetch(`/api/bookings/${cancelTarget.bookingId}/cancel`, { method: 'POST' });
      setCancelTarget(null);
      setFeedback(`Booking ${cancelTarget.bookingId} cancelled.`);
      onRefresh();
    } catch (err: any) {
      setFeedback(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handlePayBooking = async (booking: Booking) => {
    setBusyId(booking.bookingId);
    setFeedback(null);
    try {
      const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${booking.bookingId}/pay`, {
        method: 'POST',
      });
      setDetailBooking(res.booking);
      setFeedback(`Payment settled for ${booking.bookingId}.`);
      onRefresh();
    } catch (err: any) {
      setFeedback(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const statusTone = (status: BookingStatus) => {
    switch (status) {
      case 'Active':
        return 'text-blue-400';
      case 'Completed':
        return 'text-emerald-400';
      case 'Cancelled':
        return 'text-rose-400';
      default:
        return 'text-amber-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Bookings</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage upcoming, active in-transit, completed, and cancelled relocations.
          </p>
        </div>
        <button
          type="button"
          onClick={onBookNew}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap"
        >
          + Book a New Move
        </button>
      </div>

      {/* Category Segmented Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 w-fit">
        {CATEGORIES.map((cat) => {
          const count = bookings.filter((b) => b.status === cat.key).length;
          const active = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveTab(cat.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-3">
          <p className="text-sm text-slate-300 font-medium">
            No {activeTab.toLowerCase()} bookings found under your account.
          </p>
          <button
            type="button"
            onClick={onBookNew}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Schedule a Move
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((b) => {
            const canCancel =
              b.status === 'Upcoming' || (b.status === 'Active' && b.trackingStage < 5);
            return (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400 font-mono-nums">
                        {b.bookingId} · {b.customerId}
                      </div>
                      <h3 className="text-lg font-bold text-white mt-0.5">{b.serviceType}</h3>
                    </div>
                    <span className={`text-xs font-semibold ${statusTone(b.status)}`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-medium">{b.pickupCity}</span>
                    <span className="text-slate-500">→</span>
                    <span className="font-medium">{b.destinationCity}</span>
                    <span className="text-xs text-slate-400 font-mono-nums ml-auto">
                      {b.distanceKm} km
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <div className="text-slate-400">Booking Date</div>
                      <div className="font-mono-nums text-slate-200 mt-0.5">
                        {formatDate(b.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Moving Date</div>
                      <div className="font-mono-nums text-slate-200 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {b.movingDate}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Estimated Price</div>
                      <div className="font-mono-nums font-bold text-white mt-0.5">
                        {formatINR(b.estimatedPrice)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setDetailBooking(b)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onTrackBooking(b.bookingId)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-semibold text-blue-300"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Track Booking
                  </button>
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(b)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 ml-auto"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Details Modal */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono-nums text-blue-400">
                  {detailBooking.bookingId} · Customer {detailBooking.customerId}
                </div>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  {detailBooking.serviceType} Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Pickup Address ({detailBooking.pickupCity})</div>
                <div className="text-slate-200 font-medium mt-1">{detailBooking.pickupAddress}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">
                  Destination Address ({detailBooking.destinationCity})
                </div>
                <div className="text-slate-200 font-medium mt-1">
                  {detailBooking.destinationAddress}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400">Inventory</span>
                <div className="text-white font-semibold mt-0.5">
                  {detailBooking.rooms} Rooms · {detailBooking.furnitureItems} Items ·{' '}
                  {detailBooking.packingBoxes} Boxes
                </div>
              </div>
              <div>
                <span className="text-slate-400">Packing / Lift</span>
                <div className="text-white font-semibold mt-0.5">
                  {detailBooking.packingType} · Floor {detailBooking.floorNumber} (
                  {detailBooking.hasLift ? 'Lift' : 'No Lift'})
                </div>
              </div>
              <div>
                <span className="text-slate-400">Schedule</span>
                <div className="text-white font-mono-nums font-semibold mt-0.5">
                  {detailBooking.movingDate}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Payment</span>
                <div className="text-white font-semibold mt-0.5">
                  {detailBooking.paymentStatus} ({formatINR(detailBooking.finalAmount)})
                </div>
              </div>
            </div>

            {detailBooking.furniturePhotos.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  Uploaded Furniture Photographs
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailBooking.furniturePhotos.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt={`Uploaded furniture ${idx + 1}`}
                      className="w-20 h-20 rounded-lg object-cover border border-slate-700"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800 text-xs">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-400">Transportation</span>
                <span className="font-mono-nums text-white">
                  {formatINR(detailBooking.priceBreakdown.transportation)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-400">Packing &amp; Materials</span>
                <span className="font-mono-nums text-white">
                  {formatINR(detailBooking.priceBreakdown.packing)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-400">Labour, Loading &amp; Unloading</span>
                <span className="font-mono-nums text-white">
                  {formatINR(
                    (detailBooking.priceBreakdown.labour || 0) +
                      (detailBooking.priceBreakdown.loading || 0) +
                      (detailBooking.priceBreakdown.unloading || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 font-bold text-sm text-blue-300">
                <span>Total Amount</span>
                <span className="font-mono-nums">{formatINR(detailBooking.finalAmount)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {detailBooking.paymentStatus === 'Pending' &&
                detailBooking.status !== 'Cancelled' && (
                  <button
                    type="button"
                    disabled={busyId === detailBooking.bookingId}
                    onClick={() => handlePayBooking(detailBooking)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    <CreditCard className="w-4 h-4" />
                    {busyId === detailBooking.bookingId
                      ? 'Recording Payment...'
                      : `Pay ${formatINR(detailBooking.finalAmount)} (Demo Settlement)`}
                  </button>
                )}
              <button
                type="button"
                onClick={() => {
                  const id = detailBooking.bookingId;
                  setDetailBooking(null);
                  onTrackBooking(id);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Track Live Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-lg">
              <AlertCircle className="w-5 h-5" />
              Cancel Booking {cancelTarget.bookingId}?
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will cancel your {cancelTarget.serviceType} from {cancelTarget.pickupCity} to{' '}
              {cancelTarget.destinationCity} scheduled for {cancelTarget.movingDate}.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={busyId === cancelTarget.bookingId}
                onClick={handleCancelConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
