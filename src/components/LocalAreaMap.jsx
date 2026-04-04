import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";

export default function LocalAreaMap({ onSearch }) {
  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setError(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        // Reverse geocode to get city, state, zip
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.suburb || "";
          const state = a.state || "";
          const zip = a.postcode || "";
          setLocationLabel(`${city}${state ? ", " + state : ""}${zip ? " " + zip : ""}`);
        } catch {
          setLocationLabel(null);
        }
        setLoading(false);
      },
      () => { setError(true); setLoading(false); }
    );
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center gap-3 py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500 font-medium">Finding your location…</span>
      </div>
    );
  }

  if (error || !coords) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2 py-10 text-center px-6">
        <LocateFixed className="w-8 h-8 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Location access denied</p>
        <p className="text-xs text-slate-400">Allow location access in your browser to see a map of your area.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="font-extrabold text-slate-900 text-base leading-tight">📍 Your Area</p>
            {locationLabel && <p className="text-sm text-slate-500">{locationLabel}</p>}
          </div>
        </div>
        <button
          onClick={() => onSearch && onSearch(locationLabel || "")}
          className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
        >
          🔍 Search Restaurants Here
        </button>
      </div>
      <div style={{ height: 320 }}>
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
          <Circle
            center={[coords.lat, coords.lng]}
            radius={800}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 2 }}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold text-sm">📍 You are here</p>
                {locationLabel && <p className="text-xs text-slate-500 mt-0.5">{locationLabel}</p>}
              </div>
            </Popup>
          </Circle>
        </MapContainer>
      </div>
      <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">Tap "Search Restaurants Here" to find health inspection results in your neighborhood.</p>
      </div>
    </div>
  );
}