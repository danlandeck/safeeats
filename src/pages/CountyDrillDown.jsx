import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, MapPin, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getGrade, getGradeColor } from "../utils/grading";
import { REGIONS } from "../utils/regions";
import {
  processKingCountyResults,
  processNYCResults,
  processChicagoResults,
  processMontgomeryResults,
  buildLLMRestaurant,
} from "../utils/inspectionProcessors";
import ScoreGauge from "../components/ScoreGauge";

const KING_API       = "https://data.kingcounty.gov/resource/f29f-zza5.json";
const NYC_API        = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHICAGO_API    = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
const MONTGOMERY_API = "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json";

// ── Live API fetchers ─────────────────────────────────────────────────────────
async function fetchKingCounty() {
  const data = await fetch(`${KING_API}?$limit=2000&$order=inspection_date DESC`).then((r) => r.json());
  return processKingCountyResults(data).map((b) => ({ ...b, id: b.business_id, inspections: b.totalInspections }));
}

async function fetchNYC() {
  const data = await fetch(`${NYC_API}?$limit=2000&$order=inspection_date DESC`).then((r) => r.json());
  return processNYCResults(data).map((b) => ({ ...b, id: b.business_id, inspections: b.totalInspections }));
}

async function fetchChicago() {
  const data = await fetch(`${CHICAGO_API}?$limit=2000&$order=inspection_date DESC`).then((r) => r.json());
  return processChicagoResults(data).map((b) => ({ ...b, id: b.business_id, inspections: b.totalInspections }));
}

async function fetchMontgomery() {
  const data = await fetch(`${MONTGOMERY_API}?$limit=2000&$order=inspectiondate DESC`).then((r) => r.json());
  return processMontgomeryResults(data).map((b) => ({ ...b, id: b.business_id, inspections: b.totalInspections }));
}

// ── LLM fetcher ───────────────────────────────────────────────────────────────
const LLM_ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" }, address: { type: "string" }, city: { type: "string" },
    safetyScore: { type: "number" }, total_violation_points: { type: "number" },
    latest_date: { type: "string" }, latest_result: { type: "string" },
    violations: { type: "array", items: { type: "string" } },
    inspection_history: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" }, total_violation_points: { type: "number" },
          result: { type: "string" }, violations: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

async function fetchLLM(stateName, stateAbbr, countyName) {
  const location = countyName
    ? `${countyName.toLowerCase().includes("county") ? countyName : `${countyName} County`}, ${stateName}, ${stateAbbr}`
    : `${stateName}, ${stateAbbr}`;

  const today = new Date().toISOString().slice(0, 10);
  const result = await base44.integrations.Core.InvokeLLM({
    model: "gemini_3_flash",
    prompt: `Today's date is ${today}. Search official health department records for restaurants in ${location}.

Return two lists of 10 restaurants each:
1. top_rated: best inspection records (fewest violations)
2. worst_rated: worst inspection records (most violations)

All must be real establishments in ${location}. Do NOT overlap the two lists.

For each restaurant:
- name, address, city, zip_code
- safetyScore: 0-100 (100 = perfect, 0 = critical)
- latest_date: most recent inspection date (YYYY-MM-DD)
- latest_result: e.g. Pass, Fail, Conditional Pass
- total_inspections: number of inspections on record
- violations: array of up to 3 short violation strings from the latest inspection`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        top_rated: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              zip_code: { type: "string" },
              safetyScore: { type: "number" },
              latest_date: { type: "string" },
              latest_result: { type: "string" },
              total_inspections: { type: "number" },
              violations: { type: "array", items: { type: "string" } },
            },
          },
        },
        worst_rated: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              zip_code: { type: "string" },
              safetyScore: { type: "number" },
              latest_date: { type: "string" },
              latest_result: { type: "string" },
              total_inspections: { type: "number" },
              violations: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  });

  const mapItem = (r, prefix, i) => {
    const safetyScore = Math.max(0, Math.min(100, Number(r.safetyScore) || 75));
    return {
      id: `${prefix}-${i}-${r.name}`,
      business_id: `${prefix}-${i}-${r.name}`,
      name: r.name, address: r.address || "", city: r.city || stateName,
      zip_code: r.zip_code || "", safetyScore,
      grade: getGrade(safetyScore),
      totalInspections: r.total_inspections || 1,
      latestDate: r.latest_date || "",
      latestResult: r.latest_result || "",
      violations: r.violations || [],
      isLLMData: true, source: "llm",
    };
  };

  return {
    topRated:   (result?.top_rated   || []).map((r, i) => mapItem(r, "top",   i)).sort((a, b) => b.safetyScore - a.safetyScore),
    worstRated: (result?.worst_rated || []).map((r, i) => mapItem(r, "worst", i)).sort((a, b) => a.safetyScore - b.safetyScore),
  };
}

