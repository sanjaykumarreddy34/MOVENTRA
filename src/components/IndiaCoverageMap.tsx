import React, { useState } from 'react';
import {
  Map as GoogleMapView,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { MapPin, Truck, CheckCircle2 } from 'lucide-react';
import type { ServiceCity } from '../types';

interface IndiaCoverageMapProps {
  apiKey: string;
  cities: ServiceCity[];
  selectedCity: ServiceCity | null;
  onSelectCity: (city: ServiceCity) => void;
}

export const IndiaCoverageMap: React.FC<IndiaCoverageMapProps> = ({
  apiKey,
  cities,
  selectedCity,
  onSelectCity,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeCities = cities.filter((c) => c.isActive);

  if (!apiKey) {
    return (
      <div className="h-[460px] w-full rounded-xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">
            Configured MOVENTRA Hubs ({activeCities.length} Active Cities)
          </span>
          <span className="text-xs text-amber-300">Maps API initializing</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-auto">
          {activeCities.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCity(c)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedCity?.id === c.id
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm">{c.cityName}</div>
              <div className="text-[11px] text-slate-400">{c.state}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[480px] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
      <GoogleMapView
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: 21.7679, lng: 78.8718 }}
        defaultZoom={4.8}
        gestureHandling="greedy"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {activeCities.map((city) => {
          const isSelected = selectedCity?.id === city.id;
          return (
            <AdvancedMarker
              key={city.id}
              position={{ lat: city.lat, lng: city.lng }}
              onClick={() => {
                onSelectCity(city);
                setHoveredId(city.id);
              }}
              title={`${city.cityName} (${city.state})`}
            >
              <Pin
                background={isSelected ? '#f59e0b' : '#2563eb'}
                borderColor={isSelected ? '#78350f' : '#1e3a8a'}
                glyphColor="#ffffff"
                scale={isSelected ? 1.25 : 1}
              />
            </AdvancedMarker>
          );
        })}

        {selectedCity && hoveredId === selectedCity.id && (
          <InfoWindow
            position={{ lat: selectedCity.lat, lng: selectedCity.lng }}
            onCloseClick={() => setHoveredId(null)}
          >
            <div className="text-slate-900 text-xs max-w-[230px] p-1 space-y-1">
              <div className="font-bold text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {selectedCity.cityName}, {selectedCity.state}
              </div>
              <div className="text-slate-600">{selectedCity.hubAddress}</div>
              <div className="flex items-center gap-3 pt-1 font-medium text-slate-800">
                <span className="inline-flex items-center gap-1">
                  <Truck className="w-3 h-3 text-blue-600" />
                  {selectedCity.fleetCount} Trucks
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {selectedCity.bookingCount || 0} Bookings
                </span>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMapView>
    </div>
  );
};
