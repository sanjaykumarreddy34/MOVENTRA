import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Search,
  Truck,
  Users,
  IndianRupee,
  MapPin,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  TRACKING_STAGES,
  type Booking,
  type Driver,
  type PricingRule,
  type ServiceCity,
  type SupportTicket,
  type User,
} from '../types';
import { apiFetch, formatDate, formatINR } from '../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type AdminTab = 'analytics' | 'bookings' | 'customers' | 'drivers' | 'pricing' | 'cities' | 'tickets';

export const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('analytics');
  const [overview, setOverview] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pricing, setPricing] = useState<PricingRule[]>([]);
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const [bookingSearch, setBookingSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editStage, setEditStage] = useState(1);
  const [editVehicle, setEditVehicle] = useState('');
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editPayment, setEditPayment] = useState<'Pending' | 'Paid' | 'Refunded'>('Pending');
  const [editFinalAmount, setEditFinalAmount] = useState(0);
  const [editLastUpdate, setEditLastUpdate] = useState('');

  // New driver form
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [drvVehicleNo, setDrvVehicleNo] = useState('');
  const [drvType, setDrvType] = useState('Eicher Pro 2095XL Closed Container');
  const [drvCap, setDrvCap] = useState(7.5);

  const [toast, setToast] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [ov, bk, cu, dr, pr, ct, tk] = await Promise.all([
        apiFetch('/api/admin/overview'),
        apiFetch<{ bookings: Booking[] }>('/api/admin/bookings'),
        apiFetch<{ customers: User[] }>('/api/admin/customers'),
        apiFetch<{ drivers: Driver[] }>('/api/admin/drivers'),
        apiFetch<{ rules: PricingRule[] }>('/api/pricing'),
        apiFetch<{ cities: ServiceCity[] }>('/api/cities'),
        apiFetch<{ tickets: SupportTicket[] }>('/api/admin/tickets'),
      ]);
      setOverview(ov);
      setBookings(bk.bookings);
      setCustomers(cu.customers);
      setDrivers(dr.drivers);
      setPricing(pr.rules);
      setCities(ct.cities);
      setTickets(tk.tickets);
    } catch {
      // handled cleanly
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openManageBooking = (b: Booking) => {
    setSelectedBooking(b);
    setEditStage(b.trackingStage);
    setEditVehicle(b.assignedVehicle || '');
    setEditDriverName(b.driverName || '');
    setEditDriverPhone(b.driverPhone || '');
    setEditPayment(b.paymentStatus);
    setEditFinalAmount(b.finalAmount);
    setEditLastUpdate(b.lastUpdate);
  };

  const handleSaveBookingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    await apiFetch(`/api/admin/bookings/${selectedBooking.bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        trackingStage: editStage,
        assignedVehicle: editVehicle || null,
        driverName: editDriverName || null,
        driverPhone: editDriverPhone || null,
        paymentStatus: editPayment,
        finalAmount: editFinalAmount,
        lastUpdate: editLastUpdate,
      }),
    });
    setToast(`Updated ${selectedBooking.bookingId} successfully.`);
    setSelectedBooking(null);
    loadAll();
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/drivers', {
      method: 'POST',
      body: JSON.stringify({
        name: drvName,
        phone: drvPhone,
        vehicleNumber: drvVehicleNo,
        vehicleType: drvType,
        capacityTons: drvCap,
      }),
    });
    setDrvName('');
    setDrvPhone('');
    setDrvVehicleNo('');
    setToast('New driver & vehicle added to fleet.');
    loadAll();
  };

  const handleSavePricing = async (rule: PricingRule) => {
    await apiFetch(`/api/admin/pricing/${encodeURIComponent(rule.serviceType)}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
    setToast(`Pricing updated for ${rule.serviceType}.`);
    loadAll();
  };

  const handleToggleCity = async (c: ServiceCity, field: 'pickupAvailable' | 'destinationAvailable' | 'isActive') => {
    await apiFetch(`/api/admin/cities/${c.id}`, {
      method: 'PUT',
      body: JSON.stringify({ [field]: !c[field] }),
    });
    setToast(`Updated service coverage for ${c.cityName}.`);
    loadAll();
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
    },
  };

  const filteredBookings = bookings.filter(
    (b) =>
      !bookingSearch.trim() ||
      b.bookingId.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.customerId.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.pickupCity.toLowerCase().includes(bookingSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      !customerSearch.trim() ||
      c.customerId.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">MOVENTRA Operations &amp; Admin Console</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time fleet dispatch, revenue accounting from recorded payments, tariff pricing, and India hub controls.
          </p>
        </div>
      </div>

      {/* Clear Sample vs Live Revenue Transparency Notice */}
      {overview && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Revenue is computed strictly from Paid bookings: Live Customer Revenue{' '}
            <strong className="font-mono-nums text-white">
              {formatINR(overview.kpis.liveRevenue)}
            </strong>{' '}
            + Clearly Labelled Sample Demonstration Data{' '}
            <strong className="font-mono-nums text-amber-300">
              {formatINR(overview.kpis.sampleRevenue)}
            </strong>
            .
          </span>
        </div>
      )}

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-emerald-300 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
        {(
          [
            ['analytics', 'Overview & Charts'],
            ['bookings', 'Bookings & Dispatch'],
            ['customers', 'Customers'],
            ['drivers', 'Drivers & Fleet'],
            ['pricing', 'Service Pricing'],
            ['cities', 'Service Locations'],
            ['tickets', 'Support Tickets'],
          ] as [AdminTab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === k ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: ANALYTICS & CHART.JS CHARTS */}
      {tab === 'analytics' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              ['Total Revenue (Paid)', formatINR(overview.kpis.totalRevenue), IndianRupee],
              ['Total Bookings', overview.kpis.totalBookings, Truck],
              ['Total Customers', overview.kpis.totalCustomers, Users],
              ['Active Moves', overview.kpis.activeBookings, Truck],
              ['Completed', overview.kpis.completedBookings, CheckCircle2],
              ['Cancelled', overview.kpis.cancelledBookings, Settings],
              ['Cities Served', overview.kpis.citiesServed, MapPin],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <div className="text-[11px] text-slate-400">{label}</div>
                <div className="text-xl font-bold font-mono-nums text-white mt-1">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-sm font-bold text-white mb-4">Monthly Revenue (INR)</h3>
              <div className="h-64">
                <Bar
                  options={chartOptions}
                  data={{
                    labels: overview.charts.monthlyRevenue.map((d: any) => d.label),
                    datasets: [
                      {
                        label: 'Paid Revenue (₹)',
                        data: overview.charts.monthlyRevenue.map((d: any) => d.value),
                        backgroundColor: 'rgba(59, 130, 246, 0.75)',
                        borderRadius: 6,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-sm font-bold text-white mb-4">Weekly Bookings Volume</h3>
              <div className="h-64">
                <Bar
                  options={chartOptions}
                  data={{
                    labels: overview.charts.weeklyBookings.map((d: any) => d.label),
                    datasets: [
                      {
                        label: 'Bookings',
                        data: overview.charts.weeklyBookings.map((d: any) => d.value),
                        backgroundColor: 'rgba(99, 102, 241, 0.75)',
                        borderRadius: 6,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-sm font-bold text-white mb-4">Popular Relocation Services</h3>
              <div className="h-64 flex items-center justify-center">
                <Doughnut
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { color: '#cbd5e1' } } },
                  }}
                  data={{
                    labels: overview.charts.popularServices.map((d: any) => d.label),
                    datasets: [
                      {
                        data: overview.charts.popularServices.map((d: any) => d.value),
                        backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'],
                        borderWidth: 0,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-sm font-bold text-white mb-4">City-Wise Bookings</h3>
              <div className="h-64">
                <Bar
                  options={{ ...chartOptions, indexAxis: 'y' as const }}
                  data={{
                    labels: overview.charts.cityBookings.map((d: any) => d.label),
                    datasets: [
                      {
                        label: 'Bookings by Origin City',
                        data: overview.charts.cityBookings.map((d: any) => d.value),
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderRadius: 6,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-sm font-bold text-white mb-4">Cumulative Revenue Growth</h3>
              <div className="h-64">
                <Line
                  options={chartOptions}
                  data={{
                    labels: overview.charts.monthlyRevenue.map((d: any) => d.label),
                    datasets: [
                      {
                        label: 'Cumulative Paid Revenue (₹)',
                        fill: true,
                        tension: 0.35,
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        data: overview.charts.monthlyRevenue.reduce((acc: number[], cur: any) => {
                          const prev = acc.length ? acc[acc.length - 1] : 0;
                          acc.push(prev + cur.value);
                          return acc;
                        }, []),
                      },
                    ],
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS & DISPATCH */}
      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              placeholder="Search Booking ID, Customer ID, or City..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Route &amp; Service</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Vehicle / Driver</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono-nums font-semibold text-blue-300 whitespace-nowrap">
                      {b.bookingId}
                      {b.isSample && (
                        <span className="ml-2 text-[10px] text-amber-300">(Sample)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{b.customerName}</div>
                      <div className="text-slate-400 font-mono-nums">{b.customerId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">{b.serviceType}</div>
                      <div className="text-slate-400">
                        {b.pickupCity} → {b.destinationCity}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-semibold">{b.status}</div>
                      <div className="text-slate-400">
                        {b.trackingStage}/9 · {TRACKING_STAGES[b.trackingStage - 1]}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {b.assignedVehicle || 'Unassigned'}
                      {b.driverName ? ` · ${b.driverName}` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono-nums">
                      <div className="text-white font-semibold">{formatINR(b.finalAmount)}</div>
                      <div className="text-slate-400">{b.paymentStatus}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openManageBooking(b)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      >
                        Dispatch / Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMERS */}
      {tab === 'customers' && (
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search Customer ID (MOV-2026-...) or Name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Customer ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Gmail</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-mono-nums text-blue-300 font-semibold">
                      {c.customerId}
                      {c.isSample && (
                        <span className="ml-2 text-[10px] text-amber-300">(Sample)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">{c.fullName}</td>
                    <td className="py-3 px-4 text-slate-300">{c.email}</td>
                    <td className="py-3 px-4 font-mono-nums text-slate-300">+91 {c.phone}</td>
                    <td className="py-3 px-4 font-mono-nums text-slate-400">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono-nums text-white text-right">
                      {c.stats?.totalBookings || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DRIVERS & FLEET */}
      {tab === 'drivers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddDriver}
            className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold text-white">Register New Fleet Driver</h3>
            <input
              type="text"
              required
              placeholder="Driver Full Name"
              value={drvName}
              onChange={(e) => setDrvName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
            <input
              type="tel"
              required
              placeholder="10-Digit Mobile"
              value={drvPhone}
              onChange={(e) => setDrvPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-nums text-white"
            />
            <input
              type="text"
              required
              placeholder="Vehicle No. (e.g. MH-12-AB-1234)"
              value={drvVehicleNo}
              onChange={(e) => setDrvVehicleNo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-nums text-white uppercase"
            />
            <input
              type="text"
              required
              placeholder="Truck Model"
              value={drvType}
              onChange={(e) => setDrvType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
            <input
              type="number"
              step="0.5"
              value={drvCap}
              onChange={(e) => setDrvCap(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-nums text-white"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Driver &amp; Vehicle
            </button>
          </form>

          <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/80 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Vehicle Number</th>
                  <th className="py-3 px-4">Truck Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 px-4">
                      <div className="text-white font-semibold">{d.name}</div>
                      <div className="text-slate-400 font-mono-nums">+91 {d.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono-nums text-blue-300">{d.vehicleNumber}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {d.vehicleType} ({d.capacityTons}T)
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{d.status}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/drivers/${d.id}`, { method: 'DELETE' });
                          loadAll();
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SERVICE PRICING RULES */}
      {tab === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pricing.map((rule) => (
            <div
              key={rule.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{rule.serviceType}</h3>
                <button
                  type="button"
                  onClick={() => handleSavePricing(rule)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
                >
                  Save Rules
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {(
                  [
                    ['Base Charge (₹)', 'baseCharge'],
                    ['Per KM Rate (₹)', 'perKmRate'],
                    ['Per Room (₹)', 'perRoomCharge'],
                    ['Packing Std (₹)', 'packingStandard'],
                    ['Packing Prem (₹)', 'packingPremium'],
                    ['Carpenter (₹)', 'carpenterCharge'],
                  ] as [string, keyof PricingRule][]
                ).map(([lbl, key]) => (
                  <div key={key}>
                    <label className="block text-slate-400 mb-1">{lbl}</label>
                    <input
                      type="number"
                      value={Number(rule[key])}
                      onChange={(e) =>
                        setPricing((prev) =>
                          prev.map((p) =>
                            p.id === rule.id ? { ...p, [key]: Number(e.target.value) } : p
                          )
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono-nums text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: SERVICE LOCATIONS */}
      {tab === 'cities' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Hub Address</th>
                <th className="py-3 px-4">Pickup</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">City Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {cities.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-semibold text-white">
                    {c.cityName} ({c.state})
                  </td>
                  <td className="py-3 px-4 text-slate-400">{c.hubAddress}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleCity(c, 'pickupAvailable')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        c.pickupAvailable
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.pickupAvailable ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleCity(c, 'destinationAvailable')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        c.destinationAvailable
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.destinationAvailable ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleCity(c, 'isActive')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        c.isActive
                          ? 'bg-blue-600/25 text-blue-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {c.isActive ? 'Operating' : 'Suspended'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: SUPPORT TICKETS */}
      {tab === 'tickets' && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/80 text-center text-xs text-slate-400">
              No customer support tickets filed yet.
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-white text-sm">
                    {t.subject} ({t.customerId})
                  </div>
                  <div className="text-slate-300">{t.message}</div>
                  <div className="text-slate-400">
                    {t.category} · {t.status} · {formatDate(t.createdAt)}
                  </div>
                </div>
                {t.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/tickets/${t.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                          status: 'Resolved',
                          adminReply: 'Resolved by MOVENTRA Support Desk.',
                        }),
                      });
                      loadAll();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Dispatch & Update Booking */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBookingUpdate}
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">
              Dispatch &amp; Status Update · {selectedBooking.bookingId}
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Assign From Fleet Drivers</label>
              <select
                onChange={(e) => {
                  const drv = drivers.find((d) => d.id === e.target.value);
                  if (drv) {
                    setEditVehicle(`${drv.vehicleNumber} (${drv.vehicleType})`);
                    setEditDriverName(drv.name);
                    setEditDriverPhone(drv.phone);
                  }
                }}
                defaultValue=""
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="">Select a registered driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.vehicleNumber} ({d.vehicleType})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tracking Milestone (1-9)</label>
                <select
                  value={editStage}
                  onChange={(e) => setEditStage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {TRACKING_STAGES.map((lbl, idx) => (
                    <option key={lbl} value={idx + 1}>
                      {idx + 1}. {lbl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment Status</label>
                <select
                  value={editPayment}
                  onChange={(e) => setEditPayment(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assigned Vehicle</label>
                <input
                  type="text"
                  value={editVehicle}
                  onChange={(e) => setEditVehicle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Final Amount (INR)</label>
                <input
                  type="number"
                  value={editFinalAmount}
                  onChange={(e) => setEditFinalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-nums text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Live Dispatch Update Note (Notifies Customer)
              </label>
              <input
                type="text"
                value={editLastUpdate}
                onChange={(e) => setEditLastUpdate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Save &amp; Notify Customer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