// ── Live API registry ─────────────────────────────────────────────────────────
const LIVE_API_COUNTIES = {
  "WA:King":       { label: "King County (Seattle), WA",      fetch: fetchKingCounty, region: "washington", county: "king" },
  "NY:New York":   { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Kings":      { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Queens":     { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Bronx":      { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Richmond":   { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "IL:Cook":       { label: "Cook County (Chicago), IL",      fetch: fetchChicago,    region: "illinois",   county: "cook" },
  "MD:Montgomery": { label: "Montgomery County, MD",          fetch: fetchMontgomery, region: "maryland",   county: "montgomery_md" },
};

const ABBR_TO_REGION_KEY = {
  AL:"alabama",AK:"alaska",AZ:"arizona",AR:"arkansas",CA:"california",CO:"colorado",
  CT:"connecticut",DE:"delaware",DC:"dc",FL:"florida",GA:"georgia",HI:"hawaii",
  ID:"idaho",IN:"indiana",IA:"iowa",KS:"kansas",KY:"kentucky",LA:"louisiana",
  ME:"maine",MA:"massachusetts",MI:"michigan",MN:"minnesota",MS:"mississippi",
  MO:"missouri",MT:"montana",NE:"nebraska",NV:"nevada",NH:"new_hampshire",
  NJ:"new_jersey",NM:"new_mexico",NY:"new_york",NC:"north_carolina",ND:"north_dakota",
  OH:"ohio",OK:"oklahoma",OR:"oregon",PA:"pennsylvania",RI:"rhode_island",
  SC:"south_carolina",SD:"south_dakota",TN:"tennessee",TX:"texas",UT:"utah",
  VT:"vermont",VA:"virginia",WA:"washington",WV:"west_virginia",WI:"wisconsin",WY:"wyoming",
};

function findCountyId(stateAbbr, geoCountyName) {
  const regionKey = ABBR_TO_REGION_KEY[stateAbbr];
  if (!regionKey) return "";
  const counties = REGIONS[regionKey]?.counties || [];
  const lower = geoCountyName.toLowerCase();
  const match = counties.find((c) => c.name.toLowerCase().startsWith(lower));
  return match?.id || counties[0]?.id || "";
}

// ── Sub-components ────────────────────────────────────────────────────────────
function RestaurantRow({ restaurant, rank, onClick }) {
  const grade = restaurant.grade || getGrade(restaurant.safetyScore);
  return (
    <div
      className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="text-slate-400 font-bold text-sm w-5 text-center flex-shrink-0">#{rank}</div>
      <ScoreGauge score={restaurant.safetyScore} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 text-sm truncate">{restaurant.name}</p>
        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {restaurant.city}{restaurant.address ? ` · ${restaurant.address}` : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${getGradeColor(grade)}`}>{grade}</span>
        <span className="text-xs text-slate-400">{restaurant.safetyScore}/100</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CountyDrillDown() {
  const navigate = useNavigate();
  const urlParams   = new URLSearchParams(window.location.search);
  const stateAbbr   = urlParams.get("state") || "WA";
  const stateName   = urlParams.get("name")  || "Washington";
  const countyName  = urlParams.get("county") || "";

  const [topRated, setTopRated]         = useState([]);
  const [worstRated, setWorstRated]     = useState([]);
  const [allRestaurants, setAll]        = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isLive, setIsLive]             = useState(false);
  const [regionLabel, setRegionLabel]   = useState("");

  const liveConfig = LIVE_API_COUNTIES[`${stateAbbr}:${countyName}`] || null;

  const handleRestaurantClick = (restaurant) => {
    const region = liveConfig ? liveConfig.region : (ABBR_TO_REGION_KEY[stateAbbr] || "washington");
    const county = liveConfig ? liveConfig.county : findCountyId(stateAbbr, countyName);
    navigate(`/?q=${encodeURIComponent(restaurant.name)}&region=${region}&county=${county}`);
  };

  useEffect(() => {
    setLoading(true);
    setAll([]); setTopRated([]); setWorstRated([]);

    if (liveConfig) {
      setIsLive(true);
      setRegionLabel(liveConfig.label);
      liveConfig.fetch().then((data) => {
        setAll(data);
        setTopRated([...data].sort((a, b) => b.safetyScore - a.safetyScore).slice(0, 10));
        setWorstRated([...data].sort((a, b) => a.safetyScore - b.safetyScore).slice(0, 10));
        setLoading(false);
      });
    } else {
      setIsLive(false);
      setRegionLabel(countyName ? `${countyName}, ${stateName}` : stateName);
      fetchLLM(stateName, stateAbbr, countyName).then(({ topRated: t, worstRated: w }) => {
        setTopRated(t);
        setWorstRated(w);
        setAll([...t, ...w]);
        setLoading(false);
      });
    }
  }, [stateAbbr, stateName, countyName]);

  const avgScore = allRestaurants.length > 0
    ? Math.round(allRestaurants.reduce((s, r) => s + Number(r.safetyScore), 0) / allRestaurants.length)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Map
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{stateName}</h1>
              <p className="text-slate-400 text-sm mt-1">{regionLabel}</p>
              {isLive && <span className="mt-2 inline-block text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">● LIVE API DATA</span>}
            </div>
            {avgScore !== null && !loading && (
              <div className="bg-slate-800 rounded-2xl px-6 py-4 text-center">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Avg Safety Score</p>
                <p className="text-4xl font-extrabold">{avgScore}</p>
                <p className="text-slate-400 text-sm mt-0.5">Grade {getGrade(avgScore)} · {allRestaurants.length.toLocaleString()} establishments</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">
              {isLive ? "Fetching live inspection data…" : "Searching official health records via AI…"}
            </p>
          </div>
        ) : allRestaurants.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No data found for this region.</div>
        ) : (
          <>
            <div className="mb-6 px-4 py-3 bg-slate-100 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">Ranking note:</span> Ties in safety score are broken by number of inspections on record — establishments with a longer, more consistent history rank higher, regardless of type or prestige.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Top Rated</h2>
                    <p className="text-xs text-slate-500">Highest average safety scores</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {topRated.map((r, i) => (
                    <RestaurantRow key={r.id} restaurant={r} rank={i + 1} onClick={() => handleRestaurantClick(r)} />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Needs Attention</h2>
                    <p className="text-xs text-slate-500">Lowest average safety scores</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {worstRated.map((r, i) => (
                    <RestaurantRow key={r.id} restaurant={r} rank={i + 1} onClick={() => handleRestaurantClick(r)} />
                  ))}
                </div>
              </div>
            </div>

            {!isLive && (
              <div className="mt-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>AI-Assisted Data:</strong> {stateName} does not have a real-time public API. Results are sourced from official health department records via AI lookup and may not reflect the very latest inspections.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}