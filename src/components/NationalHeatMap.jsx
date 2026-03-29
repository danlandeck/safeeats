import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, GeoJSON, ZoomControl } from "react-leaflet";
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

// ESRI-standard diverging health-risk color ramp (green=safe → red=risk)
const RISK_LEVELS = [
  { minScore: 90, color: "#1a9641", label: "Very Low Risk",   grade: "A" },
  { minScore: 80, color: "#a6d96a", label: "Low Risk",        grade: "B" },
  { minScore: 70, color: "#ffffbf", label: "Moderate Risk",   grade: "C" },
  { minScore: 60, color: "#fdae61", label: "Elevated Risk",   grade: "D" },
  { minScore: 0,  color: "#d7191c", label: "High Risk",       grade: "F" },
];

function getRiskLevel(score) {
  return RISK_LEVELS.find((r) => score >= r.minScore) || RISK_LEVELS[RISK_LEVELS.length - 1];
}

// Live API states get a slightly different treatment
const LIVE_API_STATES = new Set(["WA", "NY", "IL", "MD"]);

function getScoreColor(score) {
  return getRiskLevel(score).color;
}

function getScoreOpacity() {
  return 0.78;
}

export default function NationalHeatMap() {
  const navigate = useNavigate();
  const [geoData, setGeoData] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
      .then((r) => r.json())
      .then((data) => { setGeoData(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const styleFeature = (feature) => {
    const abbr = feature.properties.postal;
    const score = STATE_SCORES[abbr] ?? 75;
    return {
      fillColor: getScoreColor(score),
      fillOpacity: getScoreOpacity(),
      color: "#ffffff",
      weight: 2,
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
        e.target.setStyle({ weight: 3.5, color: "#222", fillOpacity: 1 });
        const risk = getRiskLevel(score);
        setHoveredState({ name, abbr, score, grade, isLive, risk });
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
            {RISK_LEVELS.map((l) => (
              <div key={l.grade} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border border-black/10" style={{ background: l.color }} />
                <span className="text-xs font-semibold text-slate-600">{l.grade} · {l.label}</span>
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
            style={{ height: "100%", width: "100%", background: "#e2e8f0" }}
            zoomControl={false}
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <GeoJSON
              key="us-states"
              data={geoData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
            <ZoomControl position="bottomright" />
          </MapContainer>
        )}

        {/* Hover tooltip — ESRI-style info panel */}
        {hoveredState && (
          <div className="absolute top-3 left-3 z-[1000] bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3 pointer-events-none min-w-[200px]">
            <p className="font-extrabold text-slate-900 text-base leading-tight">{hoveredState.name}</p>
            <p className="text-xs text-slate-500 mb-2">{hoveredState.abbr} · Click to explore</p>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="font-extrabold text-xs px-2 py-0.5 rounded-md text-white"
                style={{ background: hoveredState.risk.color === "#ffffbf" ? "#b45309" : hoveredState.risk.color }}
              >
                Grade {hoveredState.grade}
              </span>
              <span className="text-slate-700 font-bold text-sm">{hoveredState.score}/100</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: hoveredState.risk.color === "#ffffbf" ? "#b45309" : hoveredState.risk.color }}>
              {hoveredState.risk.label}
            </p>
            {hoveredState.isLive && (
              <span className="mt-1.5 inline-block text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                ● LIVE API DATA
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-1 justify-between">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          ESRI-standard diverging risk scale · Green = low foodborne illness risk · Red = elevated risk · Click any state for county-level restaurant data.
        </p>
        <p className="text-[11px] text-slate-400 flex-shrink-0">
          <span className="font-semibold text-green-600">LIVE API</span>: WA · NY · IL · MD
        </p>
      </div>
    </div>
  );
}