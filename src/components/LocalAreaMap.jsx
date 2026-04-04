import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";

const RADIUS_OPTIONS = [5, 10, 20]; // miles
const MILES_TO_METERS = 1609.34;

export default function LocalAreaMap({ onSearch, consentGiven }) {
  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!consentGiven) return;
    if (requested) return;
    setRequested(true);
    setLoading(true);
    setError(false);

    if (!navigator.geolocation) { setError(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
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
  }, [consentGiven]);

  // Waiting for consent
  if (!consentGiven) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 py-14 text-center px-6">
        <LocateFixed className="w-9 h-9 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">Enable location to see your area</p>
        <p className="text-xs text-slate-400 max-w-xs">Accept the location & cookies prompt below to populate the map with restaurants near you.</p>
      </div>
    );
  }

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

  const radiusMeters = radiusMiles * MILES_TO_METERS;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="font-extrabold text-slate-900 text-base leading-tight">📍 Your Area</p>
            {locationLabel && <p className="text-sm text-slate-500">{locationLabel}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500">Radius:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusMiles(r)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                radiusMiles === r
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r} mi
            </button>
          ))}
          <button
            onClick={() => onSearch && onSearch(locationLabel || "")}
            className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            🔍 Search Here
          </button>
        </div>
      </div>
      <div style={{ height: 320 }}>
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={radiusMiles <= 5 ? 13 : radiusMiles <= 10 ? 12 : 11}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
          <Circle
            center={[coords.lat, coords.lng]}
            radius={radiusMeters}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 2 }}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold text-sm">📍 You are here</p>
                {locationLabel && <p className="text-xs text-slate-500 mt-0.5">{locationLabel}</p>}
                <p className="text-xs text-blue-600 mt-1">Radius: {radiusMiles} miles</p>
              </div>
            </Popup>
          </Circle>
        </MapContainer>
      </div>
      <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">Showing a {radiusMiles}-mile radius around your location. Tap "Search Here" to find health inspection results nearby.</p>
      </div>
    </div>
  );
}