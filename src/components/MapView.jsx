import React, { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { getScoreColor } from "./ScoreGauge";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ESRI diverging color ramp (matches NationalHeatMap)
function getEsriColor(score) {
  if (score >= 90) return "#1a9641";
  if (score >= 80) return "#a6d96a";
  if (score >= 70) return "#ffffbf";
  if (score >= 60) return "#fdae61";
  return "#d7191c";
}

function getTextColor(score) {
  return score >= 70 && score < 80 ? "#555" : "#fff";
}

function createColoredIcon(score) {
  const bg = getEsriColor(score);
  const text = getTextColor(score);
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      background: ${bg};
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: ${text};
        font-weight: 800;
        font-size: 11px;
        letter-spacing: -0.5px;
      ">${score}</div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

// Auto-pans/zooms map when results or user location changes
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center[0], center[1], zoom]);
  return null;
}

export default function MapView({ restaurants, onSelectRestaurant, userCoords }) {
  const { center, zoom } = useMemo(() => {
    const valid = restaurants.filter(r => r.latitude && r.longitude);
    if (valid.length > 0) {
      const avgLat = valid.reduce((s, r) => s + parseFloat(r.latitude), 0) / valid.length;
      const avgLon = valid.reduce((s, r) => s + parseFloat(r.longitude), 0) / valid.length;
      return { center: [avgLat, avgLon], zoom: valid.length === 1 ? 15 : 13 };
    }
    if (userCoords) return { center: [userCoords.lat, userCoords.lng], zoom: 12 };
    return { center: [47.6062, -122.3321], zoom: 11 }; // Seattle default
  }, [restaurants, userCoords]);

  const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);

  return (
    <div className="h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} />
        <TileLayer
          attribution='Powered by <a href="https://www.esri.com">Esri</a> | Sources: Esri, HERE, Garmin, FAO, NOAA, USGS'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        {validRestaurants.map((restaurant) => (
          <Marker
            key={`${restaurant.business_id}-${restaurant.latitude}`}
            position={[parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)]}
            icon={createColoredIcon(restaurant.safetyScore)}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                <div className="flex items-start gap-3 mb-3">
                  <ScoreGauge score={restaurant.safetyScore} size="sm" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-900 leading-tight">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {restaurant.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {restaurant.latestResult && (
                    <Badge variant="outline" className="text-[10px]">
                      {restaurant.latestResult}
                    </Badge>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {restaurant.totalInspections} inspection{restaurant.totalInspections !== 1 ? "s" : ""}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onSelectRestaurant(restaurant)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                >
                  View Details
                  <ExternalLink className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}