import React from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, ClipboardList, ChevronRight, GitCompareArrows, AlertTriangle, ExternalLink } from "lucide-react";
import { format, isValid } from "date-fns";
import { getGrade, getGradeColor, resolveGrade } from "../utils/grading";

import FailRiskBadge from "./FailRiskBadge";
import DietaryBadges from "./DietaryBadges";
import ADABadge from "./ADABadge";
import EPAWaterCard from "./EPAWaterCard";
import DataSourceBadge from "./DataSourceBadge";




const GRADE_EMOJIS = { A: "🟢", B: "🟡", C: "🟠", D: "🔴", F: "🚨", P: "✅", U: "❓" };
const GRADE_LABELS = {
  A: "🌟 Super safe — eat here!",
  B: "😊 Pretty good — mostly safe",
  C: "🤔 Okay — a few things to know",
  D: "⚠️ Hmm — some real problems",
  F: "🚨 Careful — serious issues found",
  P: "✅ Passed inspection — met health standards",
  U: "❓ Not sure yet — no data",
};

export default function RestaurantCard({ restaurant, onClick, onToggleCompare, isCompared, compareDisabled }) {
  const { name, address, city, zip_code, safetyScore, totalInspections, latestDate, latestResult, inspectionHistory } = restaurant;
  const isUnknown = safetyScore === null || safetyScore === undefined;
  const grade = isUnknown ? "U" : (restaurant.grade || resolveGrade(safetyScore, restaurant.latestResult));
  const gradeColor = getGradeColor(grade);
  const gradeEmoji = GRADE_EMOJIS[grade] || "❓";

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-200 cursor-pointer bg-white ${
        isCompared
          ? "border-4 border-blue-400 ring-2 ring-blue-100 shadow-lg"
          : "border-2 border-slate-200 hover:border-[#4CAF50] hover:shadow-xl hover:-translate-y-0.5"
      }`}
      style={{ borderRadius: 20, fontFamily: "Nunito, sans-serif" }}
      onClick={onClick}
      role="article"
      aria-label={`${name} — Grade ${grade}, safety score ${isUnknown ? "unknown" : `${safetyScore} out of 100`}`}
    >
      <div className="flex items-stretch min-h-[90px]">
        {/* Grade block — BIG and obvious */}
        <div
          className={`flex flex-col items-center justify-center px-4 py-3 flex-shrink-0 min-w-[80px] ${gradeColor}`}
          style={{ borderRadius: "18px 0 0 18px" }}
          aria-label={`Grade ${grade}${isUnknown ? " — no data" : `, score ${safetyScore} out of 100`}`}
        >
          <span className="text-4xl font-black leading-none" aria-hidden="true">{grade}</span>
          <span className="text-[9px] font-extrabold mt-1 opacity-90 text-center leading-tight" aria-hidden="true">
            {isUnknown ? "NO DATA" : grade === "P" ? "PASS" : `${safetyScore}/100`}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-slate-900 text-base leading-tight truncate">{name}</h3>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{address}{city ? `, ${city}` : ""} {zip_code}</span>
              </div>
            </div>
            {/* Action icons */}
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {onToggleCompare && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleCompare(restaurant); }}
                  disabled={compareDisabled && !isCompared}
                  className={`p-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${
                    isCompared ? "bg-blue-100 text-blue-700" : compareDisabled ? "text-slate-200 cursor-not-allowed" : "text-slate-300 hover:text-blue-500"
                  }`}
                  aria-label={isCompared ? `Remove ${name} from comparison` : `Add ${name} to comparison`}
                  aria-pressed={isCompared}
                >
                  <GitCompareArrows className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            {/* Plain-English grade label */}
            <span className="text-[11px] font-extrabold text-slate-600">
              {GRADE_LABELS[grade]}
            </span>

            {/* Source-of-truth badge */}
            <DataSourceBadge restaurant={restaurant} size="sm" />

            {/* Risk badge */}
            {inspectionHistory && <FailRiskBadge inspections={inspectionHistory} />}

            {/* Inspection count */}
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-bold">
              <ClipboardList className="w-2.5 h-2.5" />
              {totalInspections} check{totalInspections !== 1 ? "s" : ""}
            </span>

            {/* Last inspected */}
            {latestDate && isValid(new Date(latestDate)) && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-bold">
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(latestDate), "MMM d, yyyy")}
              </span>
            )}
          </div>

          {/* Cuisine + Dietary badges */}
          <DietaryBadges restaurant={restaurant} maxShow={3} />

          {/* ADA Compliance Badge — always show */}
          <div className="mt-2">
            <ADABadge ada_compliance={restaurant.ada_compliance || "unknown"} size="sm" />
          </div>

          {/* EPA Water info — US restaurants only (component returns null for international) */}
          <EPAWaterCard restaurant={restaurant} />

          {/* Portal link — clickable hyperlink to official health department */}
          {restaurant.portal_url && (
            <a
              href={restaurant.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 mt-2 bg-blue-50 border-2 border-blue-300 rounded-xl px-3 py-2 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-extrabold underline">
                {restaurant.portal_name || "View official inspection records"}
              </span>
            </a>
          )}

          {/* Data fetch issue strip — transparently shows why data might be missing */}
          {restaurant.data_fetch_notes && (
            <div className="flex items-start gap-1.5 mt-2 bg-amber-50 border-2 border-amber-200 rounded-xl px-2 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-[10px] font-bold text-amber-700">
                {restaurant.data_fetch_notes}
              </span>
            </div>
          )}

          {/* Warning strip for low grades */}
          {(grade === "D" || grade === "F") && !restaurant.portal_url && (
            <div className="flex items-center gap-1.5 mt-2 bg-red-50 border-2 border-red-300 rounded-xl px-2 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-[10px] font-extrabold text-red-700">
                {grade === "F" ? "🚨 Big problems found — tap to see the details!" : "⚠️ Some issues found — good to know before you go!"}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}