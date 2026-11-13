import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { ArrowRight, LocateFixed, Navigation, Route as RouteIcon } from 'lucide-react';
import type { ServiceCity } from '../types';
import { RouteMapView, type ComputedRouteSummary } from './RouteMapView';

interface PathFinderPageProps {
  cities: ServiceCity[];
  mapsApiKey: string;
  onUseRouteForBooking: (pickupCity: string, destinationCity: string) => void;
}

interface PlaceSearchBoxProps {
  label: string;
  initialText: string;
  cities: ServiceCity[];
  onSelect: (coords: { lat: number; lng: number; label: string }) => void;
}

const PlaceSearchBox: React.FC<PlaceSearchBoxProps> = ({
  label,
  initialText,
  cities,
  onSelect,
}) => {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState(initialText);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    setQuery(initialText);
  }, [initialText]);

  useEffect(() => {
    if (!placesLib || !open || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ['in'],
          sessionToken: sessionTokenRef.current,
        })
          .then((res) => {
            setSuggestions(res.suggestions || []);
          })
          .catch(() => setSuggestions([]));
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [placesLib, query, open]);

  const handleSelectPrediction = async (
    sugg: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!sugg.placePrediction) return;
    try {
      const place = sugg.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const loc = place.location;
      if (loc) {
        const text = place.displayName || sugg.placePrediction.text.text;
        setQuery(text);
        setOpen(false);
        sessionTokenRef.current = null;
        onSelect({ lat: loc.lat(), lng: loc.lng(), label: text });
      }
    } catch {
      setOpen(false);
    }
  };

  return (
    <div className="relative space-y-1.5">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      <input
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder="Type any Indian city or address..."
        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500"
      />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {cities.slice(0, 6).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setQuery(c.cityName);
              setOpen(false);
              onSelect({ lat: c.lat, lng: c.lng, label: c.cityName });
            }}
            className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300"
          >
            {c.cityName}
          </button>
        ))}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 top-[68px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800">
          {suggestions.map((s, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handleSelectPrediction(s)}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-200 hover:bg-blue-600/20"
              >
                {s.placePrediction?.text.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const PathFinderPage: React.FC<PathFinderPageProps> = ({
  cities,
  mapsApiKey,
  onUseRouteForBooking,
}) => {
  const [pickup, setPickup] = useState({
    lat: 17.385,
    lng: 78.4867,
    label: 'Hyderabad',
  });
  const [destination, setDestination] = useState({
    lat: 12.9716,
    lng: 77.5946,
    label: 'Bangalore',
  });
  const [summary, setSummary] = useState<ComputedRouteSummary | null>(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setPickup({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: 'Current Location',
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Path Finder</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Calculate real Indian highway routes, driving distances, and alternative transit corridors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUseRouteForBooking(pickup.label, destination.label)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg"
        >
          <span>Use This Route for Booking</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <RouteIcon className="w-4 h-4 text-blue-400" />
                Corridor Controls
              </span>
              <button
                type="button"
                onClick={handleLocateMe}
                className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                My GPS
              </button>
            </div>

            {mapsApiKey ? (
              <>
                <PlaceSearchBox
                  label="Pickup Location"
                  initialText={pickup.label}
                  cities={cities}
                  onSelect={setPickup}
                />
                <PlaceSearchBox
                  label="Destination Location"
                  initialText={destination.label}
                  cities={cities}
                  onSelect={setDestination}
                />
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Pickup City</label>
                  <select
                    value={pickup.label}
                    onChange={(e) => {
                      const c = cities.find((x) => x.cityName === e.target.value);
                      if (c) setPickup({ lat: c.lat, lng: c.lng, label: c.cityName });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.cityName}>
                        {c.cityName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Destination City</label>
                  <select
                    value={destination.label}
                    onChange={(e) => {
                      const c = cities.find((x) => x.cityName === e.target.value);
                      if (c) setDestination({ lat: c.lat, lng: c.lng, label: c.cityName });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.cityName}>
                        {c.cityName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {summary && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Road Distance</span>
                  <span className="text-lg font-bold font-mono-nums text-white">
                    {summary.distanceKm} km
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Estimated Drive Time</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {summary.durationText}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Alternatives Found</span>
                  <span className="text-xs font-mono-nums text-slate-200">
                    {summary.alternativeCount}
                  </span>
                </div>
              </div>
            )}

            {summary && summary.steps.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                  Route Waypoints &amp; Directions
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {summary.steps.map((s, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 flex justify-between gap-2"
                    >
                      <span>
                        {i + 1}. {s.instruction}
                      </span>
                      <span className="font-mono-nums text-slate-400 shrink-0">
                        {s.distanceText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <RouteMapView
            apiKey={mapsApiKey}
            pickup={pickup}
            destination={destination}
            draggablePins={true}
            onPickupDrag={(coords) => setPickup((p) => ({ ...p, ...coords }))}
            onDestinationDrag={(coords) => setDestination((d) => ({ ...d, ...coords }))}
            onRouteCalculated={setSummary}
            showAlternatives={true}
            heightClass="h-[560px]"
          />
        </div>
      </div>
    </div>
  );
};
