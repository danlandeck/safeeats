import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { MapPin, Loader2, LocateFixed, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";

const RADIUS_OPTIONS = [5, 10, 20];
const MILES_TO_METERS = 1609.34;

export default function LocalAreaMap({ onSearch, consentGiven }) {
  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [manualInput, setManualInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  useEffect(() => {
    if (!consentGiven || coords || geoBlocked) return;
    setLoading(true);
    if (!navigator.geolocation) { setGeoBlocked(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.suburb || "";
          const state = a.state || "";
          const zip = a.postcode || "";
          setLocationLabel(`${city}${state ? ", " + state : ""}${zip ? " " + zip : ""}`);
        } catch { setLocationLabel(null); }
        setLoading(false);
      },
      () => { setGeoBlocked(true); setLoading(false); },
      { timeout: 8000 }
    );
  }, [consentGiven]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const q = manualInput.trim();
    if (!q) return;
    setGeocodeError("");
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us`);
      const data = await res.json();
      if (!data || data.length === 0) {
        setGeocodeError("Location not found. Try a city name or ZIP code.");
        setGeocoding(false);
        return;
      }
      const { lat, lon } = data[0];
      const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).then(r => r.json());
      const a = rev.address || {};
      const city = a.city || a.town || a.village || a.suburb || q;
      const state = a.state || "";
      const zip = a.postcode || "";
      const label = `${city}${state ? ", " + state : ""}${zip ? " " + zip : ""}`;
      setCoords({ lat: parseFloat(lat), lng: parseFloat(lon) });
      setLocationLabel(label);
      setGeoBlocked(false);
    } catch {
      setGeocodeError("Could not find that location. Please try again.");
    }
    setGeocoding(false);
  };

  if (!consentGiven) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 py-14 text-center px-6">
        <LocateFixed className="w-9 h-9 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">Enable location to see your area</p>
        <p className="text-xs text-slate-400 max-w-xs">Accept the location & cookies prompt to populate the map with restaurants near you.</p>
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

  if (geoBlocked || !coords) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
        <LocateFixed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 mb-1">Location access not available</p>
        <p className="text-xs text-slate-400 mb-4">Enter your city or zip code to find nearby restaurants.</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-sm mx-auto">
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="City, State or ZIP code"
            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            type="submit"
            disabled={geocoding}
            className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {geocoding ? "Finding…" : "Go"}
          </button>
        </form>
        {geocodeError && <p className="text-xs text-red-500 mt-3">{geocodeError}</p>}
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
                radiusMiles === r ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r} mi
            </button>
          ))}
          <button
            onClick={() => {
              const zip = (locationLabel || "").match(/(\d{5})/)?.[1];
              const city = (locationLabel || "").split(",")[0].trim();
              const term = zip || city || "restaurant";
              onSearch && onSearch(term, coords, radiusMiles);
            }}
            className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            🔍 Search Here
          </button>
        </div>
      </div>
      <div style={{ height: 320 }}>
        <MapContainer
          key={`${coords.lat}-${coords.lng}-${radiusMiles}`}
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
        <p className="text-[11px] text-slate-400">Showing a {radiusMiles}-mile radius. Tap "Search Here" to find health inspection results nearby.</p>
      </div>
    </div>
  );
}