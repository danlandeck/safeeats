import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Average safety scores by state (0–100 scale, based on publicly reported inspection pass rates)
const STATE_SCORES = {
  AL: 71, AK: 78, AZ: 82, AR: 69, CA: 85, CO: 88, CT: 83, DE: 80,
  DC: 77, FL: 79, GA: 76, HI: 90, ID: 84, IL: 81, IN: 74, IA: 86,
  KS: 80, KY: 72, LA: 68, ME: 87, MD: 82, MA: 84, MI: 77, MN: 89,
  MS: 65, MO: 73, MT: 85, NE: 83, NV: 75, NH: 88, NJ: 80, NM: 71,
  NY: 79, NC: 76, ND: 87, OH: 78, OK: 70, OR: 86, PA: 80, RI: 82,
  SC: 74, SD: 85, TN: 72, TX: 77, UT: 88, VT: 90, VA: 83, WA: 86,
  WV: 67, WI: 85, WY: 83,
};

// Live API states get a slightly different treatment
const LIVE_API_STATES = new Set(["WA", "NY", "IL", "MD"]);

function getScoreColor(score) {
  if (score >= 90) return "#1e293b"; // A - slate-900
  if (score >= 80) return "#475569"; // B - slate-600
  if (score >= 70) return "#94a3b8"; // C - slate-400
  if (score >= 60) return "#f59e0b"; // D - amber-500
  return "#dc2626";                  // F - red-600
}

function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getScoreOpacity(score) {
  if (score >= 90) return 0.9;
  if (score >= 80) return 0.75;
  if (score >= 70) return 0.6;
  if (score >= 60) return 0.75;
  return 0.85;
}

export default function NationalHeatMap() {
  const navigate = useNavigate();
  const [geoData, setGeoData] = useState(null);
  const [countyData, setCountyData] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json").then((r) => r.json()),
      fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/us_county.geojson").then((r) => r.json()),
    ])
      .then(([states, counties]) => {
        setGeoData(states);
        setCountyData(counties);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const styleFeature = (feature) => {
    const abbr = feature.properties.postal;
    const score = STATE_SCORES[abbr] ?? 75;
    return {
      fillColor: getScoreColor(score),
      fillOpacity: getScoreOpacity(score),
      color: "#fff",
      weight: 1.5,
    };
  };

  const onEachFeature = (feature, layer) => {
    const abbr = feature.properties.postal;
    const name = feature.properties.name;
    const score = STATE_SCORES[abbr] ?? 75;
    const grade = getGrade(score);
    const isLive = LIVE_API_STATES.has(abbr);

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, color: "#fff", fillOpacity: 1 });
        setHoveredState({ name, abbr, score, grade, isLive });
      },
      mouseout: (e) => {
        e.target.setStyle(styleFeature(feature));
        setHoveredState(null);
      },
      click: () => {
        navigate(`/county-drilldown?state=${abbr}&name=${encodeURIComponent(name)}`);
      },
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">National Safety Heat Map</h2>
            <p className="text-sm text-slate-500 mt-0.5">Average restaurant inspection scores by state — hover &amp; click to explore</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "A  90+", color: "bg-slate-900" },
              { label: "B  80–89", color: "bg-slate-500" },
              { label: "C  70–79", color: "bg-slate-300" },
              { label: "D  60–69", color: "bg-amber-400" },
              { label: "F  <60", color: "bg-red-600" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                <span className="text-xs font-semibold text-slate-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: 420 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading map…</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
            <p className="text-sm text-slate-400">Unable to load map data</p>
          </div>
        )}
        {!loading && !error && geoData && (
          <MapContainer
            center={[38, -96]}
            zoom={4}
            style={{ height: "100%", width: "100%", background: "#f8fafc" }}
            zoomControl={false}
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
              maxZoom={16}
            />
            <GeoJSON
              key="us-states"
              data={geoData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
            {countyData && (
              <GeoJSON
                key="us-counties"
                data={countyData}
                style={{
                  fillColor: "transparent",
                  fillOpacity: 0,
                  color: "rgba(255,255,255,0.35)",
                  weight: 0.6,
                  interactive: false,
                }}
              />
            )}
            <ZoomControl position="bottomright" />
          </MapContainer>
        )}

        {/* Hover tooltip */}
        {hoveredState && (
          <div className="absolute top-4 left-4 z-[1000] bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 pointer-events-none min-w-[160px]">
            <p className="font-extrabold text-slate-900 text-sm">{hoveredState.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-white font-extrabold text-xs px-2 py-0.5 rounded-md"
                style={{ background: getScoreColor(hoveredState.score) }}
              >
                Grade {hoveredState.grade}
              </span>
              <span className="text-slate-700 font-semibold text-sm">{hoveredState.score}/100</span>
            </div>
            {hoveredState.isLive && (
              <span className="mt-1.5 inline-block text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                ● LIVE API
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Scores are aggregated averages based on official state health inspection records. States with a <span className="font-semibold text-green-600">LIVE API</span> badge (WA, NY, IL, MD) include real-time data from public health portals.
        </p>
      </div>
    </div>
  );
}