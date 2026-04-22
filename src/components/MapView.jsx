import React, { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import ScoreGauge from "./ScoreGauge";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ESRI diverging color ramp
function getEsriColor(score) {
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

function createColoredIcon(score, isSelected = false) {
  const bg = getEsriColor(score);
  const text = getTextColor(score);
  const grade = getGradeLetter(score);
  const size = isSelected ? 48 : 38;
  const borderWidth = isSelected ? 4 : 3;
  const fontSize = isSelected ? 16 : 13;
  const pulseRing = isSelected
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:3px solid ${bg};opacity:0.5;animation:marker-pulse 1.8s infinite ease-in-out;"></div>`
    : "";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${pulseRing}
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50% 50% 50% 0;
        background:${bg};
        transform:rotate(-45deg);
        border:${borderWidth}px solid white;
        box-shadow:0 4px 14px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="transform:rotate(45deg);color:${text};font-weight:900;font-size:${fontSize}px;font-family:Nunito,sans-serif;">
          ${grade}
        </div>
      </div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "user-location-marker",
    html: `<div style="position:relative;width:28px;height:28px;">
      <div style="
        position:absolute;inset:-8px;border-radius:50%;
        background:rgba(33,150,243,0.2);
        animation:marker-pulse 2s infinite ease-in-out;
      "></div>
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:#2196F3;border:4px solid white;
        box-shadow:0 3px 12px rgba(33,150,243,0.6);
      "></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Auto-fits bounds to all markers; also pans to userCoords when no restaurants
function MapController({ validRestaurants, userCoords, selectedId }) {
  const map = useMap();
  const prevKeyRef = useRef(null);

  useEffect(() => {
    const key = validRestaurants.map(r => `${r.latitude},${r.longitude}`).join("|");
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    if (validRestaurants.length > 0) {
      const bounds = L.latLngBounds(
        validRestaurants.map(r => [parseFloat(r.latitude), parseFloat(r.longitude)])
      );
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 1.2 });
    } else if (userCoords) {
      map.flyTo([userCoords.lat, userCoords.lng], 13, { duration: 1.0 });
    }
  }, [validRestaurants.map(r => `${r.latitude},${r.longitude}`).join("|")]);

  // Pan to selected restaurant
  useEffect(() => {
    if (!selectedId) return;
    const r = validRestaurants.find(x => x.business_id === selectedId);
    if (r?.latitude && r?.longitude) {
      map.flyTo([parseFloat(r.latitude), parseFloat(r.longitude)], 16, { duration: 0.8 });
    }
  }, [selectedId]);

  return null;
}

export default function MapView({ restaurants, onSelectRestaurant, onFilterByGrade, userCoords, selectedId }) {
  const initialCenter = useMemo(() => {
    if (userCoords) return [userCoords.lat, userCoords.lng];
    const valid = restaurants.filter(r => r.latitude && r.longitude);
    if (valid.length > 0) {
      const avgLat = valid.reduce((s, r) => s + parseFloat(r.latitude), 0) / valid.length;
      const avgLon = valid.reduce((s, r) => s + parseFloat(r.longitude), 0) / valid.length;
      return [avgLat, avgLon];
    }
    return [47.6062, -122.3321];
  }, []);

  const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);
  const userIcon = useMemo(() => createUserIcon(), []);

  return (
    <div className="rounded-3xl overflow-hidden border-2 border-slate-200 shadow-lg" style={{ height: 520 }}>
      <MapContainer
        center={initialCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <MapController validRestaurants={validRestaurants} userCoords={userCoords} selectedId={selectedId} />

        {/* ESRI World Street Map tile layer */}
        <TileLayer
          attribution='Powered by <a href="https://www.esri.com/en-us/home" target="_blank">Esri</a> | Sources: Esri, HERE, Garmin'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />

        {/* User location marker with accuracy circle */}
        {userCoords && (
          <>
            <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon} />
            <Circle
              center={[userCoords.lat, userCoords.lng]}
              radius={400}
              pathOptions={{ color: "#2196F3", fillColor: "#2196F3", fillOpacity: 0.08, weight: 1.5, dashArray: "6 4" }}
            />
          </>
        )}

        {validRestaurants.map((restaurant) => {
          const isSelected = restaurant.business_id === selectedId;
          const grade = getGradeLetter(restaurant.safetyScore);
          return (
            <Marker
              key={`${restaurant.business_id}-${restaurant.latitude}`}
              position={[parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)]}
              icon={createColoredIcon(restaurant.safetyScore, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => {
                  if (onFilterByGrade) onFilterByGrade(grade === "?" ? null : grade);
                }
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}