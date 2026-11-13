import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  MapPin,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Truck,
} from 'lucide-react';
import {
  SERVICE_DETAILS,
  type Booking,
  type PriceBreakdown,
  type ServiceCity,
  type ServiceType,
  type User,
} from '../types';
import { RouteMapView, type ComputedRouteSummary } from './RouteMapView';
import { apiFetch, estimateRoadDistanceKm, formatINR } from '../lib/api';

interface BookingWizardProps {
  user: User;
  cities: ServiceCity[];
  mapsApiKey: string;
  initialPrefill?: {
    serviceType?: ServiceType;
    pickupCity?: string;
    destinationCity?: string;
  } | null;
  onBookingCreated: (booking: Booking) => void;
  onNavigateToBookings: () => void;
  onNavigateToTrack: (bookingId: string) => void;
}

const STEPS = [
  '1. Select Service',
  '2. Pickup & Drop',
  '3. Map & Route',
  '4. Moving Details',
  '5. Price & Confirm',
];

export const BookingWizard: React.FC<BookingWizardProps> = ({
  user,
  cities,
  mapsApiKey,
  initialPrefill,
  onBookingCreated,
  onNavigateToBookings,
  onNavigateToTrack,
}) => {
  const pickupCities = useMemo(() => cities.filter((c) => c.isActive && c.pickupAvailable), [cities]);
  const destCities = useMemo(() => cities.filter((c) => c.isActive && c.destinationAvailable), [cities]);

  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType>(
    initialPrefill?.serviceType || 'House Shifting'
  );

  // Step 2
  const [pickupCitySearch, setPickupCitySearch] = useState('');
  const [destCitySearch, setDestCitySearch] = useState('');
  const [pickupCity, setPickupCity] = useState(initialPrefill?.pickupCity || 'Hyderabad');
  const [destinationCity, setDestinationCity] = useState(
    initialPrefill?.destinationCity || 'Bangalore'
  );
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  // Step 3 Coordinates & Route
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({
    lat: 17.385,
    lng: 78.4867,
  });
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [routeSummary, setRouteSummary] = useState<ComputedRouteSummary | null>(null);
  const [locating, setLocating] = useState(false);

  // Step 4 Moving Details
  const [rooms, setRooms] = useState(2);
  const [furnitureItems, setFurnitureItems] = useState(10);
  const [packingBoxes, setPackingBoxes] = useState(18);
  const [floorNumber, setFloorNumber] = useState(2);
  const [hasLift, setHasLift] = useState(true);
  const [packingType, setPackingType] = useState<'Standard' | 'Premium'>('Premium');
  const [loadingRequired, setLoadingRequired] = useState(true);
  const [carpenterRequired, setCarpenterRequired] = useState(false);
  const [movingDate, setMovingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState('08:00 AM - 10:00 AM');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [furniturePhotos, setFurniturePhotos] = useState<string[]>([]);

  // Step 5 Pricing & Submission
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Sync coords when city changes
  useEffect(() => {
    const p = cities.find((c) => c.cityName === pickupCity);
    if (p) setPickupCoords({ lat: p.lat, lng: p.lng });
  }, [pickupCity, cities]);

  useEffect(() => {
    const d = cities.find((c) => c.cityName === destinationCity);
    if (d) setDestCoords({ lat: d.lat, lng: d.lng });
  }, [destinationCity, cities]);

  // Apply prefill if passed
  useEffect(() => {
    if (initialPrefill?.serviceType) setServiceType(initialPrefill.serviceType);
    if (initialPrefill?.pickupCity) setPickupCity(initialPrefill.pickupCity);
    if (initialPrefill?.destinationCity) setDestinationCity(initialPrefill.destinationCity);
  }, [initialPrefill]);

  const effectiveRoute = useMemo(() => {
    if (routeSummary) return routeSummary;
    const est = estimateRoadDistanceKm(
      pickupCoords.lat,
      pickupCoords.lng,
      destCoords.lat,
      destCoords.lng
    );
    return {
      distanceKm: est.distanceKm,
      durationText: est.durationText,
      steps: [],
      routeIndex: 0,
      alternativeCount: 1,
      isDemoEstimate: true,
    };
  }, [routeSummary, pickupCoords, destCoords]);

  const fetchBreakdown = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await apiFetch<{ breakdown: PriceBreakdown }>('/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          serviceType,
          distanceKm: effectiveRoute.distanceKm,
          rooms,
          furnitureItems,
          packingBoxes,
          floorNumber,
          hasLift,
          packingType,
          loadingRequired,
          carpenterRequired,
        }),
      });
      setBreakdown(res.breakdown);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (step === 5) {
      fetchBreakdown();
    }
  }, [step]);

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setError('Location permission denied. You can still drag the green Pickup pin on the map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - furniturePhotos.length);
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        setError('Each photo must be under 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFurniturePhotos((prev) => [...prev.slice(0, 3), reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleNext = () => {
    setError(null);
    if (step === 2) {
      if (!pickupAddress.trim() || !destinationAddress.trim()) {
        setError('Please enter complete pickup and destination street addresses.');
        return;
      }
    }
    if (step === 4 && !movingDate) {
      setError('Please choose a preferred moving date.');
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const handleConfirmBooking = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ booking: Booking; message: string }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceType,
          pickupCity,
          pickupAddress: pickupAddress.trim(),
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          destinationCity,
          destinationAddress: destinationAddress.trim(),
          destinationLat: destCoords.lat,
          destinationLng: destCoords.lng,
          distanceKm: effectiveRoute.distanceKm,
          durationText: effectiveRoute.durationText,
          rooms,
          furnitureItems,
          packingBoxes,
          floorNumber,
          hasLift,
          packingType,
          loadingRequired,
          carpenterRequired,
          movingDate,
          preferredTime,
          specialInstructions,
          furniturePhotos,
        }),
      });
      setConfirmedBooking(res.booking);
      onBookingCreated(res.booking);
    } catch (err: any) {
      setError(err.message || 'Unable to confirm booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedBooking) {
    return (
      <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-400">Booking Confirmation Issued</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Your Move Is Confirmed!
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            Booking ID{' '}
            <span className="font-mono-nums font-bold text-blue-300">
              {confirmedBooking.bookingId}
            </span>{' '}
            has been saved under Customer ID{' '}
            <span className="font-mono-nums text-slate-200">{confirmedBooking.customerId}</span>.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs">
          <div>
            <div className="text-slate-400">Service</div>
            <div className="font-semibold text-white mt-0.5">{confirmedBooking.serviceType}</div>
          </div>
          <div>
            <div className="text-slate-400">Route</div>
            <div className="font-semibold text-white mt-0.5">
              {confirmedBooking.pickupCity} → {confirmedBooking.destinationCity}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Moving Date</div>
            <div className="font-mono-nums font-semibold text-white mt-0.5">
              {confirmedBooking.movingDate}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Estimated Total</div>
            <div className="font-mono-nums font-bold text-emerald-400 mt-0.5">
              {formatINR(confirmedBooking.estimatedPrice)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateToTrack(confirmedBooking.bookingId)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Track My Move
          </button>
          <button
            type="button"
            onClick={onNavigateToBookings}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold"
          >
            View in My Bookings
          </button>
        </div>
      </div>
    );
  }

  const filteredPickupCities = pickupCities.filter((c) =>
    c.cityName.toLowerCase().includes(pickupCitySearch.toLowerCase())
  );
  const filteredDestCities = destCities.filter((c) =>
    c.cityName.toLowerCase().includes(destCitySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 5-Step Progress Indicator */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const active = step === num;
            const done = step > num;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (done) setStep(num);
                }}
                disabled={!done && !active}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  active
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : done
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 cursor-pointer'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full text-xs font-mono-nums font-bold flex items-center justify-center shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : done
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : num}
                </span>
                <span className="text-xs font-semibold truncate">{label.replace(/^\d+\.\s/, '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: SELECT SERVICE */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Step 1: Select Your Moving Service</h2>
            <p className="text-sm text-slate-400 mt-1">
              Choose the relocation package tailored to your household, corporate, or carpentry needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SERVICE_DETAILS.map((srv) => {
              const selected = serviceType === srv.type;
              return (
                <button
                  key={srv.type}
                  type="button"
                  onClick={() => setServiceType(srv.type)}
                  className={`group text-left rounded-2xl overflow-hidden border transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-950/30 shadow-[0_0_24px_rgba(59,130,246,0.2)]'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                  }`}
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src={srv.image}
                      alt={srv.type}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-white">{srv.type}</span>
                      {selected && (
                        <span className="text-xs font-semibold text-blue-300 bg-slate-950/90 px-2.5 py-1 rounded-md border border-blue-500/40">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <p className="text-xs text-slate-300">{srv.subtitle}</p>
                    <ul className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
                      {srv.highlights.map((h) => (
                        <li key={h} className="truncate">
                          · {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: PICKUP AND DESTINATION */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Step 2: Select Pickup &amp; Destination</h2>
            <p className="text-sm text-slate-400 mt-1">
              Search from our 20 active Indian cities and enter complete door-to-door street addresses.
            </p>
          </div>

          {user.savedAddresses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">Quick-fill saved address as Pickup:</span>
              {user.savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => {
                    setPickupCity(addr.city);
                    setPickupAddress(addr.address);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700"
                >
                  {addr.label} ({addr.city})
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Column */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Pickup Location
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Search Pickup City</label>
                <input
                  type="text"
                  value={pickupCitySearch}
                  onChange={(e) => setPickupCitySearch(e.target.value)}
                  placeholder="Filter 20 Indian cities..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white mb-2"
                />
                <select
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                >
                  {filteredPickupCities.map((c) => (
                    <option key={c.id} value={c.cityName}>
                      {c.cityName} ({c.state})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Complete Pickup Street Address *
                </label>
                <textarea
                  rows={3}
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="House/Flat No., Society/Building Name, Landmark, Pincode"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* Destination Column */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Destination Location
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Search Destination City</label>
                <input
                  type="text"
                  value={destCitySearch}
                  onChange={(e) => setDestCitySearch(e.target.value)}
                  placeholder="Filter 20 Indian cities..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white mb-2"
                />
                <select
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                >
                  {filteredDestCities.map((c) => (
                    <option key={c.id} value={c.cityName}>
                      {c.cityName} ({c.state})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Complete Destination Street Address *
                </label>
                <textarea
                  rows={3}
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Flat/Villa/Office No., Street, Locality, Pincode"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LOCATION MAP & PATH FINDER */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">
                Step 3: Interactive Route Map &amp; Distance
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Verify your route between {pickupCity} and {destinationCity}. Drag pins to adjust exact pickup or drop coordinates.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDetectCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-blue-300"
            >
              <LocateFixed className="w-4 h-4" />
              {locating ? 'Detecting GPS...' : 'Use My Current Location'}
            </button>
          </div>

          <RouteMapView
            apiKey={mapsApiKey}
            pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, label: pickupCity }}
            destination={{ lat: destCoords.lat, lng: destCoords.lng, label: destinationCity }}
            draggablePins={true}
            onPickupDrag={setPickupCoords}
            onDestinationDrag={setDestCoords}
            onRouteCalculated={setRouteSummary}
            showAlternatives={true}
            heightClass="h-[400px]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400">Calculated Road Distance</div>
              <div className="text-2xl font-bold font-mono-nums text-white mt-0.5">
                {effectiveRoute.distanceKm} km
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Estimated Transit Time</div>
              <div className="text-2xl font-bold text-blue-400 mt-0.5">
                {effectiveRoute.durationText}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Route Source</div>
              <div className="text-sm font-semibold text-slate-200 mt-1.5">
                {effectiveRoute.isDemoEstimate
                  ? 'Corridor Estimate (Fallback)'
                  : 'Google Maps Routes API'}
              </div>
            </div>
          </div>

          {effectiveRoute.steps.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2.5">
                Highway Turn-by-Turn Directions
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {effectiveRoute.steps.map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs text-slate-300 py-1.5 border-b border-slate-800/70 last:border-0"
                  >
                    <span className="truncate pr-4">
                      {i + 1}. {st.instruction}
                    </span>
                    <span className="font-mono-nums text-slate-400 shrink-0">
                      {st.distanceText} · {st.durationText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: MOVING DETAILS */}
      {step === 4 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Step 4: Moving &amp; Inventory Details</h2>
            <p className="text-sm text-slate-400 mt-1">
              Provide room count, furniture load, floor access, and schedule preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Number of Rooms</label>
              <input
                type="number"
                min={1}
                max={20}
                value={rooms}
                onChange={(e) => setRooms(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Furniture Items</label>
              <input
                type="number"
                min={0}
                max={150}
                value={furnitureItems}
                onChange={(e) => setFurnitureItems(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Packing Boxes</label>
              <input
                type="number"
                min={0}
                max={300}
                value={packingBoxes}
                onChange={(e) => setPackingBoxes(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Floor Number</label>
              <input
                type="number"
                min={0}
                max={60}
                value={floorNumber}
                onChange={(e) => setFloorNumber(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Packing Protection Tier
              </label>
              <select
                value={packingType}
                onChange={(e) => setPackingType(e.target.value as 'Standard' | 'Premium')}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                <option value="Standard">Standard 2-Layer Corrugated</option>
                <option value="Premium">Premium 5-Layer Foam + Bubble</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Moving Date *</label>
              <input
                type="date"
                value={movingDate}
                onChange={(e) => setMovingDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono-nums text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Slot</label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              >
                <option>06:00 AM - 08:00 AM</option>
                <option>08:00 AM - 10:00 AM</option>
                <option>10:00 AM - 12:00 PM</option>
                <option>02:00 PM - 04:00 PM</option>
                <option>04:00 PM - 06:00 PM</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-slate-200 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLift}
                onChange={(e) => setHasLift(e.target.checked)}
                className="rounded border-slate-600 bg-slate-950 text-blue-600"
              />
              <span>Service Lift Available</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={loadingRequired}
                onChange={(e) => setLoadingRequired(e.target.checked)}
                className="rounded border-slate-600 bg-slate-950 text-blue-600"
              />
              <span>Include Loading &amp; Unloading Crew</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={carpenterRequired || serviceType === 'Carpenter Services'}
                onChange={(e) => setCarpenterRequired(e.target.checked)}
                className="rounded border-slate-600 bg-slate-950 text-blue-600"
              />
              <span>Include Carpenter Dismantling / Assembly</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Special Instructions
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Fragile marble dining table, piano, society entry timing, etc."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500"
            />
          </div>

          {/* Furniture Photo Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Upload Furniture Photographs (Optional, up to 4 images)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {furniturePhotos.length < 4 && (
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-600 hover:border-blue-500 bg-slate-950 text-xs font-medium text-slate-300">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Select Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
              {furniturePhotos.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700"
                >
                  <img src={src} alt={`Furniture ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setFurniturePhotos((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/90 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: PRICE ESTIMATION & CONFIRMATION */}
      {step === 5 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                Step 5: Itemized Price Estimate &amp; Confirmation
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Review your transparent cost breakdown for {serviceType} ({pickupCity} → {destinationCity},{' '}
                {effectiveRoute.distanceKm} km).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Booking
            </button>
          </div>

          {calculating || !breakdown ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Calculating live tariff breakdown...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/80 text-sm">
                {[
                  ['Transportation Charges', breakdown.transportation],
                  ['Packing Material & Wrapping', breakdown.packing],
                  ['Trained Labour Charges', breakdown.labour],
                  ['Loading Charges', breakdown.loading],
                  ['Unloading Charges', breakdown.unloading],
                  ['Carpenter Dismantling & Assembly', breakdown.carpenter],
                  ['Additional Floor / Access Charges', breakdown.additional],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex items-center justify-between px-4 py-3">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-mono-nums font-medium text-white">
                      {formatINR(Number(val))}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-4 bg-blue-950/30">
                  <span className="font-bold text-white text-base">Estimated Total Price</span>
                  <span className="font-mono-nums font-bold text-2xl text-blue-400">
                    {formatINR(breakdown.total)}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="font-semibold text-white text-sm">Booking Summary</div>
                  <div>
                    <span className="text-slate-400">Customer ID:</span>{' '}
                    <span className="font-mono-nums text-blue-300">{user.customerId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Pickup:</span> {pickupAddress}, {pickupCity}
                  </div>
                  <div>
                    <span className="text-slate-400">Destination:</span> {destinationAddress},{' '}
                    {destinationCity}
                  </div>
                  <div>
                    <span className="text-slate-400">Schedule:</span> {movingDate} · {preferredTime}
                  </div>
                  <div>
                    <span className="text-slate-400">Load:</span> {rooms} Rooms · {furnitureItems}{' '}
                    Furniture · {packingBoxes} Boxes ({packingType})
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Note: This is a calculated estimate based on declared inventory and route distance. Final billed price may change after on-site or video survey inspection.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={submitting}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 disabled:opacity-60"
                >
                  {submitting ? 'Confirming Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Go Back
        </button>

        {step < 5 && (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
