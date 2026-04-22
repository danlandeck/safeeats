import React from "react";
import { AlertTriangle, Droplet, ExternalLink } from "lucide-react";

const getGradeColor = (grade) => {
  const colors = {
    A: "bg-green-100 text-green-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-yellow-100 text-yellow-700",
    D: "bg-red-100 text-red-700",
  };
  return colors[grade] || "bg-slate-100 text-slate-600";
};

const getGradeLabel = (grade) => {
  const labels = {
    A: "Safe",
    B: "Generally Safe",
    C: "Caution",
    D: "Unsafe",
  };
  return labels[grade] || "Unknown";
};

const getGradeExplanation = (grade) => {
  const explanations = {
    A: "No violations in the last 3 years and no active health advisories.",
    B: "Minor monitoring violations but no major water quality issues.",
    C: "Multiple violations or incomplete survey data — use caution.",
    D: "Active health advisories or major water quality violations — do not consume.",
  };
  return explanations[grade] || "";
};

export default function WaterSystemInfo({ restaurant }) {
  const {
    water_system_name,
    water_system_id,
    water_source_type,
    sanitary_survey_score,
    monitoring_violations,
    water_quality_violations,
    health_advisories,
    water_safety_grade,
  } = restaurant;

  // If no water system data, don't render
  if (!water_system_name && !water_safety_grade) {
    return null;
  }

  const gradeColor = getGradeColor(water_safety_grade);
  const gradeLabel = getGradeLabel(water_safety_grade);
  const explanation = getGradeExplanation(water_safety_grade);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Droplet className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-extrabold text-slate-800">Water Safety (Washington)</p>
          <p className="text-xs text-slate-500">Drinking water system data</p>
        </div>
      </div>

      {/* Water system name */}
      {water_system_name && (
        <div className="mb-4 pb-4 border-b border-blue-200">
          <p className="text-xs text-slate-500 font-semibold mb-1">Water System</p>
          <p className="text-sm font-bold text-slate-800">{water_system_name}</p>
          {water_system_id && (
            <p className="text-xs text-slate-400 mt-1">ID: {water_system_id}</p>
          )}
        </div>
      )}

      {/* Grade badge */}
      <div className="mb-5">
        <div className={`rounded-xl p-4 ${gradeColor} inline-block`}>
          <div className="text-4xl font-black">{water_safety_grade}</div>
          <p className="text-xs font-bold mt-1">{gradeLabel}</p>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-slate-700 mb-5 leading-relaxed">{explanation}</p>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {water_source_type && (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-slate-500 font-semibold mb-1">Source Type</p>
            <p className="text-sm font-bold text-slate-800 capitalize">
              {water_source_type === "surface" ? "Surface Water" : water_source_type === "groundwater" ? "Groundwater" : water_source_type === "well" ? "Well" : water_source_type}
            </p>
          </div>
        )}
        {sanitary_survey_score !== null && sanitary_survey_score !== undefined && (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-slate-500 font-semibold mb-1">Sanitary Survey</p>
            <p className="text-sm font-bold text-slate-800">{sanitary_survey_score.toFixed(1)}</p>
          </div>
        )}
        {monitoring_violations !== null && monitoring_violations !== undefined && (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-slate-500 font-semibold mb-1">Monitoring Violations</p>
            <p className="text-sm font-bold text-slate-800">{monitoring_violations}</p>
          </div>
        )}
        {water_quality_violations !== null && water_quality_violations !== undefined && (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-slate-500 font-semibold mb-1">Water Quality Violations</p>
            <p className="text-sm font-bold text-slate-800">{water_quality_violations}</p>
          </div>
        )}
        {health_advisories !== null && health_advisories !== undefined && health_advisories > 0 && (
          <div className="bg-red-50 rounded-lg p-3 border border-red-200 col-span-2">
            <p className="text-xs text-red-600 font-semibold mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Active Health Advisories
            </p>
            <p className="text-sm font-bold text-red-700">{health_advisories} Advisory/Advisories</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500">Data sourced from Washington State Department of Health Drinking Water System database. Last 3 years of violations shown.</p>
    </div>
  );
}