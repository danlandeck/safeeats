import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { Bug, Thermometer, Sparkles, LayoutDashboard, ArrowUpDown, LocateFixed, Loader2 } from "lucide-react";
import SuspectList from "../components/SuspectList";

// ── City centres + live API config ──────────────────────────────────────────
const CITIES = [
  { id: "king",         label: "Seattle",       lat: 47.61, lng: -122.33, color: "#1a9641" },
  { id: "nyc",         label: "New York",       lat: 40.71, lng: -74.00,  color: "#a6d96a" },
  { id: "cook",        label: "Chicago",        lat: 41.88, lng: -87.63,  color: "#fdae61" },
  { id: "montgomery_md", label: "Montgomery MD",lat: 39.08, lng: -77.15,  color: "#1a9641" },
  { id: "travis",      label: "Austin",         lat: 30.27, lng: -97.74,  color: "#a6d96a" },
  { id: "sf",          label: "San Francisco",  lat: 37.77, lng: -122.42, color: "#fdae61" },
  { id: "la",          label: "Los Angeles",    lat: 34.05, lng: -118.24, color: "#d7191c" },
];

const KING_API = "https://data.kingcounty.gov/resource/f29f-zza5.json";

// Violation keyword → category
const PEST_KW   = ["rodent","pest","vermin","insect","fly","cockroach","mouse","rat"];
const TEMP_KW   = ["temperature","temp","hot hold","cold hold","refrigerat","cook","tphc"];
const CLEAN_KW  = ["clean","sanit","wipe","surface","equip","utensil","hand","wash"];

function classify(desc = "") {
  const d = desc.toLowerCase();
  if (PEST_KW.some(k => d.includes(k)))  return "pests";
  if (TEMP_KW.some(k => d.includes(k)))  return "temps";
  if (CLEAN_KW.some(k => d.includes(k))) return "cleanliness";
  return "other";
}

function scoreToGrade(s) {
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 70) return "C";
  if (s >= 60) return "D";
  return "F";
}

function getGradeColor(g) {
  return { A:"#1a9641", B:"#a6d96a", C:"#fdae61", D:"#f97316", F:"#d7191c" }[g] || "#94a3b8";
}

