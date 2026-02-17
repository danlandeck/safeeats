import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

// Create custom colored markers based on safety score
function createColoredIcon(score) {
  const colors = getScoreColor(score);
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      background: ${colors.hex};
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">${score}</div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function MapView({ restaurants, onSelectRestaurant }) {
  // Calculate center from all restaurants
  const center = useMemo(() => {
    if (restaurants.length === 0) return [47.6062, -122.3321]; // Seattle default
    const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);
    if (validRestaurants.length === 0) return [47.6062, -122.3321];
    
    const avgLat = validRestaurants.reduce((sum, r) => sum + parseFloat(r.latitude), 0) / validRestaurants.length;
    const avgLon = validRestaurants.reduce((sum, r) => sum + parseFloat(r.longitude), 0) / validRestaurants.length;
    return [avgLat, avgLon];
  }, [restaurants]);

  const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);

  return (
    <div className="h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validRestaurants.map((restaurant) => (
          <Marker
            key={restaurant.business_id}
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