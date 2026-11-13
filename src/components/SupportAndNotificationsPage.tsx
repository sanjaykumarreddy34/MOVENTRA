import React, { useEffect, useState } from 'react';
import { Phone, Mail, HelpCircle, Send, CheckCircle2, ChevronDown } from 'lucide-react';
import type { Booking, SupportTicket } from '../types';
import { apiFetch, formatDate } from '../lib/api';

interface SupportAndNotificationsPageProps {
  bookings: Booking[];
}

const FAQS = [
  {
    q: 'How is my MOVENTRA moving quote calculated?',
    a: 'Quotes are computed dynamically from real road distance between pickup and destination, room/item/box volume, packing protection tier (2-layer Standard vs 5-layer Premium), carpentry requirements, and floor lift access.',
  },
  {
    q: 'Can I cancel or reschedule an upcoming booking?',
    a: 'Yes. Upcoming bookings and active bookings prior to vehicle dispatch can be cancelled directly from the My Bookings dashboard with full refund tracking.',
  },
  {
    q: 'Are closed container trucks equipped with GPS tracking?',
    a: 'Yes. All MOVENTRA closed-body Eicher, Tata, BharatBenz, and Ashok Leyland trucks share milestone dispatches across 9 verified stages visible in Track My Move.',
  },
  {
    q: 'How do I download a GST Tax Invoice?',
    a: 'Once a booking reaches Completed status and payment is recorded as Paid, open Booking History and click Download Invoice on that row.',
  },
];

export const SupportAndNotificationsPage: React.FC<SupportAndNotificationsPageProps> = ({
  bookings,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Booking & Scheduling');
  const [bookingId, setBookingId] = useState('');
  const [message, setMessage] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = () => {
    apiFetch<{ tickets: SupportTicket[] }>('/api/support')
      .then((res) => setTickets(res.tickets))
      .catch(() => {});
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/support', {
        method: 'POST',
        body: JSON.stringify({ subject, category, bookingId: bookingId || null, message }),
      });
      setSuccess(res.message);
      setSubject('');
      setMessage('');
      loadTickets();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Contact Support &amp; Help Desk</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Reach MOVENTRA relocation specialists 24×7 for booking assistance, claim resolution, or route changes.
        </p>
      </div>

      {/* Phone & Email Support Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">24×7 Toll-Free Relocation Desk</div>
            <div className="text-lg font-bold font-mono-nums text-white mt-0.5">
              1800-120-6683 (MOVE)
            </div>
            <div className="text-xs text-slate-400">Pan-India Dispatch &amp; Emergency Transit Support</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Official Customer Care Email</div>
            <div className="text-lg font-bold text-white mt-0.5">support@moventra.in</div>
            <div className="text-xs text-slate-400">Average ticket response time: under 2 hours</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Support Ticket Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-white">Submit a Support Request</h2>

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                <option>Booking &amp; Scheduling</option>
                <option>Live Transit &amp; Driver</option>
                <option>Billing &amp; Invoice</option>
                <option>Packing &amp; Carpentry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Related Booking ID (Optional)
              </label>
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                <option value="">General Inquiry</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.bookingId}>
                    {b.bookingId} ({b.pickupCity} → {b.destinationCity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your request"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Message</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe how our team can help..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Support Request'}
          </button>
        </form>

        {/* FAQ & Submitted Tickets */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-slate-800">
              {FAQS.map((item, idx) => (
                <div key={idx} className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between text-left text-sm font-semibold text-white"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        openFaq === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{item.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
            <h3 className="text-sm font-bold text-white">Your Recent Support Requests</h3>
            {tickets.length === 0 ? (
              <p className="text-xs text-slate-400">No support requests submitted yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{t.subject}</span>
                      <span className="text-blue-300 font-semibold">{t.status}</span>
                    </div>
                    <div className="text-slate-400">
                      {t.category} {t.bookingId ? `· ${t.bookingId}` : ''} ·{' '}
                      {formatDate(t.createdAt)}
                    </div>
                    {t.adminReply && (
                      <div className="pt-1 text-emerald-300">Reply: {t.adminReply}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
