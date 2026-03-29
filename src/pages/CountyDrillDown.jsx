import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, MapPin, Star, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ScoreGauge from "../components/ScoreGauge";

const KING_API = "https://data.kingcounty.gov/resource/f29f-zza5.json";
const NYC_API = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHICAGO_API = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
const MONTGOMERY_API = "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json";

function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getGradeColor(grade) {
  switch (grade) {
    case "A": return "bg-slate-900 text-white";
    case "B": return "bg-slate-600 text-white";
    case "C": return "bg-amber-500 text-white";
    case "D": return "bg-orange-500 text-white";
    case "F": return "bg-red-600 text-white";
    default: return "bg-slate-400 text-white";
  }
}

// Fetch + process King County top/worst
async function fetchKingCounty() {
  const url = `${KING_API}?$limit=2000&$order=inspection_date DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const businesses = {};
  data.forEach((row) => {
    const id = row.business_id;
    if (!id || !row.name) return;
    if (!businesses[id]) {
      businesses[id] = { id, name: row.name, address: row.address, city: row.city || "Seattle", scores: [] };
    }
    const score = parseInt(row.inspection_score);
    if (!isNaN(score)) businesses[id].scores.push(Math.max(0, Math.min(100, 100 - score)));
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchNYC() {
  const url = `${NYC_API}?$limit=2000&$order=inspection_date DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const businesses = {};
  data.forEach((row) => {
    const id = row.camis;
    if (!id || !row.dba) return;
    if (!businesses[id]) {
      businesses[id] = { id, name: row.dba, address: `${row.building || ""} ${row.street || ""}`.trim(), city: row.boro || "New York City", scores: [] };
    }
    const score = parseInt(row.score);
    if (!isNaN(score)) businesses[id].scores.push(Math.max(0, Math.min(100, 100 - score)));
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchChicago() {
  const url = `${CHICAGO_API}?$limit=2000&$order=inspection_date DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const businesses = {};
  data.forEach((row) => {
    const id = row.license_;
    const name = row.dba_name || row.aka_name;
    if (!id || !name) return;
    if (!businesses[id]) {
      businesses[id] = { id, name, address: row.address || "", city: "Chicago", scores: [] };
    }
    const result = row.results || "";
    const pts = result === "Pass" ? 92 : result === "Pass w/ Conditions" ? 76 : 45;
    businesses[id].scores.push(pts);
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchMontgomery() {
  const url = `${MONTGOMERY_API}?$limit=2000&$order=inspectiondate DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const VKEYS = ["violation1","violation2","violation3","violation4","violation5","violation6a","violation6b","violation7a","violation7b","violation8","violation9"];
  const businesses = {};
  data.forEach((row) => {
    const id = row.establishment_id;
    const name = row.name;
    if (!id || !name) return;
    if (!businesses[id]) {
      businesses[id] = { id, name, address: row.address1 || "", city: "Rockville", scores: [] };
    }
    const out = VKEYS.filter((k) => row[k] === "Out of Compliance").length;
    const score = out === 0 ? 95 : out === 1 ? 82 : out === 2 ? 70 : 55;
    businesses[id].scores.push(score);
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchLLM(stateName, stateAbbr, countyName) {
  const countyLabel = countyName
    ? (countyName.toLowerCase().includes("county") ? countyName : `${countyName} County`)
    : null;
  const location = countyLabel
    ? `${countyLabel}, ${stateName}, ${stateAbbr}`
    : `${stateName}, ${stateAbbr}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a food safety data assistant. Search official health department records ONLY for restaurants physically located in ${location}. CRITICAL: Every single result MUST be located in ${location} — do NOT include restaurants from any other county, city, or state.\n\nReturn two separate lists:\n1. top_rated: 10 restaurants with the HIGHEST safety scores (85-100), clean inspection records, in ${location}.\n2. worst_rated: 10 restaurants with the LOWEST safety scores (0-55), documented violations or failed inspections, in ${location}.\n\nThe two lists must be completely DIFFERENT restaurants. All must be real establishments with real addresses in ${location}. Safety score: 100 = zero violations, 0 = critical closure.`,
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
              safetyScore: { type: "number" },
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
              safetyScore: { type: "number" },
            },
          },
        },
      },
    },
  });

  const mapItem = (r, prefix, i) => {
    const score = Math.max(0, Math.min(100, Number(r.safetyScore) || 0));
    return { id: `${prefix}-${i}`, name: r.name, address: r.address || "", city: r.city || stateName, safetyScore: score, grade: getGrade(score), inspections: null };
  };

  return {
    topRated: (result?.top_rated || []).map((r, i) => mapItem(r, "top", i)).sort((a, b) => b.safetyScore - a.safetyScore),
    worstRated: (result?.worst_rated || []).map((r, i) => mapItem(r, "worst", i)).sort((a, b) => a.safetyScore - b.safetyScore),
  };
}

