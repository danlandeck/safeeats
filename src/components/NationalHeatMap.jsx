import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { REGIONS } from "../utils/regions";
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ─── Safety scores by ISO-3166-1 alpha-3 (country level) ───────────────────
const COUNTRY_SCORES = {
  USA:83, CAN:88, GBR:87, AUS:89, NZL:90, DEU:86, FRA:84, NLD:87,
  BEL:83, CHE:90, AUT:86, SWE:91, NOR:92, DNK:91, FIN:90, IRL:86,
  ESP:81, ITA:79, PRT:82, GRC:74, POL:77, CZE:78, SVK:76, HUN:75,
  ROU:70, BGR:68, HRV:72, SRB:66, BIH:64, MKD:63, ALB:62, MNE:65,
  SVN:80, EST:79, LVA:77, LTU:76, LUX:88, ISL:91, MLT:78, CYP:75,
  JPN:92, SGP:94, KOR:88, CHN:71, HKG:91, TWN:87, VNM:65, THA:68,
  PHL:60, IDN:62, MYS:70, MMR:55, LAO:52, KHM:58, BGD:56, IND:63,
  PAK:55, LKA:64, NPL:58, BRN:75, TLS:50,
  BRA:72, ARG:74, CHL:78, COL:68, PER:64, VEN:52, ECU:66, BOL:60,
  PRY:62, URY:77, GUY:58, SUR:60,
  MEX:71, GTM:60, BLZ:62, HND:58, SLV:60, NIC:56, CRI:72, PAN:68,
  CUB:70, JAM:65, DOM:64, HTI:45, TTO:66, BHS:72, BRB:74,
  ZAF:70, KEN:62, ETH:54, TZA:58, UGA:55, GHA:60, NGA:56, CMR:52,
  CIV:55, SEN:60, MOZ:50, ZMB:54, ZWE:52, MWI:50, MDG:48, RWA:60,
  EGY:68, MAR:70, TUN:72, DZA:65, LBY:50, SDN:46, SOM:38,
  SAU:74, ARE:80, QAT:78, KWT:75, BHR:76, OMN:74, JOR:70, ISR:84,
  LBN:60, SYR:42, IRQ:50, IRN:62, AFG:38, YEM:40,
  RUS:66, UKR:64, BLR:65, KAZ:62, UZB:60, TKM:58, KGZ:56, TJK:54,
  AZE:64, GEO:68, ARM:66, MDA:62,
  TUR:71, NOR:92, ISL:91,
};

// US state name → abbr
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

const STATE_SCORES = {
  AL:71,AK:78,AZ:82,AR:69,CA:85,CO:88,CT:83,DE:80,DC:77,FL:79,GA:76,
  HI:90,ID:84,IL:81,IN:74,IA:86,KS:80,KY:72,LA:68,ME:87,MD:82,MA:84,
  MI:77,MN:89,MS:65,MO:73,MT:85,NE:83,NV:75,NH:88,NJ:80,NM:71,NY:79,
  NC:76,ND:87,OH:78,OK:70,OR:86,PA:80,RI:82,SC:74,SD:85,TN:72,TX:77,
  UT:88,VT:90,VA:83,WA:86,WV:67,WI:85,WY:83,
};

// Region key → map focus [lat, lng, zoom]
const REGION_VIEW = {
  // US states → zoom into US
  default_us: [38, -96, 4],
  // International
  canada:      [56, -96, 4],
  uk:          [54, -2, 6],
  france:      [46.5, 2.5, 6],
  germany:     [51, 10, 6],
  spain:       [40, -3, 6],
  italy:       [42, 12.5, 6],
  netherlands: [52.4, 5.3, 7],
  portugal:    [39.5, -8, 7],
  greece:      [39, 22, 6],
  turkey:      [39, 35, 6],
  japan:       [36, 138, 5],
  south_korea: [36, 128, 7],
  china:       [35, 105, 4],
  india:       [21, 79, 5],
  uae:         [24, 54, 7],
  singapore:   [1.35, 103.8, 11],
  thailand:    [13, 101, 6],
  australia:   [-25, 134, 4],
  new_zealand: [-41, 174, 6],
  brazil:      [-15, -52, 4],
  argentina:   [-34, -64, 4],
  mexico:      [23, -102, 5],
  south_africa:[29, 25, 5],
};

const RISK_LEVELS = [
  { minScore: 90, color: "#1a9641", label: "Very Low Risk", grade: "A" },
  { minScore: 80, color: "#a6d96a", label: "Low Risk",      grade: "B" },
  { minScore: 70, color: "#ffffbf", label: "Moderate Risk", grade: "C" },
  { minScore: 60, color: "#fdae61", label: "Elevated Risk", grade: "D" },
  { minScore: 0,  color: "#d7191c", label: "High Risk",     grade: "F" },
];

function getRisk(score) { return RISK_LEVELS.find(r => score >= r.minScore) || RISK_LEVELS[RISK_LEVELS.length-1]; }
function getColor(score) { return getRisk(score).color; }
function getGrade(score) { return getRisk(score).grade; }

