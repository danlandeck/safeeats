import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DirectionsButtons from "./DirectionsButtons";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Globe, Share2, Heart,
  ChevronDown, ChevronUp, Info, Calendar, ShieldCheck,
  ExternalLink, Award, TrendingUp, BadgeCheck, AlertCircle
} from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import GradeBadge from "./GradeBadge";
import SafetySnapshot from "./SafetySnapshot";
import ViolationItem from "./ViolationItem";
import InspectionTrendChart from "./InspectionTrendChart";
import FailRiskBadge from "./FailRiskBadge";
import ReportIssueButton from "./ReportIssueButton";
import ADAAccessibilityBadge from "./ADAAccessibilityBadge";
import ADABadge from "./ADABadge";
import EPAWaterCard from "./EPAWaterCard";
import SafetyFactors from "./SafetyFactors";
import KofiButton from "./KofiButton";
import DataSourceBadge from "./DataSourceBadge";
import { base44 } from "@/api/base44Client";
import { getGrade, getGradeColor } from "../utils/grading";
import { isFavorite, toggleFavorite } from "../utils/favorites";
import { translateViolation } from "../utils/violationTranslator";

// ── Infer state from restaurant data ──────────────────────────────────────────
function inferState(restaurant) {
  if (restaurant.state?.length === 2) return restaurant.state.toUpperCase();
  // Map county_id to state
  const COUNTY_STATE = {
    king: "WA", nyc: "NY", ny_state: "NY", cook: "IL",
    montgomery_md: "MD", travis: "TX", sf: "CA", la: "CA", delaware: "DE",
  };
  if (restaurant.county_id && COUNTY_STATE[restaurant.county_id]) {
    return COUNTY_STATE[restaurant.county_id];
  }
  // Try to extract from address
  const addr = `${restaurant.address || ""} ${restaurant.city || ""} ${restaurant.zip_code || ""}`;
  const match = addr.match(/\b([A-Z]{2})\b/);
  return match ? match[1] : "US";
}

// ── Jargon → category for repeat detection ──────────────────────────────────
function buildViolationKey(desc) {
  const { category } = translateViolation(desc);
  return category;
}

// ── Data source registry ──────────────────────────────────────────────────────
const SOURCE_REGISTRY = {
  king:           { name: "King County Environmental Health",          url: "https://kingcounty.gov/depts/health/environmental-health/food-safety.aspx" },
  nyc:            { name: "NYC Dept. of Health & Mental Hygiene",      url: "https://www1.nyc.gov/site/doh/services/restaurant-grades.page" },
  cook:           { name: "Cook County / Chicago Dept. Public Health", url: "https://www.chicago.gov/city/en/depts/cdph/provdrs/food_safety.html" },
  montgomery_md:  { name: "Montgomery County Dept. of Health",         url: "https://www.montgomerycountymd.gov/Health/FSU/index.html" },
  travis:         { name: "Austin / Travis County Health Services",    url: "https://www.austintexas.gov/department/food-establishments" },
  sf:             { name: "SF Dept. of Public Health — EHS",           url: "https://www.sf.gov/departments/department-public-health/environmental-health" },
  la:             { name: "LA County Dept. of Public Health",          url: "http://ehservices.publichealth.lacounty.gov/" },
  dubai:          { name: "Dubai Municipality — Food Safety Department", url: "https://www.dm.gov.ae/en/business/food-safety" },
  uk_fsa:         { name: "UK Food Standards Agency — Food Hygiene Rating Scheme", url: "https://ratings.food.gov.uk/" },
  delaware:       { name: "Delaware Division of Public Health — Office of Food Protection", url: "https://www.dhss.delaware.gov/dph/hsp/hspfoodborneil.html" },
  ny_state:       { name: "New York State Dept. of Health — Food Service Establishments", url: "https://health.data.ny.gov/Health/Food-Service-Establishment-Last-Inspection/cnih-y5dw" },
  toronto:        { name: "Toronto Public Health — DineSafe", url: "https://www.toronto.ca/community-people/health-wellness-care/health-programs-advice/food-safety/dinesafe/" },
  tacoma_pierce:  { name: "Tacoma-Pierce County Health Department", url: "https://www.tpchd.org/healthy-communities/food-safety" },
  manchester_ct:  { name: "Manchester CT Health Department", url: "https://www.manchesterct.gov/Government/Departments/Health-Department/Recent-Inspections" },
};

