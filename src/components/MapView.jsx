import React, { useEffect, useRef, useMemo } from "react";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

// Color ramp matching previous Leaflet implementation
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

// Load the Google Maps script once
let _loadPromise = null;
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (_loadPromise) return _loadPromise;
  _loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return _loadPromise;
}

// Build a custom pin SVG as a data URL for AdvancedMarkerElement or fallback Marker icon
function makeMarkerSvg(score, isSelected) {
  const bg = getScoreColor(score);
  const textColor = getTextColor(score);
  const grade = getGradeLetter(score);
  const size = isSelected ? 48 : 38;
  const fontSize = isSelected ? 16 : 13;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${bg}" stroke="white" stroke-width="3"/>
      <polygon points="${size / 2 - 6},${size - 2} ${size / 2 + 6},${size - 2} ${size / 2},${size + 10}" fill="${bg}"/>
      <text x="${size / 2}" y="${size / 2 + fontSize / 3}" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="${fontSize}" fill="${textColor}">${grade}</text>
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

export default function MapView({ restaurants, onSelectRestaurant, onFilterByGrade, userCoords, selectedId }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);
  const infoWindowRef = useRef(null);

  const validRestaurants = useMemo(
    () => restaurants.filter(r => r.latitude && r.longitude),
    [restaurants]
  );

  const initialCenter = useMemo(() => {
    if (userCoords) return { lat: userCoords.lat, lng: userCoords.lng };
    if (validRestaurants.length > 0) {
      const avgLat = validRestaurants.reduce((s, r) => s + parseFloat(r.latitude), 0) / validRestaurants.length;
      const avgLng = validRestaurants.reduce((s, r) => s + parseFloat(r.longitude), 0) / validRestaurants.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 47.6062, lng: -122.3321 };
  }, []);

  // Initialize map once
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center: initialCenter,
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    });
    return () => { cancelled = true; };
  }, []);

  // Sync restaurant markers whenever validRestaurants or selectedId changes
  useEffect(() => {
    if (!mapRef.current) return;
    const google = window.google;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    validRestaurants.forEach((restaurant) => {
      const isSelected = restaurant.business_id === selectedId;
      const grade = getGradeLetter(restaurant.safetyScore);
      const pos = { lat: parseFloat(restaurant.latitude), lng: parseFloat(restaurant.longitude) };

      const marker = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon: {
          url: makeMarkerSvg(restaurant.safetyScore, isSelected),
          scaledSize: new google.maps.Size(isSelected ? 48 : 38, isSelected ? 58 : 48),
          anchor: new google.maps.Point(isSelected ? 24 : 19, isSelected ? 58 : 48),
        },
        zIndex: isSelected ? 1000 : 1,
        title: restaurant.name,
      });

      marker.addListener("click", () => {
        if (onFilterByGrade) onFilterByGrade(grade === "?" ? null : grade);
        if (onSelectRestaurant) onSelectRestaurant(restaurant);

        const content = `
          <div style="font-family:Nunito,sans-serif;padding:4px 2px;min-width:160px;">
            <p style="font-weight:900;font-size:14px;margin:0 0 4px 0;color:#0f172a;">${restaurant.name}</p>
            <p style="font-size:12px;color:#64748b;margin:0 0 4px 0;">${[restaurant.address, restaurant.city].filter(Boolean).join(", ")}</p>
            <p style="font-size:12px;font-weight:800;color:${getScoreColor(restaurant.safetyScore)};margin:0;">
              Grade ${grade}${restaurant.safetyScore != null ? ` · ${restaurant.safetyScore}/100` : ""}
            </p>
          </div>`;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (validRestaurants.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      validRestaurants.forEach(r => bounds.extend({ lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) }));
      mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else if (validRestaurants.length === 1) {
      mapRef.current.setCenter({ lat: parseFloat(validRestaurants[0].latitude), lng: parseFloat(validRestaurants[0].longitude) });
      mapRef.current.setZoom(15);
    } else if (userCoords) {
      mapRef.current.setCenter({ lat: userCoords.lat, lng: userCoords.lng });
      mapRef.current.setZoom(13);
    }
  }, [validRestaurants, selectedId]);

  // Pan to selected restaurant
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const r = validRestaurants.find(x => x.business_id === selectedId);
    if (r?.latitude && r?.longitude) {
      mapRef.current.panTo({ lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) });
      mapRef.current.setZoom(16);
    }
  }, [selectedId]);

  // User location marker + accuracy circle
  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    const google = window.google;

    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
    if (userCircleRef.current) { userCircleRef.current.setMap(null); userCircleRef.current = null; }

    if (userCoords) {
      userMarkerRef.current = new google.maps.Marker({
        position: { lat: userCoords.lat, lng: userCoords.lng },
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#2196F3",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        title: "Your location",
        zIndex: 2000,
      });

      userCircleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center: { lat: userCoords.lat, lng: userCoords.lng },
        radius: 400,
        strokeColor: "#2196F3",
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        fillColor: "#2196F3",
        fillOpacity: 0.08,
      });
    }
  }, [userCoords]);

  return (
    <div className="rounded-3xl overflow-hidden border-2 border-slate-200 shadow-lg" style={{ height: 520 }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}