import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, LocateFixed, Search } from "lucide-react";

const RADIUS_OPTIONS = [5, 10, 20];
const MILES_TO_METERS = 1609.34;

// Load Leaflet CSS once
let leafletCssLoaded = false;
function ensureLeafletCss() {
  if (leafletCssLoaded) return;
  leafletCssLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

let _leafletPromise = null;
function loadLeaflet() {
  ensureLeafletCss();
  if (window.L) return Promise.resolve(window.L);
  if (_leafletPromise) return _leafletPromise;
  _leafletPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return _leafletPromise;
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
  const data = await res.json();
  if (!data?.address) return null;
  const { city, town, village, suburb, state, postcode } = data.address;
  const place = city || town || village || suburb || "";
  return `${place}${state ? ", " + state : ""}${postcode ? " " + postcode : ""}`;
}

async function geocodeAddress(query) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
  const data = await res.json();
  if (!data?.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export default function LocalAreaMap({ onSearch, consentGiven }) {
  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [manualInput, setManualInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const circleRef = useRef(null);
  const markerRef = useRef(null);

  // Auto-detect location on consent
  useEffect(() => {
    if (!consentGiven || coords || geoBlocked) return;
    setLoading(true);
    if (!navigator.geolocation) { setGeoBlocked(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const label = await reverseGeocode(latitude, longitude);
          setLocationLabel(label);
        } catch { setLocationLabel(null); }
        setLoading(false);
      },
      () => { setGeoBlocked(true); setLoading(false); },
      { timeout: 8000 }
    );
  }, [consentGiven]);

  // Initialize / update map when coords or radius changes
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return;
      const center = [coords.lat, coords.lng];
      const zoom = radiusMiles <= 5 ? 13 : radiusMiles <= 10 ? 12 : 11;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else {
        mapRef.current.setView(center, zoom);
      }

      // User pin
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2196F3;border:3px solid white;box-shadow:0 0 0 4px rgba(33,150,243,0.25);"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      markerRef.current = L.marker(center, { icon: userIcon, zIndexOffset: 1000, title: "You are here" }).addTo(mapRef.current);

      // Radius circle
      if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }
      circleRef.current = L.circle(center, {
        radius: radiusMiles * MILES_TO_METERS,
        color: "#3b82f6",
        weight: 2,
        opacity: 0.7,
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
      }).addTo(mapRef.current);
    });

    return () => { cancelled = true; };
  }, [coords, radiusMiles]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const q = manualInput.trim();
    if (!q) return;
    setGeocodeError("");
    setGeocoding(true);
    try {
      const result = await geocodeAddress(q);
      if (!result) {
        setGeocodeError("Location not found. Try a city name or ZIP code.");
        setGeocoding(false);
        return;
      }
      setCoords({ lat: result.lat, lng: result.lng });
      const label = await reverseGeocode(result.lat, result.lng);
      setLocationLabel(label || q);
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
      <div ref={containerRef} style={{ height: 320, width: "100%" }} />
      <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">Showing a {radiusMiles}-mile radius. Tap "Search Here" to find health inspection results nearby.</p>
      </div>
    </div>
  );
}