export default function RestaurantDetail({ restaurant, inspections, onBack }) {
  const [favorited, setFavorited] = useState(() => isFavorite(restaurant.business_id));
  const [showRawData, setShowRawData] = useState(false);
  const [showDataSource, setShowDataSource] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [expandedInspection, setExpandedInspection] = useState(0); // first expanded by default
  // Scroll-to helpers for stat boxes
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Group inspections ──────────────────────────────────────────────────────
  const uniqueInspections = useMemo(() => {
    const map = {};
    inspections.forEach((row) => {
      const key = row.inspection_serial_num || `${row.inspection_date}|${row.inspection_result}`;
      if (!map[key]) map[key] = { ...row, violations: [] };
      if (row.violation_description?.trim()) {
        map[key].violations.push({
          violation_type: row.violation_type,
          violation_description: row.violation_description,
          violation_points: row.violation_points,
        });
      }
    });
    return Object.values(map).sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
  }, [inspections]);

  // ── Repeat violation detection ─────────────────────────────────────────────
  const repeatCategories = useMemo(() => {
    const counts = {};
    uniqueInspections.forEach((insp) => {
      insp.violations.forEach((v) => {
        const key = buildViolationKey(v.violation_description);
        if (key !== "other") counts[key] = (counts[key] || 0) + 1;
      });
    });
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([k]) => k));
  }, [uniqueInspections]);

  // ── Clean streak (inspections with 0 violations) ───────────────────────────
  const cleanStreak = useMemo(() => {
    let streak = 0;
    for (const insp of uniqueInspections) {
      if (insp.violations.length === 0) streak++;
      else break;
    }
    return streak;
  }, [uniqueInspections]);

  const isConsistentPerformer = cleanStreak >= 3 || (uniqueInspections.length >= 3 && uniqueInspections.every((i) => {
    const raw = (i.inspection_score !== undefined && i.inspection_score !== "") ? i.inspection_score : i.score;
    const s = raw !== undefined && raw !== "" ? Math.max(0, 100 - parseInt(raw)) : restaurant.safetyScore;
    return s >= 85;
  }));

  const hasInspections = uniqueInspections.length > 0;
  const grade = (!hasInspections || restaurant.safetyScore === null || restaurant.safetyScore === undefined)
    ? "U"
    : (restaurant.grade || getGrade(restaurant.safetyScore));
  const latestDate = uniqueInspections[0]?.inspection_date;
  const totalRepeatCount = repeatCategories.size;

  // ── Source info ────────────────────────────────────────────────────────────
  const sourceInfo = SOURCE_REGISTRY[restaurant.county_id] || SOURCE_REGISTRY[restaurant.source] || SOURCE_REGISTRY[restaurant.region === "uae" ? "dubai" : null];

  // ── Share handler ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    const text = `${restaurant.name} has a ${grade} food safety grade (${restaurant.safetyScore ?? "N/A"}/100) on SafeEats. Check before you eat! ${window.location.href}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${restaurant.name} Safety Score`, text, url: window.location.href }); }
      catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setShareMsg("Copied!");
      setTimeout(() => setShareMsg(""), 2000);
    }
  };

  const handleFavorite = () => {
    const newState = toggleFavorite(restaurant);
    setFavorited(newState);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── Back ── */}
      <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800 -ml-2" aria-label="Back to search results">
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        Back to results
      </Button>

      {/* ── HERO CARD ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Grade color top bar */}
        <div className={`h-2 w-full ${getGradeColor(grade).split(" ")[0]}`} />

        <div className="p-5 md:p-7">
          {/* Name + actions row */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{restaurant.address}, {restaurant.city} {restaurant.zip_code}</span>
              </div>
              {/* Contact row */}
              <div className="flex flex-wrap gap-3 mt-2">
                <a
                  href={restaurant.website?.startsWith("http") ? restaurant.website : `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + " " + (restaurant.city || "") + " restaurant")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 font-semibold hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {restaurant.website ? "Visit website" : "Find on Google"}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleFavorite}
                className={`p-2.5 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${favorited ? "bg-red-50 border-red-200 text-red-500" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-red-400"}`}
                aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
                aria-pressed={favorited}
              >
                <Heart className={`w-4 h-4 ${favorited ? "fill-current" : ""}`} aria-hidden="true" />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                aria-label="Share safety score"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </button>
              {shareMsg && <span className="text-xs text-green-600 font-semibold">{shareMsg}</span>}
            </div>
          </div>

          {/* Grade + Score + Stats row */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Left: Big grade + gauge */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-5xl font-black shadow-md ${getGradeColor(grade)}`}>
                  {grade}
                </div>
                <span className="text-xs font-bold text-slate-500 mt-1">
                  {grade === "U" ? "No data" : `${hasInspections ? restaurant.safetyScore : "??"}/100`}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {isConsistentPerformer && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <Award className="w-3 h-3" /> Consistent Performer
                  </span>
                )}
                <FailRiskBadge inspections={uniqueInspections} size="lg" />
              </div>
            </div>

            {/* Right: Quick stat boxes */}
            <div className="flex-1 grid grid-cols-2 gap-2.5 w-full">
              <button onClick={() => scrollTo("inspection-history")} className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3 text-left transition-colors group focus:outline-none focus:ring-2 focus:ring-[#4CAF50]" aria-label={`${uniqueInspections.length} total inspections — view history`}>
                <p className="text-xl font-extrabold text-slate-900" aria-hidden="true">{uniqueInspections.length}</p>
                <p className="text-xs text-slate-500 leading-tight" aria-hidden="true">Total inspections</p>
                <p className="text-[10px] text-blue-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">View history ↓</p>
              </button>
              <button onClick={() => scrollTo("inspection-history")} className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3 text-left transition-colors group focus:outline-none focus:ring-2 focus:ring-[#4CAF50]" aria-label={`Last inspected ${latestDate ? new Date(latestDate).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "unknown"} — view history`}>
                <p className="text-lg font-extrabold text-slate-900 leading-tight" aria-hidden="true">
                  {latestDate ? new Date(latestDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                </p>
                <p className="text-xs text-slate-500" aria-hidden="true">Last inspected</p>
                <p className="text-[10px] text-blue-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">View history ↓</p>
              </button>
              <button onClick={() => scrollTo("inspection-history")} className={`rounded-xl p-3 text-left hover:opacity-80 transition-opacity group focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${totalRepeatCount > 0 ? "bg-orange-50" : "bg-green-50"}`} aria-label={`${totalRepeatCount} repeat ${totalRepeatCount === 1 ? "issue" : "issues"} found — view history`}>
                <p className={`text-xl font-extrabold ${totalRepeatCount > 0 ? "text-orange-700" : "text-green-700"}`} aria-hidden="true">{totalRepeatCount}</p>
                <p className={`text-xs ${totalRepeatCount > 0 ? "text-orange-600" : "text-green-600"}`} aria-hidden="true">
                  Repeat {totalRepeatCount === 1 ? "issue" : "issues"}
                </p>
                <p className="text-[10px] text-blue-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">What's this? ↓</p>
              </button>
              <button onClick={() => scrollTo("score-trend")} className={`rounded-xl p-3 text-left hover:opacity-80 transition-opacity group focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${cleanStreak > 0 ? "bg-green-50" : "bg-slate-50"}`} aria-label={`Clean streak of ${cleanStreak} inspections — view trend`}>
                <p className={`text-xl font-extrabold ${cleanStreak > 0 ? "text-green-700" : "text-slate-400"}`} aria-hidden="true">{cleanStreak}</p>
                <p className={`text-xs ${cleanStreak > 0 ? "text-green-600" : "text-slate-500"}`} aria-hidden="true">Clean streak</p>
                <p className="text-[10px] text-blue-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">View trend ↓</p>
              </button>
            </div>
          </div>

          {/* Plain-English safety summary */}
          <div className="mt-5">
            <SafetySnapshot
              score={restaurant.safetyScore}
              grade={grade}
              cleanStreak={cleanStreak}
              repeatCount={totalRepeatCount}
              totalInspections={uniqueInspections.length}
            />
          </div>

          {/* Factor-by-factor breakdown: handwashing, temps, pests, cross-contamination, cleanliness */}
          <div className="mt-4">
            <SafetyFactors restaurant={restaurant} inspections={uniqueInspections} />
          </div>

          {/* ADA Accessibility */}
          <div className="mt-4">
            <ADAAccessibilityBadge restaurant={restaurant} />
          </div>

          {/* ADA Compliance Status */}
          {restaurant.ada_compliance && (
            <div className="mt-3">
              <ADABadge ada_compliance={restaurant.ada_compliance} size="lg" />
            </div>
          )}

          {/* Water Quality */}
          <EPAWaterCard restaurant={restaurant} />

          {/* Portal link — prominent clickable hyperlink to official health department */}
          {restaurant.portal_url && (
            <a
              href={restaurant.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-4 bg-blue-50 border-2 border-blue-300 rounded-xl px-4 py-3 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-extrabold underline">
                {restaurant.portal_name || "View official inspection records"}
              </span>
            </a>
          )}

        </div>

        {/* Data source drawer */}
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowDataSource((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-3 text-xs text-slate-500 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#4CAF50]"
            aria-expanded={showDataSource}
            aria-controls="data-source-panel"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              Data source &amp; last updated
            </span>
            {showDataSource ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
          </button>
          <AnimatePresence>
            {showDataSource && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div id="data-source-panel" className="px-6 pb-5 text-xs text-slate-500 space-y-2">
                  {/* Source-of-truth badge — always visible */}
                  <div className="flex items-center gap-2 mb-1">
                    <DataSourceBadge restaurant={restaurant} size="md" />
                  </div>
                  {sourceInfo ? (
                    <p className="flex items-start gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-green-600 mt-0.5" />
                      Official data from{" "}
                      <a href={sourceInfo.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5">
                        {sourceInfo.name} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </p>
                  ) : restaurant.isLLMData ? (
                    <div className="space-y-1.5">
                      <p className="flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        This data was retrieved via live web search of publicly available health department records by AI (Gemini 3 Flash).
                      </p>
                      {restaurant.verification_source && (
                        <p className="flex items-start gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 mt-0.5" />
                          Verification source: <span className="font-semibold text-slate-700">{restaurant.verification_source}</span>
                        </p>
                      )}
                      {restaurant.is_currently_operating === false && (
                        <p className="flex items-start gap-1.5 text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          This restaurant may be permanently closed — please verify before visiting.
                        </p>
                      )}
                      {restaurant.data_confidence === "low" && (
                        <div className="space-y-1.5">
                          <p className="flex items-start gap-1.5 text-amber-700">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            {restaurant.data_fetch_notes || "Low confidence: the restaurant was found but no detailed inspection records could be located. The score may be unavailable."}
                          </p>
                          {restaurant.portal_url && (
                            <a
                              href={restaurant.portal_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              {restaurant.portal_name || "Check inspection records"}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      This location's data was retrieved via AI-assisted research from publicly available health department records.
                    </p>
                  )}
                  {latestDate && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      Last inspection on record:{" "}
                      <span className="font-semibold text-slate-700">
                        {new Date(latestDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </p>
                  )}
                  <p className="text-slate-400 leading-relaxed">
                    SafeEats displays official government inspection records. Scores are normalized to a 0–100 scale across jurisdictions. Always verify with the official source before making health decisions.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Ko-fi support button ── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border bg-amber-50 border-amber-200">
        <span className="text-xl flex-shrink-0">☕</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700">SafeEats is 100% free — no ads, no paywalls</p>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">If this helped you make a better dining decision, consider buying us a coffee.</p>
          <KofiButton context={restaurant.safetyScore !== null && restaurant.safetyScore < 70 ? "bad_score" : "default"} />
        </div>
      </div>

      {/* ── Directions + Report ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <DirectionsButtons restaurant={restaurant} />
        </div>
        <ReportIssueButton restaurant={restaurant} />
      </div>

      {/* ── Trend chart (only if multiple inspections) ── */}
      {uniqueInspections.length > 1 && (
        <div id="score-trend" className="scroll-mt-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Score Over Time</h2>
            <span className="text-xs text-slate-400">— is it getting better or worse?</span>
          </div>
          <InspectionTrendChart inspections={uniqueInspections} />
        </div>
      )}

      {/* ── Inspection History ── */}
      <div id="inspection-history" className="scroll-mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              📋 Inspection History
            </h2>
            {uniqueInspections.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Each card = one visit from a health inspector. Tap to expand violations.
              </p>
            )}
          </div>

        </div>

        {uniqueInspections.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-bold text-amber-800">No official inspection records in our database</p>
              {restaurant.data_fetch_notes ? (
                <div className="text-xs text-amber-700 mt-1 leading-relaxed">
                  <p>{restaurant.data_fetch_notes} Always verify directly with the local health department.</p>
                  {restaurant.portal_url && (
                    <a
                      href={restaurant.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:underline font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {restaurant.portal_name || "Check inspection records"}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  The score shown is an AI estimate from public sources — not a live government record. It may be outdated. Always call the restaurant or check your local health department's website to verify.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {uniqueInspections.map((insp, idx) => {
              const raw = insp.inspection_score !== undefined ? insp.inspection_score : insp.score;
              const score = raw !== undefined ? Math.max(0, Math.min(100, 100 - parseInt(raw))) : restaurant.safetyScore;
              const isExpanded = expandedInspection === idx;
              const dateStr = insp.inspection_date
                ? new Date(insp.inspection_date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
                : "Unknown date";

              return (
                <motion.div
                  key={insp.inspection_serial_num || idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.25 }}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Inspection header — always visible, tap to expand */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#4CAF50]"
                    onClick={() => setExpandedInspection(isExpanded ? null : idx)}
                    aria-expanded={isExpanded}
                    aria-controls={`inspection-panel-${idx}`}
                    aria-label={`Inspection on ${dateStr} — ${insp.violations.length === 0 ? "no violations" : `${insp.violations.length} violation${insp.violations.length !== 1 ? "s" : ""}`}`}
                  >
                    {idx === 0 && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500 rounded-l-full" />
                    )}
                    <ScoreGauge score={score} size="sm" animate={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">{dateStr}</span>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">Latest</span>
                        )}
                        {insp.inspection_result && (
                          <span className="text-[10px] font-semibold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                            {insp.inspection_result}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {insp.violations.length === 0
                          ? "✓ No violations — clean inspection"
                          : `${insp.violations.length} violation${insp.violations.length !== 1 ? "s" : ""} found`
                        }
                        {insp.violations.some((v) => repeatCategories.has(buildViolationKey(v.violation_description))) && (
                          <span className="ml-2 text-orange-600 font-semibold">· includes repeats</span>
                        )}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />}
                  </button>

                  {/* Expandable violations */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        id={`inspection-panel-${idx}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                          {insp.violations.length === 0 ? (
                            <div className="flex items-center gap-3 py-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <span className="text-lg">✓</span>
                              </div>
                              <p className="text-sm text-slate-600 font-medium">No violations found — clean inspection!</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 pt-3">
                              {insp.violations.map((v, i) => {
                                const vCategory = buildViolationKey(v.violation_description);
                                const isRepeat = repeatCategories.has(vCategory);
                                return (
                                  <ViolationItem
                                    key={i}
                                    violation={v}
                                    isRepeat={isRepeat}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Raw data for power users */}
                          {showRawData && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Raw Record</p>
                              <pre className="text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify({ type: insp.inspection_type, result: insp.inspection_result, score: insp.inspection_score, serial: insp.inspection_serial_num }, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}