import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Map as GoogleMapView,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Navigation, AlertCircle, LocateFixed, Route as RouteIcon } from 'lucide-react';
import { estimateRoadDistanceKm } from '../lib/api';

export interface RouteStepInfo {
  instruction: string;
  distanceText: string;
  durationText: string;
}

export interface ComputedRouteSummary {
  distanceKm: number;
  durationText: string;
  steps: RouteStepInfo[];
  routeIndex: number;
  alternativeCount: number;
  isDemoEstimate: boolean;
}

interface RouteMapViewProps {
  apiKey: string;
  pickup: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  draggablePins?: boolean;
  onPickupDrag?: (coords: { lat: number; lng: number }) => void;
  onDestinationDrag?: (coords: { lat: number; lng: number }) => void;
  onRouteCalculated?: (summary: ComputedRouteSummary) => void;
  showAlternatives?: boolean;
  vehicleProgress?: number; // 0 to 1 for live tracking vehicle pin
  vehicleLabel?: string;
  heightClass?: string;
}

function interpolateLatLng(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  t: number
) {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    lat: a.lat + (b.lat - a.lat) * clamped,
    lng: a.lng + (b.lng - a.lng) * clamped,
  };
}

const InnerRoutesController: React.FC<{
  pickup: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  showAlternatives: boolean;
  selectedRouteIdx: number;
  onRoutesFound: (summaries: ComputedRouteSummary[], paths: google.maps.LatLngLiteral[][]) => void;
  onError: (msg: string) => void;
}> = ({
  pickup,
  destination,
  showAlternatives,
  selectedRouteIdx,
  onRoutesFound,
  onError,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [routesData, setRoutesData] = useState<any[]>([]);

  useEffect(() => {
    if (!routesLib || !map) return;

    let cancelled = false;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request: any = {
      origin: { lat: pickup.lat, lng: pickup.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: 'DRIVING',
      provideRouteAlternatives: showAlternatives,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    const RouteClass = (routesLib as any).Route;
    if (!RouteClass || typeof RouteClass.computeRoutes !== 'function') {
      const est = estimateRoadDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
      onRoutesFound(
        [
          {
            distanceKm: est.distanceKm,
            durationText: est.durationText,
            steps: [],
            routeIndex: 0,
            alternativeCount: 1,
            isDemoEstimate: true,
          },
        ],
        [[pickup, destination]]
      );
      return;
    }

    RouteClass.computeRoutes(request)
      .then((res: { routes?: any[] }) => {
        if (cancelled) return;
        const list = res?.routes || [];
        if (list.length === 0) {
          onError('No driving route returned for these coordinates.');
          return;
        }
        setRoutesData(list);

        const summaries: ComputedRouteSummary[] = list.map((r: any, idx: number) => {
          const distKm = Math.max(1, Math.round((r.distanceMeters || 0) / 1000));
          const minsTotal = Math.max(1, Math.round((r.durationMillis || 0) / 60000));
          const hrs = Math.floor(minsTotal / 60);
          const mins = minsTotal % 60;
          const durationText = hrs > 0 ? `${hrs} hrs ${mins} mins` : `${mins} mins`;

          const legSteps: RouteStepInfo[] = [];
          const firstLeg = r.legs?.[0];
          if (firstLeg?.steps) {
            for (const st of firstLeg.steps.slice(0, 12)) {
              const sKm = ((st.distanceMeters || 0) / 1000).toFixed(1);
              const sMin = Math.max(1, Math.round((st.staticDurationMillis || st.durationMillis || 60000) / 60000));
              legSteps.push({
                instruction: st.navigationInstruction?.instructions || st.instructions || 'Continue on highway corridor',
                distanceText: `${sKm} km`,
                durationText: `${sMin} min`,
              });
            }
          }

          return {
            distanceKm: distKm,
            durationText,
            steps: legSteps,
            routeIndex: idx,
            alternativeCount: list.length,
            isDemoEstimate: false,
          };
        });

        const paths: google.maps.LatLngLiteral[][] = list.map((r: any) => {
          if (Array.isArray(r.path)) {
            return r.path.map((pt: any) => ({
              lat: typeof pt.lat === 'function' ? pt.lat() : pt.lat,
              lng: typeof pt.lng === 'function' ? pt.lng() : pt.lng,
            }));
          }
          return [
            { lat: pickup.lat, lng: pickup.lng },
            { lat: destination.lat, lng: destination.lng },
          ];
        });

        onRoutesFound(summaries, paths);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const msg = err?.message || 'Unable to compute route.';
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [routesLib, map, pickup.lat, pickup.lng, destination.lat, destination.lng, showAlternatives]);

  useEffect(() => {
    if (!map || routesData.length === 0) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    routesData.forEach((route, idx) => {
      const isSelected = idx === selectedRouteIdx;
      if (typeof route.createPolylines === 'function') {
        const lines: google.maps.Polyline[] = route.createPolylines();
        lines.forEach((line) => {
          line.setOptions({
            strokeColor: isSelected ? '#38bdf8' : '#64748b',
            strokeOpacity: isSelected ? 0.95 : 0.45,
            strokeWeight: isSelected ? 6 : 4,
            zIndex: isSelected ? 10 : 2,
          });
          line.setMap(map);
        });
        polylinesRef.current.push(...lines);
      } else if (Array.isArray(route.path)) {
        const line = new google.maps.Polyline({
          path: route.path,
          geodesic: true,
          strokeColor: isSelected ? '#38bdf8' : '#64748b',
          strokeOpacity: isSelected ? 0.95 : 0.45,
          strokeWeight: isSelected ? 6 : 4,
          zIndex: isSelected ? 10 : 2,
          map,
        });
        polylinesRef.current.push(line);
      }
    });

    const chosen = routesData[selectedRouteIdx] || routesData[0];
    if (chosen?.viewport) {
      map.fitBounds(chosen.viewport, { top: 48, right: 48, bottom: 48, left: 48 });
    } else {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(destination);
      map.fitBounds(bounds, 56);
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesData, selectedRouteIdx]);

  return null;
};

export const RouteMapView: React.FC<RouteMapViewProps> = ({
  apiKey,
  pickup,
  destination,
  draggablePins = false,
  onPickupDrag,
  onDestinationDrag,
  onRouteCalculated,
  showAlternatives = false,
  vehicleProgress,
  vehicleLabel,
  heightClass = 'h-[420px]',
}) => {
  const [summaries, setSummaries] = useState<ComputedRouteSummary[]>([]);
  const [routePaths, setRoutePaths] = useState<google.maps.LatLngLiteral[][]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [activeInfo, setActiveInfo] = useState<'pickup' | 'dest' | 'vehicle' | null>(null);

  const handleRoutesFound = useCallback(
    (list: ComputedRouteSummary[], paths: google.maps.LatLngLiteral[][]) => {
      setRouteError(null);
      setSummaries(list);
      setRoutePaths(paths);
      setSelectedIdx(0);
      if (list[0] && onRouteCalculated) {
        onRouteCalculated(list[0]);
      }
    },
    [onRouteCalculated]
  );

  const handleError = useCallback(
    (msg: string) => {
      setRouteError(msg);
      const fallback = estimateRoadDistanceKm(
        pickup.lat,
        pickup.lng,
        destination.lat,
        destination.lng
      );
      const summary: ComputedRouteSummary = {
        distanceKm: fallback.distanceKm,
        durationText: fallback.durationText,
        steps: [
          {
            instruction: `Depart ${pickup.label} via National Highway Corridor`,
            distanceText: `${Math.round(fallback.distanceKm * 0.4)} km`,
            durationText: `${Math.round((fallback.distanceKm * 0.4) / 56 * 60)} min`,
          },
          {
            instruction: `Continue intercity expressway toward ${destination.label}`,
            distanceText: `${Math.round(fallback.distanceKm * 0.6)} km`,
            durationText: `${Math.round((fallback.distanceKm * 0.6) / 56 * 60)} min`,
          },
        ],
        routeIndex: 0,
        alternativeCount: 1,
        isDemoEstimate: true,
      };
      setSummaries([summary]);
      onRouteCalculated?.(summary);
    },
    [pickup, destination, onRouteCalculated]
  );

  const selectAlternative = (idx: number) => {
    setSelectedIdx(idx);
    if (summaries[idx]) {
      onRouteCalculated?.(summaries[idx]);
    }
  };

  // Compute live vehicle coordinate along active path if tracking
  const vehicleCoord = React.useMemo(() => {
    if (vehicleProgress === undefined) return null;
    const path = routePaths[selectedIdx];
    if (path && path.length > 1) {
      const idxFloat = Math.max(0, Math.min(1, vehicleProgress)) * (path.length - 1);
      const i0 = Math.floor(idxFloat);
      const i1 = Math.min(path.length - 1, i0 + 1);
      const frac = idxFloat - i0;
      return interpolateLatLng(path[i0], path[i1], frac);
    }
    return interpolateLatLng(pickup, destination, vehicleProgress);
  }, [vehicleProgress, routePaths, selectedIdx, pickup, destination]);

  const center = {
    lat: (pickup.lat + destination.lat) / 2,
    lng: (pickup.lng + destination.lng) / 2,
  };

  if (!apiKey) {
    const est = estimateRoadDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
    return (
      <div className={`relative w-full ${heightClass} rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col justify-between p-5`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Demo Route Corridor Preview (Google Maps API Key awaiting activation)</span>
          </div>
          <span className="font-mono-nums text-xs text-slate-300">
            {est.distanceKm} km · {est.durationText}
          </span>
        </div>

        <svg viewBox="0 0 600 220" className="w-full h-44 my-auto">
          <defs>
            <linearGradient id="demoCorridor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <path
            d="M 80 145 Q 300 40 520 120"
            fill="none"
            stroke="url(#demoCorridor)"
            strokeWidth="4"
            strokeDasharray="8 6"
          />
          <circle cx="80" cy="145" r="9" fill="#22c55e" />
          <text x="80" y="176" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="600">
            {pickup.label}
          </text>
          <circle cx="520" cy="120" r="9" fill="#f59e0b" />
          <text x="520" y="152" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="600">
            {destination.label}
          </text>
        </svg>

        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>Origin: {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}</span>
          <span>Destination: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-slate-800 bg-slate-950`}>
        <GoogleMapView
          mapId="DEMO_MAP_ID"
          defaultCenter={center}
          defaultZoom={6}
          gestureHandling="greedy"
          disableDefaultUI={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <InnerRoutesController
            pickup={pickup}
            destination={destination}
            showAlternatives={showAlternatives}
            selectedRouteIdx={selectedIdx}
            onRoutesFound={handleRoutesFound}
            onError={handleError}
          />

          <AdvancedMarker
            position={{ lat: pickup.lat, lng: pickup.lng }}
            draggable={draggablePins}
            onClick={() => setActiveInfo('pickup')}
            onDragEnd={(e) => {
              if (e.latLng && onPickupDrag) {
                onPickupDrag({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }
            }}
            title={`Pickup: ${pickup.label}`}
          >
            <Pin background="#16a34a" borderColor="#14532d" glyphColor="#ffffff" />
          </AdvancedMarker>

          <AdvancedMarker
            position={{ lat: destination.lat, lng: destination.lng }}
            draggable={draggablePins}
            onClick={() => setActiveInfo('dest')}
            onDragEnd={(e) => {
              if (e.latLng && onDestinationDrag) {
                onDestinationDrag({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }
            }}
            title={`Destination: ${destination.label}`}
          >
            <Pin background="#ea580c" borderColor="#7c2d12" glyphColor="#ffffff" />
          </AdvancedMarker>

          {vehicleCoord && (
            <AdvancedMarker
              position={vehicleCoord}
              onClick={() => setActiveInfo('vehicle')}
              title={vehicleLabel || 'MOVENTRA Fleet Vehicle'}
            >
              <div className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold border border-white/60 shadow-lg flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                <span>Truck</span>
              </div>
            </AdvancedMarker>
          )}

          {activeInfo === 'pickup' && (
            <InfoWindow position={pickup} onCloseClick={() => setActiveInfo(null)}>
              <div className="text-slate-900 text-xs font-medium p-1">
                <div className="font-bold">Pickup Point</div>
                <div>{pickup.label}</div>
                {draggablePins && <div className="text-slate-500 mt-0.5">Drag pin to fine-tune</div>}
              </div>
            </InfoWindow>
          )}

          {activeInfo === 'dest' && (
            <InfoWindow position={destination} onCloseClick={() => setActiveInfo(null)}>
              <div className="text-slate-900 text-xs font-medium p-1">
                <div className="font-bold">Destination Point</div>
                <div>{destination.label}</div>
                {draggablePins && <div className="text-slate-500 mt-0.5">Drag pin to fine-tune</div>}
              </div>
            </InfoWindow>
          )}

          {activeInfo === 'vehicle' && vehicleCoord && (
            <InfoWindow position={vehicleCoord} onCloseClick={() => setActiveInfo(null)}>
              <div className="text-slate-900 text-xs font-medium p-1">
                <div className="font-bold">{vehicleLabel || 'Assigned Fleet Truck'}</div>
                <div>Active highway corridor transit</div>
              </div>
            </InfoWindow>
          )}
        </GoogleMapView>

        {draggablePins && (
          <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-700/80 text-xs text-slate-200 flex items-center gap-1.5">
            <LocateFixed className="w-3.5 h-3.5 text-blue-400" />
            <span>Drag green (Pickup) or orange (Drop) pins to adjust coordinates</span>
          </div>
        )}
      </div>

      {routeError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Live Google Routes fallback active ({routeError}). Showing estimated highway corridor metrics.
          </span>
        </div>
      )}

      {showAlternatives && summaries.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {summaries.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectAlternative(idx)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                selectedIdx === idx
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Route {idx + 1}:</span>
              <span className="font-mono-nums">{s.distanceKm} km</span>
              <span>·</span>
              <span>{s.durationText}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
