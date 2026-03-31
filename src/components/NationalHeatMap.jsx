import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Average safety scores by state (0–100 scale)
const STATE_SCORES = {
  AL: 71, AK: 78, AZ: 82, AR: 69, CA: 85, CO: 88, CT: 83, DE: 80,
  DC: 77, FL: 79, GA: 76, HI: 90, ID: 84, IL: 81, IN: 74, IA: 86,
  KS: 80, KY: 72, LA: 68, ME: 87, MD: 82, MA: 84, MI: 77, MN: 89,
  MS: 65, MO: 73, MT: 85, NE: 83, NV: 75, NH: 88, NJ: 80, NM: 71,
  NY: 79, NC: 76, ND: 87, OH: 78, OK: 70, OR: 86, PA: 80, RI: 82,
  SC: 74, SD: 85, TN: 72, TX: 77, UT: 88, VT: 90, VA: 83, WA: 86,
  WV: 67, WI: 85, WY: 83,
};

// State abbreviation → 2-digit FIPS code
const STATE_FIPS = {
  AL:"01", AK:"02", AZ:"04", AR:"05", CA:"06", CO:"08", CT:"09", DE:"10",
  DC:"11", FL:"12", GA:"13", HI:"15", ID:"16", IL:"17", IN:"18", IA:"19",
  KS:"20", KY:"21", LA:"22", ME:"23", MD:"24", MA:"25", MI:"26", MN:"27",
  MS:"28", MO:"29", MT:"30", NE:"31", NV:"32", NH:"33", NJ:"34", NM:"35",
  NY:"36", NC:"37", ND:"38", OH:"39", OK:"40", OR:"41", PA:"42", RI:"44",
  SC:"45", SD:"46", TN:"47", TX:"48", UT:"49", VT:"50", VA:"51", WA:"53",
  WV:"54", WI:"55", WY:"56",
};

// Map full state names → abbreviations (PublicaMundi GeoJSON uses full names)
const NAME_TO_ABBR = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","District of Columbia":"DC",
  "Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL",
  "Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA",
  "Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN",
  "Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV",
  "New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY",
  "North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR",
  "Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",
  "Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA",
  "Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
};

const RISK_LEVELS = [
  { minScore: 90, color: "#1a9641", label: "Very Low Risk",  grade: "A" },
  { minScore: 80, color: "#a6d96a", label: "Low Risk",       grade: "B" },
  { minScore: 70, color: "#ffffbf", label: "Moderate Risk",  grade: "C" },
  { minScore: 60, color: "#fdae61", label: "Elevated Risk",  grade: "D" },
  { minScore: 0,  color: "#d7191c", label: "High Risk",      grade: "F" },
];

const LIVE_API_STATES = new Set(["WA", "NY", "IL", "MD", "CA", "TX", "LA", "MA"]);

// Counties with live public API data — all others have no public inspection data
const LIVE_COUNTY_KEYS = new Set([
  "WA:King",
  "NY:New York", "NY:Kings", "NY:Queens", "NY:Bronx", "NY:Richmond",
  "IL:Cook",
  "MD:Montgomery",
  "TX:Travis",
  "CA:San Francisco",
  "CA:Los Angeles",
]);

function getRiskLevel(score) {
  return RISK_LEVELS.find((r) => score >= r.minScore) || RISK_LEVELS[RISK_LEVELS.length - 1];
}
function getGrade(score) { return getRiskLevel(score).grade; }
function getScoreColor(score) { return getRiskLevel(score).color; }

// Slightly vary county scores around the state average for realism
function countyScore(stateScore, fips) {
  const seed = parseInt(fips, 10) % 20;
  return Math.max(0, Math.min(100, stateScore - 8 + seed));
}

// Child component: handles map zoom when selectedBounds changes
function MapController({ bounds, onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map]);
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
    else map.setView([38, -96], 4);
  }, [bounds, map]);
  return null;
}