// Derive if the selected region is a US state (not international)
const INTL_KEYS = new Set([
  "canada","uk","mexico","australia","france","germany","spain","italy","japan",
  "brazil","india","south_korea","china","uae","singapore","netherlands","portugal",
  "new_zealand","argentina","thailand","greece","turkey","south_africa",
]);

function MapController({ view }) {
  const map = useMap();
  useEffect(() => {
    if (view) map.setView([view[0], view[1]], view[2], { animate: true });
  }, [view, map]);
  return null;
}

export default function NationalHeatMap({ region, onNavigate }) {
  const navigate = useNavigate();
  const [worldGeo, setWorldGeo] = useState(null);
  const [usGeo, setUsGeo] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [loading, setLoading] = useState(true);
  const isIntl = INTL_KEYS.has(region);

  // Determine map view
  const mapView = REGION_VIEW[region] || REGION_VIEW["default_us"];

  useEffect(() => {
    // Always load world GeoJSON
    fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      .then(r => r.json())
      .then(d => { setWorldGeo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Lazy-load US states GeoJSON only when needed
    if (!isIntl && !usGeo) {
      fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
        .then(r => r.json())
        .then(d => setUsGeo(d))
        .catch(() => {});
    }
  }, [isIntl]);

  const styleWorld = useCallback((feature) => {
    const iso = feature.properties?.ISO_A3;
    const score = COUNTRY_SCORES[iso] ?? 65;
    return {
      fillColor: getColor(score),
      fillOpacity: 0.78,
      color: "#fff",
      weight: 0.8,
    };
  }, []);

  const styleUS = useCallback((feature) => {
    const abbr = feature.properties?.postal || NAME_TO_ABBR[feature.properties?.name];
    const score = STATE_SCORES[abbr] ?? 75;
    return {
      fillColor: getColor(score),
      fillOpacity: 0.82,
      color: "#fff",
      weight: 1.5,
    };
  }, []);

  const onEachWorld = useCallback((feature, layer) => {
    const name = feature.properties?.ADMIN || feature.properties?.name || "Country";
    const iso = feature.properties?.ISO_A3;
    const score = COUNTRY_SCORES[iso] ?? 65;
    const risk = getRisk(score);

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, color: "#222", fillOpacity: 1 });
        setHovered({ name, score, grade: getGrade(score), risk, type: "country" });
      },
      mouseout: (e) => {
        e.target.setStyle(styleWorld(feature));
        setHovered(null);
      },
    });
  }, [styleWorld]);

  const onEachUS = useCallback((feature, layer) => {
    const abbr = feature.properties?.postal || NAME_TO_ABBR[feature.properties?.name];
    const name = feature.properties?.name || abbr;
    const score = STATE_SCORES[abbr] ?? 75;
    const risk = getRisk(score);

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, color: "#1e3a8a", fillOpacity: 1 });
        setHovered({ name, score, grade: getGrade(score), risk, type: "state", abbr });
      },
      mouseout: (e) => {
        e.target.setStyle(styleUS(feature));
        setHovered(null);
      },
      click: () => {
        if (onNavigate && abbr) {
          const match = Object.entries(REGIONS).find(([, r]) => r.abbr === abbr);
          if (match) onNavigate(match[0]);
        }
      },
    });
  }, [styleUS, onNavigate]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {isIntl ? "Global Safety Heat Map" : "National Safety Heat Map"}
              </h2>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">ESTIMATED</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {isIntl
                ? "Estimated restaurant safety scores by country · select a region to search"
                : "Average restaurant inspection scores by state · click a state to explore"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {RISK_LEVELS.map(l => (
              <div key={l.grade} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border border-black/10" style={{ background: l.color }} />
                <span className="text-xs font-semibold text-slate-600">{l.grade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: 420 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && worldGeo && (
          <MapContainer
            center={[mapView[0], mapView[1]]}
            zoom={mapView[2]}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
            <MapController view={mapView} />
            <GeoJSON key="world" data={worldGeo} style={styleWorld} onEachFeature={onEachWorld} />
            {!isIntl && usGeo && (
              <GeoJSON key="us-states" data={usGeo} style={styleUS} onEachFeature={onEachUS} />
            )}
            <ZoomControl position="bottomright" />
          </MapContainer>
        )}

        {hovered && (
          <div className="absolute top-3 left-3 z-[1000] bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3 pointer-events-none min-w-[190px]">
            <p className="font-extrabold text-slate-900 text-base leading-tight">{hovered.name}</p>
            <p className="text-xs text-slate-500 mb-2">{hovered.type === "state" ? "U.S. State" : "Country"}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-extrabold text-xs px-2 py-0.5 rounded-md text-white"
                style={{ background: hovered.risk?.color === "#ffffbf" ? "#b45309" : hovered.risk?.color }}>
                Grade {hovered.grade}
              </span>
              <span className="text-slate-700 font-bold text-sm">{hovered.score}/100</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: hovered.risk?.color === "#ffffbf" ? "#b45309" : hovered.risk?.color }}>
              {hovered.risk?.label}
            </p>
            <span className="mt-1.5 inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">✦ AI-ASSISTED</span>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[11px] text-slate-400">
          ESRI diverging risk scale · scores are AI-estimated from publicly available health department data · not a substitute for official inspections
        </p>
      </div>
    </div>
  );
}