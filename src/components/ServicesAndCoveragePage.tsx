import React, { useEffect, useState } from 'react';
import { Calculator, MapPin, Truck, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  SERVICE_DETAILS,
  type PriceBreakdown,
  type ServiceCity,
  type ServiceType,
} from '../types';
import { IndiaCoverageMap } from './IndiaCoverageMap';
import { apiFetch, estimateRoadDistanceKm, formatINR } from '../lib/api';

interface ServicesAndCoveragePageProps {
  cities: ServiceCity[];
  mapsApiKey: string;
  onStartBooking: (prefill: {
    serviceType: ServiceType;
    pickupCity: string;
    destinationCity: string;
  }) => void;
}

export const ServicesAndCoveragePage: React.FC<ServicesAndCoveragePageProps> = ({
  cities,
  mapsApiKey,
  onStartBooking,
}) => {
  const activeCities = cities.filter((c) => c.isActive);
  const [selectedCity, setSelectedCity] = useState<ServiceCity | null>(
    activeCities[0] || null
  );

  // Live Price Calculator State
  const [calcService, setCalcService] = useState<ServiceType>('House Shifting');
  const [calcPickup, setCalcPickup] = useState('Hyderabad');
  const [calcDest, setCalcDest] = useState('Bangalore');
  const [calcRooms, setCalcRooms] = useState(2);
  const [calcItems, setCalcItems] = useState(10);
  const [calcBoxes, setCalcBoxes] = useState(15);
  const [calcPacking, setCalcPacking] = useState<'Standard' | 'Premium'>('Premium');
  const [calcLoading, setCalcLoading] = useState(true);
  const [calcResult, setCalcResult] = useState<{
    distanceKm: number;
    durationText: string;
    breakdown: PriceBreakdown;
  } | null>(null);

  useEffect(() => {
    const p = cities.find((c) => c.cityName === calcPickup);
    const d = cities.find((c) => c.cityName === calcDest);
    if (!p || !d) return;
    const est = estimateRoadDistanceKm(p.lat, p.lng, d.lat, d.lng);

    apiFetch<{ breakdown: PriceBreakdown }>('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({
        serviceType: calcService,
        distanceKm: est.distanceKm,
        rooms: calcRooms,
        furnitureItems: calcItems,
        packingBoxes: calcBoxes,
        floorNumber: 2,
        hasLift: true,
        packingType: calcPacking,
        loadingRequired: calcLoading,
        carpenterRequired: calcService === 'Carpenter Services',
      }),
    })
      .then((res) => {
        setCalcResult({
          distanceKm: est.distanceKm,
          durationText: est.durationText,
          breakdown: res.breakdown,
        });
      })
      .catch(() => {});
  }, [calcService, calcPickup, calcDest, calcRooms, calcItems, calcBoxes, calcPacking, calcLoading, cities]);

  return (
    <div className="space-y-10">
      {/* Services Photorealistic Catalog */}
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Our Commercial Relocation Services
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Photorealistic fleet operations, trained packing &amp; carpentry specialists, and dedicated move coordinators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SERVICE_DETAILS.map((srv) => (
            <div
              key={srv.type}
              className="rounded-2xl border border-slate-800 bg-slate-900/75 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-52 relative overflow-hidden">
                  <img
                    src={srv.image}
                    alt={srv.type}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  <h2 className="absolute bottom-3 left-5 text-xl font-bold text-white">
                    {srv.type}
                  </h2>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-sm text-slate-300">{srv.subtitle}</p>
                  <ul className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    {srv.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() =>
                    onStartBooking({
                      serviceType: srv.type,
                      pickupCity: calcPickup,
                      destinationCity: calcDest,
                    })
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <span>Book {srv.type}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* India Service Coverage Map */}
      <section className="space-y-5">
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 p-6">
          <p className="text-xs font-semibold text-blue-400">
            Verified Active Network ({activeCities.length} Indian Cities)
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            YOUR CITY TO ANY CITY – WE MOVE IT ALL.
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Click any highlighted hub on the India map to inspect active fleet strength, booking volume, pickup/destination availability, and regional depot address.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <IndiaCoverageMap
              apiKey={mapsApiKey}
              cities={cities}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            {selectedCity && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-blue-400 font-medium">{selectedCity.state}</div>
                    <h3 className="text-xl font-bold text-white">{selectedCity.cityName} Hub</h3>
                  </div>
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>

                <div className="text-xs text-slate-300">{selectedCity.hubAddress}</div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <div className="text-slate-400">Pickup Available</div>
                    <div className="font-semibold text-emerald-400 mt-0.5">
                      {selectedCity.pickupAvailable ? 'Active' : 'Unavailable'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Drop Available</div>
                    <div className="font-semibold text-emerald-400 mt-0.5">
                      {selectedCity.destinationAvailable ? 'Active' : 'Unavailable'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Stationed Fleet</div>
                    <div className="font-mono-nums font-semibold text-white mt-0.5 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-blue-400" />
                      {selectedCity.fleetCount} Trucks
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">City Bookings</div>
                    <div className="font-mono-nums font-semibold text-white mt-0.5">
                      {selectedCity.bookingCount || 0} Moves
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="text-xs text-slate-400 mb-1.5">Available Services</div>
                  <div className="text-xs text-slate-200 leading-relaxed">
                    {selectedCity.servicesAvailable.join(' · ')}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2.5">
                All Configured Active Cities ({activeCities.length})
              </div>
              <div className="max-h-52 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1">
                {activeCities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCity(c)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                      selectedCity?.id === c.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {c.cityName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Automatic Price Calculator */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <div className="flex items-center gap-2.5">
          <Calculator className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Instant Relocation Price Calculator</h2>
            <p className="text-xs text-slate-400">
              Powered by live MOVENTRA tariff rules configured by our operations team.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Service Type</label>
              <select
                value={calcService}
                onChange={(e) => setCalcService(e.target.value as ServiceType)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                {SERVICE_DETAILS.map((s) => (
                  <option key={s.type} value={s.type}>
                    {s.type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Packing Tier</label>
              <select
                value={calcPacking}
                onChange={(e) => setCalcPacking(e.target.value as 'Standard' | 'Premium')}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                <option value="Standard">Standard 2-Layer</option>
                <option value="Premium">Premium 5-Layer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pickup City</label>
              <select
                value={calcPickup}
                onChange={(e) => setCalcPickup(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                {activeCities.map((c) => (
                  <option key={c.id} value={c.cityName}>
                    {c.cityName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Destination City</label>
              <select
                value={calcDest}
                onChange={(e) => setCalcDest(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                {activeCities.map((c) => (
                  <option key={c.id} value={c.cityName}>
                    {c.cityName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rooms</label>
              <input
                type="number"
                min={1}
                max={15}
                value={calcRooms}
                onChange={(e) => setCalcRooms(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Furniture Items / Boxes</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={calcItems}
                  onChange={(e) => setCalcItems(Math.max(0, Number(e.target.value)))}
                  aria-label="Furniture items"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
                />
                <input
                  type="number"
                  min={0}
                  value={calcBoxes}
                  onChange={(e) => setCalcBoxes(Math.max(0, Number(e.target.value)))}
                  aria-label="Packing boxes"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calcLoading}
                  onChange={(e) => setCalcLoading(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-950 text-blue-600"
                />
                <span>Include Loading &amp; Unloading Crew</span>
              </label>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
            {calcResult ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2.5">
                  <span>
                    {calcPickup} → {calcDest}
                  </span>
                  <span className="font-mono-nums text-blue-300">
                    ~{calcResult.distanceKm} km · {calcResult.durationText}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Transportation</span>
                    <span className="font-mono-nums">
                      {formatINR(calcResult.breakdown.transportation)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Packing ({calcPacking})</span>
                    <span className="font-mono-nums">
                      {formatINR(calcResult.breakdown.packing)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Labour, Loading &amp; Unloading</span>
                    <span className="font-mono-nums">
                      {formatINR(
                        calcResult.breakdown.labour +
                          calcResult.breakdown.loading +
                          calcResult.breakdown.unloading
                      )}
                    </span>
                  </div>
                  {calcResult.breakdown.carpenter > 0 && (
                    <div className="flex justify-between text-slate-300">
                      <span>Carpenter Service</span>
                      <span className="font-mono-nums">
                        {formatINR(calcResult.breakdown.carpenter)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">Estimated Total</span>
                  <span className="text-2xl font-bold font-mono-nums text-blue-400">
                    {formatINR(calcResult.breakdown.total)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onStartBooking({
                      serviceType: calcService,
                      pickupCity: calcPickup,
                      destinationCity: calcDest,
                    })
                  }
                  className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Proceed to Book This Estimate
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-400">Calculating estimate...</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