const TABS = [
  { id: "overview",     label: "Overview",     Icon: LayoutDashboard },
  { id: "pests",        label: "Pests",         Icon: Bug },
  { id: "temps",        label: "Temperatures",  Icon: Thermometer },
  { id: "cleanliness",  label: "Cleanliness",   Icon: Sparkles },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const handleGoToRestaurant = (r) => {
    navigate("/", {
      state: {
        restaurant: {
          business_id: r.name + r.address,
          name: r.name,
          address: r.address,
          city: r.city || "Seattle",
          safetyScore: r.score,
          grade: r.grade,
          totalInspections: r.inspections?.length || 1,
          latestResult: r.result,
          latestDate: r.date,
          source: "king",
          county_id: "king",
        },
        region: "washington",
        county: "king",
      },
    });
  };

  const [tab, setTab]             = useState("overview");
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showBadOnly, setShowBadOnly] = useState(false);
  const [sortCol, setSortCol]     = useState("score");
  const [sortDir, setSortDir]     = useState("asc");
  const [cityScores, setCityScores] = useState({});
  const [activeGrade, setActiveGrade] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // { lat, lng, label, cityId }
  const [geoLoading, setGeoLoading] = useState(false);

  // ── Fetch King County as primary dataset ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await fetch(
          `${KING_API}?$limit=500&$order=inspection_date DESC`
        ).then(r => r.json());

        // Group by business
        const biz = {};
        data.forEach(row => {
          const id = row.business_id;
          if (!biz[id]) biz[id] = { name: row.name, address: row.address, city: row.city || "Seattle", inspections: [] };
          const score = row.inspection_score !== undefined ? Math.max(0, Math.min(100, 100 - parseInt(row.inspection_score || 0))) : null;
          biz[id].inspections.push({
            date: row.inspection_date?.slice(0,10),
            score,
            result: row.inspection_result || "",
            violations: row.violation_description ? [row.violation_description] : [],
          });
        });

        const processed = Object.values(biz).map(b => {
          const validScores = b.inspections.map(i => i.score).filter(s => s !== null);
          const latest = b.inspections[0];
          const score  = validScores.length ? Math.round(validScores[0]) : 70;
          const allViolations = b.inspections.flatMap(i => i.violations);
          return {
            name: b.name,
            address: b.address,
            city: b.city,
            score,
            grade: scoreToGrade(score),
            result: latest?.result || "",
            date: latest?.date || "",
            violations: allViolations,
            inspections: b.inspections,
            pestCount:  allViolations.filter(v => classify(v) === "pests").length,
            tempCount:  allViolations.filter(v => classify(v) === "temps").length,
            cleanCount: allViolations.filter(v => classify(v) === "cleanliness").length,
          };
        });

        setRows(processed);

        // City-level scores for map bubbles — use real avg for king, omit others (no fake data)
        const kingAvg = Math.round(processed.reduce((s, r) => s + r.score, 0) / (processed.length || 1));
        const scores = {};
        CITIES.forEach(c => { scores[c.id] = c.id === "king" ? kingAvg : null; });
        setCityScores(scores);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Silently try to get user location (no prompt if not granted yet) ─────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.permissions?.query({ name: "geolocation" }).then((result) => {
      if (result.state === "granted") {
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          // Reverse-geocode to get city label
          let label = "Your Location";
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            const a = data.address || {};
            const city = a.city || a.town || a.village || a.suburb || "";
            const state = a.state || "";
            label = `${city}${state ? ", " + state : ""}`;
          } catch {}
          // Find nearest known city for the bubble highlight
          let nearestCityId = null;
          let minDist = Infinity;
          CITIES.forEach(c => {
            const d = Math.sqrt((c.lat - lat) ** 2 + (c.lng - lng) ** 2);
            if (d < minDist) { minDist = d; nearestCityId = c.id; }
          });
          // Only highlight a known city if within ~2° (~140 miles)
          if (minDist > 2) nearestCityId = null;
          setUserLocation({ lat, lng, label, cityId: nearestCityId });
          setGeoLoading(false);
        }, () => setGeoLoading(false));
      }
    }).catch(() => {});
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = [...rows];
    if (showBadOnly) r = r.filter(x => x.score < 80);
    if (tab === "pests")       r = r.filter(x => x.pestCount > 0);
    if (tab === "temps")       r = r.filter(x => x.tempCount > 0);
    if (tab === "cleanliness") r = r.filter(x => x.cleanCount > 0);
    r.sort((a, b) => {
      const va = a[sortCol] ?? 0;
      const vb = b[sortCol] ?? 0;
      return sortDir === "asc"
        ? (typeof va === "string" ? va.localeCompare(vb) : va - vb)
        : (typeof va === "string" ? vb.localeCompare(va) : vb - va);
    });
    return r.slice(0, 80);
  }, [rows, showBadOnly, tab, sortCol, sortDir]);

  const gradeDist = useMemo(() => {
    // Always compute from full rows for overview accuracy
    const source = tab === "overview" ? rows : filtered;
    const counts = { A:0, B:0, C:0, D:0, F:0 };
    source.forEach(r => counts[r.grade]++);
    return Object.entries(counts).map(([grade, count]) => ({ grade, count }));
  }, [rows, filtered, tab]);

  // Trend: last 12 months average scores from raw inspections
  const trendData = useMemo(() => {
    const byMonth = {};
    rows.forEach(r => {
      if (!r.date) return;
      const m = r.date.slice(0,7);
      if (!byMonth[m]) byMonth[m] = { sum:0, count:0 };
      byMonth[m].sum += r.score;
      byMonth[m].count++;
    });
    return Object.entries(byMonth)
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, { sum, count }]) => ({
        month: month.slice(5) + "/" + month.slice(2,4),
        avg: Math.round(sum / count),
      }));
  }, [rows]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const categoryViolationData = useMemo(() => [
    { cat: "Pests 🐀",       count: rows.reduce((s,r) => s + r.pestCount, 0)  },
    { cat: "Temps 🌡️",       count: rows.reduce((s,r) => s + r.tempCount, 0)  },
    { cat: "Cleanliness 🧼", count: rows.reduce((s,r) => s + r.cleanCount, 0) },
  ], [rows]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#4CAF50] rounded-full animate-spin" />
      <p className="text-slate-500 font-medium">Loading inspection data…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">SafeEats Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Live inspection data · King County primary · AI-backed other cities</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* BIG BAD ONLY BUTTON */}
        <button
          onClick={() => setShowBadOnly(b => !b)}
          aria-pressed={showBadOnly}
          aria-label="Toggle Show Bad Only filter"
          style={{ minHeight: 60 }}
          className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 rounded-2xl text-xl font-extrabold tracking-tight shadow-lg transition-all border-4 ${
            showBadOnly
              ? "bg-red-600 text-white border-red-400 scale-[0.98]"
              : "bg-red-50 text-red-700 border-red-300 hover:bg-red-600 hover:text-white hover:border-red-400"
          }`}
        >
          <span className="text-2xl">⚠️</span>
          {showBadOnly ? "Showing Bad Only — Click to Show All" : "Show Bad Only"}
        </button>

        {/* TABS */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inspection categories">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                tab === id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Establishments", value: rows.length },
                { label: "Grade A", value: rows.filter(r=>r.grade==="A").length },
                { label: "Grade F", value: rows.filter(r=>r.grade==="F").length },
                { label: "Avg Score", value: rows.length ? Math.round(rows.reduce((s,r)=>s+r.score,0)/rows.length) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Map */}
            {(() => {
              // Determine map center & zoom based on user location or default to Seattle
              const defaultCity = CITIES.find(c => c.id === "king"); // Seattle default
              const focusCity = userLocation?.cityId ? CITIES.find(c => c.id === userLocation.cityId) : null;
              const mapCenter = userLocation
                ? [userLocation.lat, userLocation.lng]
                : [defaultCity.lat, defaultCity.lng];
              const mapZoom = userLocation ? 11 : 11;
              const locationLabel = userLocation
                ? userLocation.label || "Your Location"
                : "Seattle, WA (default)";
              const isDefault = !userLocation;

              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-base">City Safety Heat Map</h2>
                        <p className="text-xs mt-0.5 flex items-center gap-1.5">
                          {geoLoading ? (
                            <span className="text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Detecting your location…</span>
                          ) : isDefault ? (
                            <span className="text-amber-600 font-semibold">📍 Defaulting to Seattle — allow location access to see your city</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1"><LocateFixed className="w-3 h-3" /> Focused on your location: {locationLabel}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Bubble size = relative risk · Click for score</p>
                  </div>
                  <div style={{ height: 360 }}>
                    <MapContainer
                      key={`${mapCenter[0]}-${mapCenter[1]}`}
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height:"100%", width:"100%" }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                      />
                      {CITIES.map(city => {
                        const score = cityScores[city.id];
                        if (!score) return null;
                        const color = score >= 90 ? "#1a9641" : score >= 80 ? "#a6d96a" : score >= 70 ? "#fdae61" : "#d7191c";
                        const isHighlighted = focusCity?.id === city.id || (!focusCity && city.id === "king");
                        return (
                          <CircleMarker
                            key={city.id}
                            center={[city.lat, city.lng]}
                            radius={isHighlighted ? Math.max(16, (100 - score) * 0.9) : Math.max(10, (100 - score) * 0.5)}
                            fillColor={color}
                            color={isHighlighted ? "#fff" : "#ccc"}
                            weight={isHighlighted ? 3 : 1}
                            fillOpacity={isHighlighted ? 0.9 : 0.4}
                          >
                            <Popup>
                              <div className="text-center p-1">
                                <p className="font-extrabold text-slate-900">{city.label}</p>
                                <p className="text-2xl font-extrabold mt-1" style={{ color }}>{score}</p>
                                <p className="text-xs text-slate-500">Avg Safety Score (live data)</p>
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}
                      {/* User location marker if not a known city */}
                      {userLocation && !focusCity && (
                        <CircleMarker
                          center={[userLocation.lat, userLocation.lng]}
                          radius={14}
                          fillColor="#3b82f6"
                          color="#fff"
                          weight={3}
                          fillOpacity={0.85}
                        >
                          <Popup>
                            <div className="text-center p-1">
                              <p className="font-extrabold text-slate-900">📍 {locationLabel}</p>
                              <p className="text-xs text-slate-500 mt-1">Your current location</p>
                              <p className="text-xs text-slate-400 mt-0.5">No live API data for this city yet</p>
                            </div>
                          </Popup>
                        </CircleMarker>
                      )}
                    </MapContainer>
                  </div>
                </div>
              );
            })()}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trend line */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="font-extrabold text-slate-900 text-base mb-4">Score Trend (last 12 months)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} />
                    <YAxis domain={[60,100]} tick={{ fontSize:11, fill:"#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                    <Line type="monotone" dataKey="avg" stroke="#4CAF50" strokeWidth={3} dot={{ r:4, fill:"#4CAF50" }} name="Avg Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Grade distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="font-extrabold text-slate-900 text-base mb-1">Grade Distribution</h2>
                <p className="text-xs text-slate-400 mb-3">Tap a bar to see suspects</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={gradeDist} onClick={(e) => {
                    const g = e?.activePayload?.[0]?.payload?.grade;
                    if (g) setActiveGrade(prev => prev === g ? null : g);
                  }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="grade" tick={{ fontSize:13, fontWeight:700, fill:"#334155" }} />
                    <YAxis tick={{ fontSize:11, fill:"#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                    <Bar dataKey="count" radius={[6,6,0,0]} name="Establishments" cursor="pointer">
                      {gradeDist.map(({ grade }) => (
                        <Cell key={grade} fill={getGradeColor(grade)} opacity={activeGrade && activeGrade !== grade ? 0.35 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {activeGrade && <button onClick={() => setActiveGrade(null)} className="text-xs text-blue-600 font-semibold mt-1 hover:underline">Clear filter</button>}
                <SuspectList
                  restaurants={rows.map(r => ({ ...r, safetyScore: r.score, latestResult: r.result, business_id: r.name + r.address }))}
                  filterType="grade"
                  filterValue={activeGrade ? { A: "A (90-100)", B: "B (80-89)", C: "C (70-79)", D: "D (60-69)", F: "F (<60)" }[activeGrade] : null}
                  onSelectRestaurant={null}
                />
              </div>
            </div>

            {/* Violation category bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-extrabold text-slate-900 text-base mb-1">Violation Categories</h2>
              <p className="text-xs text-slate-400 mb-3">Tap a bar to see suspects</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={categoryViolationData} layout="vertical"
                  onClick={(e) => {
                    const cat = e?.activePayload?.[0]?.payload?.cat;
                    if (cat) setActiveCategory(prev => prev === cat ? null : cat);
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize:11, fill:"#64748b" }} />
                  <YAxis type="category" dataKey="cat" tick={{ fontSize:12, fill:"#334155" }} width={130} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" fill="#2196F3" radius={[0,6,6,0]} name="Violations" cursor="pointer">
                    {categoryViolationData.map(({ cat }) => (
                      <Cell key={cat} opacity={activeCategory && activeCategory !== cat ? 0.35 : 1} fill="#2196F3" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {activeCategory && (
                <>
                  <button onClick={() => setActiveCategory(null)} className="text-xs text-blue-600 font-semibold mt-1 hover:underline">Clear filter</button>
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
                    <div className="px-4 py-2 bg-blue-100 border-b border-blue-200">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-blue-700">
                        Top offenders — {activeCategory}
                      </span>
                    </div>
                    {rows
                      .filter(r => {
                        if (activeCategory.includes("Pest")) return r.pestCount > 0;
                        if (activeCategory.includes("Temp")) return r.tempCount > 0;
                        return r.cleanCount > 0;
                      })
                      .sort((a, b) => {
                        const getCount = r => activeCategory.includes("Pest") ? r.pestCount : activeCategory.includes("Temp") ? r.tempCount : r.cleanCount;
                        return getCount(b) - getCount(a);
                      })
                      .slice(0, 10)
                      .map((r, i) => (
                       <button key={i} onClick={() => handleGoToRestaurant(r)} className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50 transition-colors text-left">
                         <span className="text-xs font-extrabold text-blue-700 flex-shrink-0">
                           #{activeCategory.includes("Pest") ? r.pestCount : activeCategory.includes("Temp") ? r.tempCount : r.cleanCount}
                         </span>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                           <p className="text-xs text-slate-400 truncate">{r.address}</p>
                         </div>
                         <span className="text-xs font-extrabold px-2 py-0.5 rounded-md flex-shrink-0"
                           style={{ background: getGradeColor(r.grade), color: "#fff" }}>{r.grade}</span>
                       </button>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY TABS (Pests / Temps / Cleanliness) */}
        {["pests","temps","cleanliness"].includes(tab) && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-extrabold text-slate-900 text-base mb-1 capitalize">
                {tab === "pests" ? "🐀 Pest Violations" : tab === "temps" ? "🌡️ Temperature Violations" : "🧼 Cleanliness Violations"}
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Showing establishments with at least one {tab} violation · {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={filtered.slice(0,20).map(r => ({
                  name: r.name.slice(0,20),
                  count: tab === "pests" ? r.pestCount : tab === "temps" ? r.tempCount : r.cleanCount,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize:9, fill:"#64748b" }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize:11, fill:"#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" fill={tab === "pests" ? "#d7191c" : tab === "temps" ? "#f97316" : "#2196F3"} radius={[4,4,0,0]} name="Violations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SORTABLE TABLE (all tabs) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Inspection Scores</h2>
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} establishments · Tap header to sort</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "score", label: "Score" },
                { key: "name",  label: "Name" },
                { key: "date",  label: "Date" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => toggleSort(key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sortCol === key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                  {label} <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filtered.map((r, i) => (
              <button key={i} onClick={() => handleGoToRestaurant(r)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-white font-extrabold text-sm flex-shrink-0"
                  style={{ background: getGradeColor(r.grade) }}>{r.grade}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                  <p className="text-xs text-slate-400 truncate">{r.result} · {r.date}</p>
                </div>
                <span className="text-sm font-extrabold text-slate-900 flex-shrink-0">{r.score}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center py-10 text-slate-400 text-sm">No establishments match the current filters.</p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm" role="grid" aria-label="Inspection scores table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    { key: "name",   label: "Name" },
                    { key: "score",  label: "Score" },
                    { key: "grade",  label: "Grade" },
                    { key: "result", label: "Result" },
                    { key: "date",   label: "Last Inspected" },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => toggleSort(key)} scope="col"
                      aria-sort={sortCol === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                      className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wide hover:text-slate-900 select-none whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {label} <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} onClick={() => handleGoToRestaurant(r)} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">{r.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${r.score}%`, background: getGradeColor(r.grade) }} />
                        </div>
                        <span className="font-extrabold text-slate-900 text-sm">{r.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-extrabold text-sm"
                        style={{ background: getGradeColor(r.grade) }}>{r.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">{r.result}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{r.date}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">No establishments match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}