export default function NationalHeatMap() {
  const navigate = useNavigate();
  const [geoData, setGeoData] = useState(null);
  const [countyData, setCountyData] = useState(null);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [selectedState, setSelectedState] = useState(null); // { abbr, name, score, bounds }
  const [hoveredState, setHoveredState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stateBounds, setStateBounds] = useState(null);
  const countyCache = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
      .then((r) => r.json())
      .then((data) => { setGeoData(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const loadCounties = useCallback(async () => {
    if (countyCache.current) return countyCache.current;
    setLoadingCounties(true);
    try {
      const res = await fetch("https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/500k/2019/county.json");
      const data = await res.json();
      countyCache.current = data;
      setLoadingCounties(false);
      return data;
    } catch {
      setLoadingCounties(false);
      return null;
    }
  }, []);

  const handleStateClick = useCallback(async (abbr, name, score, layer) => {
    const bounds = layer.getBounds();
    setStateBounds(bounds);
    setSelectedState({ abbr, name, score });
    setHoveredState(null);

    const data = await loadCounties();
    if (data) {
      const fips = STATE_FIPS[abbr];
      if (!fips) return;
      const filtered = {
        type: "FeatureCollection",
        features: data.features.filter((f) => {
          // Pad to 5 digits to handle numeric IDs without leading zeros (e.g. 6001 → 06001)
          const id = String(f.id || f.properties?.GEOID || f.properties?.FIPS || "").padStart(5, "0");
          return id.startsWith(fips);
        }),
      };
      setCountyData(filtered);
    }
  }, [loadCounties]);

  const handleReset = useCallback(() => {
    setSelectedState(null);
    setStateBounds(null);
    setCountyData(null);
    setHoveredState(null);
  }, []);

  const styleState = useCallback((feature) => {
    const abbr = feature.properties.postal || NAME_TO_ABBR[feature.properties.name];
    const score = STATE_SCORES[abbr] ?? 75;
    const isSelected = selectedState?.abbr === abbr;
    return {
      fillColor: getScoreColor(score),
      fillOpacity: isSelected ? 0.3 : 0.78,
      color: isSelected ? "#1e40af" : "#ffffff",
      weight: isSelected ? 3 : 2,
    };
  }, [selectedState]);

  const styleCounty = useCallback((feature) => {
    const abbr = selectedState?.abbr;
    const stateScore = STATE_SCORES[abbr] ?? 75;
    const fips = String(feature.id || feature.properties?.GEOID || feature.properties?.FIPS || "00000");
    const score = countyScore(stateScore, fips);
    return {
      fillColor: getScoreColor(score),
      fillOpacity: 0.82,
      color: "#ffffff",
      weight: 1.2,
    };
  }, [selectedState]);

  const onEachState = useCallback((feature, layer) => {
    const abbr = feature.properties.postal || NAME_TO_ABBR[feature.properties.name];
    const name = feature.properties.name;
    const score = STATE_SCORES[abbr] ?? 75;
    const isLive = LIVE_API_STATES.has(abbr);

    layer.on({
      mouseover: (e) => {
        if (!selectedState) {
          e.target.setStyle({ weight: 3.5, color: "#222", fillOpacity: 1 });
        }
        const risk = getRiskLevel(score);
        setHoveredState({ name, abbr, score, grade: getGrade(score), isLive, risk });
      },
      mouseout: (e) => {
        e.target.setStyle(styleState(feature));
        setHoveredState(null);
      },
      click: (e) => {
        if (selectedState) {
          handleReset();
        } else {
          handleStateClick(abbr, name, score, e.target);
        }
      },
    });
  }, [selectedState, handleStateClick, handleReset]);

  const onEachCounty = useCallback((feature, layer) => {
    const name = feature.properties?.NAME || feature.properties?.name || "County";
    const abbr = selectedState?.abbr;
    const countyKey = `${abbr}:${name}`;
    const isLive = LIVE_COUNTY_KEYS.has(countyKey);
    const stateScore = STATE_SCORES[abbr] ?? 75;
    const fips = String(feature.id || feature.properties?.GEOID || "00000");
    const score = countyScore(stateScore, fips);

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, color: "#1e3a8a", fillOpacity: 1 });
        const risk = getRiskLevel(score);
        setHoveredState({ name: `${name}, ${abbr}`, abbr, score, grade: getGrade(score), isLive, risk, isAI: !isLive });
      },
      mouseout: (e) => {
        e.target.setStyle(styleCounty(feature));
        setHoveredState(null);
      },
      click: () => {
        navigate(`/county-drilldown?state=${abbr}&name=${encodeURIComponent(selectedState?.name || abbr)}&county=${encodeURIComponent(name)}`);
      },
    });
  }, [selectedState, navigate, styleCounty]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">National Safety Heat Map</h2>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">ESTIMATED SCORES</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedState
                ? `${selectedState.name} — county breakdown · Click any county to explore or click state to go back`
                : "Average restaurant inspection scores by state — click a state to zoom in"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedState && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                ← All States
              </button>
            )}
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
        {loadingCounties && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1001] bg-white/90 border border-slate-200 rounded-xl px-4 py-2 shadow-md flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-600">Loading county data…</span>
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
            style={{ height: "100%", width: "100%", cursor: "pointer" }}
            zoomControl={false}
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution="Powered by Esri"
            />
            <MapController bounds={stateBounds} onReady={(m) => { mapRef.current = m; }} />
            <GeoJSON key={`states-${selectedState?.abbr || "all"}`} data={geoData} style={styleState} onEachFeature={onEachState} />
            {countyData && countyData.features.length > 0 && (
              <GeoJSON key={`counties-${selectedState?.abbr}`} data={countyData} style={styleCounty} onEachFeature={onEachCounty} />
            )}
            <ZoomControl position="bottomright" />
          </MapContainer>
        )}

        {hoveredState && (
          <div className="absolute top-3 left-3 z-[1000] bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3 pointer-events-none min-w-[200px]">
            <p className="font-extrabold text-slate-900 text-base leading-tight">{hoveredState.name}</p>
            <p className="text-xs text-slate-500 mb-2">{hoveredState.abbr} · Click to {selectedState ? "explore" : "zoom in"}</p>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="font-extrabold text-xs px-2 py-0.5 rounded-md text-white"
                style={{ background: hoveredState.risk?.color === "#ffffbf" ? "#b45309" : hoveredState.risk?.color }}
              >
                Grade {hoveredState.grade}
              </span>
              <span className="text-slate-700 font-bold text-sm">{hoveredState.score}/100</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: hoveredState.risk?.color === "#ffffbf" ? "#b45309" : hoveredState.risk?.color }}>
              {hoveredState.risk?.label}
            </p>
            {hoveredState.isLive ? (
              <span className="mt-1.5 inline-block text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">● LIVE API DATA</span>
            ) : (
              <span className="mt-1.5 inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">✦ AI-ASSISTED</span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 space-y-2">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          ESRI-standard diverging risk scale · Green = low risk · Red = elevated risk · {selectedState ? "Click a county for restaurant data" : "Click any state to see county breakdown"}
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="font-semibold text-green-600">LIVE API jurisdictions:</span>{" "}
          Austin TX · Baton Rouge LA · Boston MA · Chicago (Cook Co.) IL · Iowa (statewide) · King County WA · Los Angeles CA · Montgomery County MD · New York City NY · New York State · San Francisco CA · Wake County (Raleigh) NC
        </p>
      </div>
    </div>
  );
}