function RestaurantRow({ restaurant, rank, isTop, onClick }) {
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
        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${getGradeColor(grade)}`}>
          {grade}
        </span>
        <span className="text-xs text-slate-400">{restaurant.safetyScore}/100</span>
      </div>
    </div>
  );
}

const LIVE_API_STATES = {
  WA: { label: "King County (Seattle), WA", fetch: fetchKingCounty, region: "washington", county: "king" },
  NY: { label: "New York City (5 Boroughs), NY", fetch: fetchNYC, region: "new_york", county: "nyc" },
  IL: { label: "Cook County (Chicago), IL", fetch: fetchChicago, region: "illinois", county: "cook" },
  MD: { label: "Montgomery County, MD", fetch: fetchMontgomery, region: "maryland", county: "montgomery_md" },
};

// Map state abbr → REGIONS key for LLM states
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

export default function CountyDrillDown() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const stateAbbr = urlParams.get("state") || "WA";
  const stateName = urlParams.get("name") || "Washington";
  const countyName = urlParams.get("county") || "";

  const handleRestaurantClick = (restaurant) => {
    const liveConfig = LIVE_API_STATES[stateAbbr];
    const region = liveConfig ? liveConfig.region : (ABBR_TO_REGION_KEY[stateAbbr] || "washington");
    const county = liveConfig ? liveConfig.county : "";
    navigate(`/?q=${encodeURIComponent(restaurant.name)}&region=${region}&county=${county}`);
  };

  const [topRated, setTopRated] = useState([]);
  const [worstRated, setWorstRated] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [regionLabel, setRegionLabel] = useState("");

  useEffect(() => {
    setLoading(true);
    setAllRestaurants([]);

    const liveConfig = LIVE_API_STATES[stateAbbr];
    if (liveConfig) {
      setIsLive(true);
      setRegionLabel(liveConfig.label);
      liveConfig.fetch().then((data) => {
        setAllRestaurants(data);
        const sorted = [...data].sort((a, b) => Number(b.safetyScore) - Number(a.safetyScore));
        setTopRated(sorted.slice(0, 10));
        setWorstRated([...data].sort((a, b) => Number(a.safetyScore) - Number(b.safetyScore)).slice(0, 10));
        setLoading(false);
      });
    } else {
      setIsLive(false);
      setRegionLabel(countyName ? `${countyName}, ${stateName}` : stateName);
      fetchLLM(stateName, stateAbbr, countyName).then(({ topRated: t, worstRated: w }) => {
        setTopRated(t);
        setWorstRated(w);
        setAllRestaurants([...t, ...w]);
        setLoading(false);
      });
    }
  }, [stateAbbr, stateName, countyName]);

  // topRated and worstRated are set directly in useEffect
  const uniqueAll = allRestaurants.length > 0 ? allRestaurants : [...topRated, ...worstRated];
  const avgScore = uniqueAll.length > 0
    ? Math.round(uniqueAll.reduce((s, r) => s + Number(r.safetyScore), 0) / uniqueAll.length)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Map
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{stateName}</h1>
              <p className="text-slate-400 text-sm mt-1">{regionLabel}</p>
              {isLive && (
                <span className="mt-2 inline-block text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                  ● LIVE API DATA
                </span>
              )}
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

      {/* Content */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Rated */}
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
                  <RestaurantRow key={r.id} restaurant={r} rank={i + 1} isTop onClick={() => handleRestaurantClick(r)} />
                ))}
              </div>
            </div>

            {/* Worst Rated */}
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
        )}

        {!loading && !isLive && (
          <div className="mt-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>AI-Assisted Data:</strong> {stateName} does not have a real-time public API. Results are sourced from official health department records via AI lookup and may not reflect the very latest inspections.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}