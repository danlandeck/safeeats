import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DirectionsButtons from "./DirectionsButtons";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Phone, Globe, Share2, Heart,
  ChevronDown, ChevronUp, Info, Calendar, ShieldCheck,
  ExternalLink, Award, Users
} from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import ViolationItem from "./ViolationItem";
import InspectionTrendChart from "./InspectionTrendChart";
import FailRiskBadge from "./FailRiskBadge";
import ReportIssueButton from "./ReportIssueButton";
import ADAAccessibilityBadge from "./ADAAccessibilityBadge";
import KofiButton from "./KofiButton";
import { getGrade, getGradeColor } from "../utils/grading";
import { isFavorite, toggleFavorite } from "../utils/favorites";
import { translateViolation } from "../utils/violationTranslator";

// ── Jargon → category for repeat detection ──────────────────────────────────
function buildViolationKey(desc) {
  const { category } = translateViolation(desc);
  return category;
}

// ── Family-friendly verdict copy ─────────────────────────────────────────────
function getFamilySummary(score, grade, repeatCount, cleanStreak) {
  if (score === null || score === undefined) {
    return { emoji: "❓", headline: "No inspection data available", body: "We couldn't find official records for this location. Use extra caution.", color: "bg-slate-50 border-slate-200 text-slate-700" };
  }
  if (cleanStreak >= 3) {
    return { emoji: "⭐", headline: "Consistently clean — great for families", body: "This place has passed multiple inspections in a row with no issues.", color: "bg-green-50 border-green-200 text-green-800" };
  }
  if (score >= 90) {
    return { emoji: "✅", headline: "Excellent food safety record", body: "Very low risk. Inspectors found no significant issues.", color: "bg-green-50 border-green-200 text-green-800" };
  }
  if (score >= 80) {
    return { emoji: "👍", headline: "Good safety record", body: "Minor issues noted, but nothing serious. Generally safe.", color: "bg-green-50 border-green-200 text-green-800" };
  }
  if (score >= 70) {
    return { emoji: "⚠️", headline: "Some concerns — proceed with care", body: "A few issues were found. Worth keeping an eye on repeat violations.", color: "bg-yellow-50 border-yellow-200 text-yellow-800" };
  }
  if (repeatCount >= 2) {
    return { emoji: "🔴", headline: "Ongoing safety issues", body: "This restaurant has repeat violations across multiple inspections. Families with young children or immunocompromised members should be cautious.", color: "bg-red-50 border-red-200 text-red-800" };
  }
  return { emoji: "⚠️", headline: "Below-average safety record", body: "Significant issues were found. The restaurant may have addressed them — check the most recent inspection.", color: "bg-orange-50 border-orange-200 text-orange-800" };
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
    const raw = i.inspection_score !== undefined ? i.inspection_score : i.score;
    const s = raw !== undefined ? Math.max(0, 100 - parseInt(raw)) : restaurant.safetyScore;
    return s >= 85;
  }));

  const hasInspections = uniqueInspections.length > 0;
  const grade = (!hasInspections || restaurant.safetyScore === null || restaurant.safetyScore === undefined)
    ? "U"
    : (restaurant.grade || getGrade(restaurant.safetyScore));
  const latestDate = uniqueInspections[0]?.inspection_date;
  const totalRepeatCount = repeatCategories.size;
  const familySummary = getFamilySummary(restaurant.safetyScore, grade, totalRepeatCount, cleanStreak);

  // ── Source info ────────────────────────────────────────────────────────────
  const sourceInfo = SOURCE_REGISTRY[restaurant.county_id] || SOURCE_REGISTRY[restaurant.source];

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
      <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to results
      </Button>

      {/* ── HERO CARD ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Top accent strip showing grade color */}
        <div className={`h-1.5 w-full ${getGradeColor(grade).split(" ")[0]}`} />

        <div className="p-6 md:p-8">
          {/* Name + actions row */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{restaurant.address}, {restaurant.city} {restaurant.zip_code}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleFavorite}
                className={`p-2.5 rounded-xl border transition-all ${favorited ? "bg-red-50 border-red-200 text-red-500" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-red-400"}`}
                title={favorited ? "Remove from favorites" : "Save to favorites"}
              >
                <Heart className={`w-4 h-4 ${favorited ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 transition-all"
                title="Share safety score"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {shareMsg && (
                <span className="text-xs text-green-600 font-semibold">{shareMsg}</span>
              )}
            </div>
          </div>

          {/* GAUGE — hero element */}
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="flex flex-col items-center gap-3">
              <ScoreGauge score={hasInspections ? restaurant.safetyScore : null} size="lg" animate={true} />
              <span className={`text-base font-extrabold px-4 py-1.5 rounded-xl ${getGradeColor(grade)}`}>
                {grade === "U" ? "Unknown" : `Grade ${grade}`}
              </span>
              {isConsistentPerformer && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <Award className="w-3.5 h-3.5" /> Consistent Performer
                </span>
              )}
              <FailRiskBadge inspections={uniqueInspections} size="lg" />
            </div>

            {/* Quick stats — each taps to the relevant section */}
            <div className="flex-1 grid grid-cols-2 gap-3 w-full sm:w-auto">
              <button onClick={() => scrollTo("inspection-history")} className="bg-slate-50 rounded-2xl p-3 text-center hover:bg-slate-100 transition-colors cursor-pointer group">
                <p className="text-xl font-extrabold text-slate-900">{uniqueInspections.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Inspections on record</p>
                <p className="text-[10px] text-blue-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Tap to view ↓</p>
              </button>
              <button onClick={() => scrollTo("inspection-history")} className="bg-slate-50 rounded-2xl p-3 text-center hover:bg-slate-100 transition-colors cursor-pointer group">
                <p className="text-xl font-extrabold text-slate-900">
                  {latestDate ? new Date(latestDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Last inspected</p>
                <p className="text-[10px] text-blue-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Tap to view ↓</p>
              </button>
              <button onClick={() => scrollTo("inspection-history")} className={`rounded-2xl p-3 text-center hover:opacity-80 transition-opacity cursor-pointer group ${totalRepeatCount > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                <p className={`text-xl font-extrabold ${totalRepeatCount > 0 ? "text-orange-700" : "text-green-700"}`}>
                  {totalRepeatCount}
                </p>
                <p className={`text-xs mt-0.5 ${totalRepeatCount > 0 ? "text-orange-600" : "text-green-600"}`}>
                  Repeat issue{totalRepeatCount !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-blue-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Tap to view ↓</p>
              </button>
              <button onClick={() => scrollTo("score-trend")} className={`rounded-2xl p-3 text-center hover:opacity-80 transition-opacity cursor-pointer group ${cleanStreak > 0 ? "bg-green-50" : "bg-slate-50"}`}>
                <p className={`text-xl font-extrabold ${cleanStreak > 0 ? "text-green-700" : "text-slate-400"}`}>
                  {cleanStreak}
                </p>
                <p className={`text-xs mt-0.5 ${cleanStreak > 0 ? "text-green-600" : "text-slate-500"}`}>
                  Clean in a row
                </p>
                <p className="text-[10px] text-blue-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Tap to view ↓</p>
              </button>
            </div>
          </div>

          {/* Family-friendly summary */}
          <div className={`mt-5 flex items-start gap-3 p-4 rounded-2xl border ${familySummary.color}`}>
            <span className="text-xl flex-shrink-0">{familySummary.emoji}</span>
            <div>
              <p className="text-sm font-bold">{familySummary.headline}</p>
              <p className="text-xs mt-0.5 leading-relaxed opacity-80">{familySummary.body}</p>
            </div>
          </div>

          {/* ADA Accessibility */}
          <div className="mt-5">
            <ADAAccessibilityBadge restaurant={restaurant} />
          </div>

          {/* Contact + directions */}
          <div className="flex flex-wrap gap-3 mt-5">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone.replace(/[^+\d]/g, "")}`}
                className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium hover:underline">
                <Phone className="w-4 h-4" />{restaurant.phone}
              </a>
            )}
            <a
              href={restaurant.website?.startsWith("http") ? restaurant.website : `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + " " + (restaurant.city || "") + " restaurant")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline"
            >
              <Globe className="w-4 h-4" />
              {restaurant.website ? "Website" : "Find online"}
            </a>
          </div>
        </div>

        {/* Data source drawer */}
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowDataSource((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-3 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Data source &amp; last updated
            </span>
            {showDataSource ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                <div className="px-6 pb-5 text-xs text-slate-500 space-y-2">
                  {sourceInfo ? (
                    <p className="flex items-start gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-green-600 mt-0.5" />
                      Official data from{" "}
                      <a href={sourceInfo.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5">
                        {sourceInfo.name} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </p>
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
      <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
        (restaurant.safetyScore !== null && restaurant.safetyScore < 70)
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}>
        <span className="text-xl flex-shrink-0">☕</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700">
            {(restaurant.safetyScore !== null && restaurant.safetyScore < 70)
              ? "Glad we warned you? Help keep SafeEats free!"
              : "Find SafeEats useful? Help keep it running!"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">100% free, no ads — powered by your support.</p>
          <KofiButton context={restaurant.safetyScore < 70 ? "bad_score" : "default"} />
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
          <InspectionTrendChart inspections={uniqueInspections} />
        </div>
      )}

      {/* ── Inspection History ── */}
      <div id="inspection-history" className="scroll-mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Inspection History
          </h2>
          {uniqueInspections.length > 0 && (
            <button
              onClick={() => setShowRawData((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold border border-slate-200 px-3 py-1.5 rounded-lg bg-white transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              {showRawData ? "Simple view" : "Power user view"}
            </button>
          )}
        </div>

        {uniqueInspections.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">No official inspection records found</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                The safety score shown is an AI estimate based on publicly available sources. It is not from a live government database and may not reflect the most recent inspection.
              </p>
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
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedInspection(isExpanded ? null : idx)}
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
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </button>

                  {/* Expandable violations */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
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