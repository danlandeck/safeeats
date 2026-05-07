import React, { useEffect, useRef, useMemo } from "react";

function getScoreColor(score) {
  if (score === null || score === undefined) return "#94a3b8";
  if (score >= 90) return "#1a9641";
  if (score >= 80) return "#a6d96a";
  if (score >= 70) return "#ffffbf";
  if (score >= 60) return "#fdae61";
  return "#d7191c";
}

function getTextColor(score) {
  if (score === null || score === undefined) return "#fff";
  return score >= 70 && score < 80 ? "#555" : "#fff";
}

function getGradeLetter(score) {
  if (score === null || score === undefined) return "?";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function makeMarkerIcon(L, score, isSelected) {
  const bg = getScoreColor(score);
  const textColor = getTextColor(score);
  const grade = getGradeLetter(score);
  const size = isSelected ? 48 : 38;
  const fontSize = isSelected ? 16 : 13;
  const totalH = size + 10;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${totalH}" viewBox="0 0 ${size} ${totalH}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${bg}" stroke="white" stroke-width="3"/>
      <polygon points="${size/2-6},${size-2} ${size/2+6},${size-2} ${size/2},${totalH}" fill="${bg}"/>
      <text x="${size/2}" y="${size/2+fontSize/3}" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="${fontSize}" fill="${textColor}">${grade}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, totalH],
    iconAnchor: [size / 2, totalH],
    popupAnchor: [0, -totalH],
  });
}

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

// Lazy-load Leaflet JS once
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

export default function MapView({ restaurants, onSelectRestaurant, onFilterByGrade, userCoords, selectedId }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);

  const validRestaurants = useMemo(
    () => restaurants.filter(r => r.latitude && r.longitude),
    [restaurants]
  );

  const initialCenter = useMemo(() => {
    if (userCoords) return [userCoords.lat, userCoords.lng];
    if (validRestaurants.length > 0) {
      const avgLat = validRestaurants.reduce((s, r) => s + parseFloat(r.latitude), 0) / validRestaurants.length;
      const avgLng = validRestaurants.reduce((s, r) => s + parseFloat(r.longitude), 0) / validRestaurants.length;
      return [avgLat, avgLng];
    }
    return [47.6062, -122.3321];
  }, []);

  // Initialize map once
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(initialCenter, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    });
    return () => { cancelled = true; };
  }, []);

  // Sync restaurant markers
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    validRestaurants.forEach((restaurant) => {
      const isSelected = restaurant.business_id === selectedId;
      const grade = getGradeLetter(restaurant.safetyScore);
      const latlng = [parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)];

      const marker = L.marker(latlng, {
        icon: makeMarkerIcon(L, restaurant.safetyScore, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
        title: restaurant.name,
      }).addTo(mapRef.current);

      const popupContent = `
        <div style="font-family:Nunito,sans-serif;padding:4px 2px;min-width:160px;">
          <p style="font-weight:900;font-size:14px;margin:0 0 4px 0;color:#0f172a;">${restaurant.name}</p>
          <p style="font-size:12px;color:#64748b;margin:0 0 4px 0;">${[restaurant.address, restaurant.city].filter(Boolean).join(", ")}</p>
          <p style="font-size:12px;font-weight:800;color:${getScoreColor(restaurant.safetyScore)};margin:0;">
            Grade ${grade}${restaurant.safetyScore != null ? ` · ${restaurant.safetyScore}/100` : ""}
          </p>
        </div>`;
      marker.bindPopup(popupContent);

      marker.on("click", () => {
        if (onFilterByGrade) onFilterByGrade(grade === "?" ? null : grade);
        if (onSelectRestaurant) onSelectRestaurant(restaurant);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (validRestaurants.length > 1) {
      const bounds = validRestaurants.map(r => [parseFloat(r.latitude), parseFloat(r.longitude)]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    } else if (validRestaurants.length === 1) {
      mapRef.current.setView([parseFloat(validRestaurants[0].latitude), parseFloat(validRestaurants[0].longitude)], 15);
    } else if (userCoords) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], 13);
    }
  }, [validRestaurants, selectedId]);

  // Pan to selected restaurant
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const r = validRestaurants.find(x => x.business_id === selectedId);
    if (r?.latitude && r?.longitude) {
      mapRef.current.setView([parseFloat(r.latitude), parseFloat(r.longitude)], 16);
    }
  }, [selectedId]);

  // User location marker + accuracy circle
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (userCircleRef.current) { userCircleRef.current.remove(); userCircleRef.current = null; }

    if (userCoords) {
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2196F3;border:3px solid white;box-shadow:0 0 0 3px rgba(33,150,243,0.3);"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 2000, title: "Your location" }).addTo(mapRef.current);
      userCircleRef.current = L.circle([userCoords.lat, userCoords.lng], {
        radius: 400,
        color: "#2196F3",
        weight: 1.5,
        opacity: 0.5,
        fillColor: "#2196F3",
        fillOpacity: 0.08,
      }).addTo(mapRef.current);
    }
  }, [userCoords]);

  return (
    <div className="rounded-3xl overflow-hidden border-2 border-slate-200 shadow-lg" style={{ height: 520 }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}