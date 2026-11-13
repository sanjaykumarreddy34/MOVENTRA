import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { Booking, User } from '../types';
import { formatDate, formatINR } from '../lib/api';

interface BookingHistoryPageProps {
  user: User;
  bookings: Booking[];
}

type HistoryFilter = 'all' | '30d' | '6m' | 'completed' | 'cancelled';

export const BookingHistoryPage: React.FC<BookingHistoryPageProps> = ({ user, bookings }) => {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const now = Date.now();
    return bookings.filter((b) => {
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const match =
          b.bookingId.toLowerCase().includes(q) ||
          b.serviceType.toLowerCase().includes(q) ||
          b.pickupCity.toLowerCase().includes(q) ||
          b.destinationCity.toLowerCase().includes(q);
        if (!match) return false;
      }

      const createdMs = new Date(b.createdAt).getTime();
      if (filter === '30d') return now - createdMs <= 30 * 24 * 60 * 60 * 1000;
      if (filter === '6m') return now - createdMs <= 183 * 24 * 60 * 60 * 1000;
      if (filter === 'completed') return b.status === 'Completed';
      if (filter === 'cancelled') return b.status === 'Cancelled';
      return true;
    });
  }, [bookings, filter, query]);

  const downloadInvoice = (b: Booking) => {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MOVENTRA Invoice - ${b.bookingId}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #0f172a; max-width: 760px; margin: 40px auto; padding: 24px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; }
    .brand { font-size: 26px; font-weight: 800; color: #1e3a8a; letter-spacing: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 14px; }
    .right { text-align: right; font-variant-numeric: tabular-nums; }
    .total { font-size: 18px; font-weight: 700; background: #eff6ff; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">MOVENTRA</div>
      <div>Indian Packers & Movers Logistics Pvt. Ltd.</div>
      <div>GSTIN: 36AABCM4821K1Z9</div>
    </div>
    <div class="right">
      <strong>TAX INVOICE</strong><br/>
      Invoice Ref: INV-${b.bookingId}<br/>
      Booking ID: ${b.bookingId}<br/>
      Customer ID: ${b.customerId}
    </div>
  </div>
  <p><strong>Billed To:</strong> ${user.fullName} (${user.email} · +91 ${user.phone})</p>
  <p><strong>Service:</strong> ${b.serviceType} (${b.distanceKm} km)</p>
  <p><strong>Pickup:</strong> ${b.pickupAddress}, ${b.pickupCity}</p>
  <p><strong>Destination:</strong> ${b.destinationAddress}, ${b.destinationCity}</p>
  <p><strong>Booking Date:</strong> ${formatDate(b.createdAt)} · <strong>Completed Date:</strong> ${formatDate(b.updatedAt)}</p>
  <table>
    <tr><th>Charge Component</th><th class="right">Amount (INR)</th></tr>
    <tr><td>Transportation Charges</td><td class="right">${formatINR(b.priceBreakdown.transportation)}</td></tr>
    <tr><td>Packing Materials & Wrapping</td><td class="right">${formatINR(b.priceBreakdown.packing)}</td></tr>
    <tr><td>Labour Charges</td><td class="right">${formatINR(b.priceBreakdown.labour)}</td></tr>
    <tr><td>Loading & Unloading</td><td class="right">${formatINR((b.priceBreakdown.loading || 0) + (b.priceBreakdown.unloading || 0))}</td></tr>
    <tr><td>Carpenter & Floor Access</td><td class="right">${formatINR((b.priceBreakdown.carpenter || 0) + (b.priceBreakdown.additional || 0))}</td></tr>
    <tr class="total"><td>Total Paid (${b.paymentStatus})</td><td class="right">${formatINR(b.finalAmount)}</td></tr>
  </table>
  <p style="margin-top:28px;font-size:12px;color:#64748b;">Computer-generated MOVENTRA Relocation Invoice.</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOVENTRA-Invoice-${b.bookingId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking History</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Verified relocation ledger for Customer ID{' '}
            <span className="font-mono-nums text-blue-300">{user.customerId}</span>.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Booking ID or city..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 w-fit">
        {(
          [
            ['all', 'All bookings'],
            ['30d', 'Last 30 days'],
            ['6m', 'Last 6 months'],
            ['completed', 'Completed bookings'],
            ['cancelled', 'Cancelled bookings'],
          ] as [HistoryFilter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              filter === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Booking ID</th>
                <th className="py-3.5 px-4 font-semibold">Service</th>
                <th className="py-3.5 px-4 font-semibold">Pickup → Destination</th>
                <th className="py-3.5 px-4 font-semibold">Booking Date</th>
                <th className="py-3.5 px-4 font-semibold">Completed Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Final Amount</th>
                <th className="py-3.5 px-4 font-semibold">Payment</th>
                <th className="py-3.5 px-4 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No matching records in booking history.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-mono-nums font-semibold text-blue-300 whitespace-nowrap">
                      {b.bookingId}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium whitespace-nowrap">
                      {b.serviceType}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                      <div className="truncate font-medium text-white">
                        {b.pickupCity} → {b.destinationCity}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {b.pickupAddress} → {b.destinationAddress}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-nums text-slate-300 whitespace-nowrap">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 font-mono-nums text-slate-300 whitespace-nowrap">
                      {b.status === 'Completed' ? formatDate(b.updatedAt) : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono-nums font-semibold text-white text-right whitespace-nowrap">
                      {formatINR(b.finalAmount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          b.paymentStatus === 'Paid'
                            ? 'text-emerald-400'
                            : b.paymentStatus === 'Refunded'
                            ? 'text-slate-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {b.paymentStatus} · {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {b.status === 'Completed' && b.paymentStatus === 'Paid' ? (
                        <button
                          type="button"
                          onClick={() => downloadInvoice(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Invoice
                        </button>
                      ) : (
                        <span className="text-slate-500">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
