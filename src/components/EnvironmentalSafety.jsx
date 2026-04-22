import React from "react";
import { AlertTriangle, Droplet, Wind, Zap, ExternalLink } from "lucide-react";

const getAQILevel = (aqi) => {
  if (!aqi) return { label: "Unknown", color: "bg-slate-100 text-slate-600", level: "—" };
  if (aqi <= 50) return { label: "Good", color: "bg-green-100 text-green-700", level: "✅" };
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-100 text-yellow-700", level: "⚠️" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-100 text-orange-700", level: "⚠️⚠️" };
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-100 text-red-700", level: "🚨" };
  return { label: "Very Unhealthy", color: "bg-red-200 text-red-900", level: "🚨🚨" };
};

const getWaterViolationLevel = (violations) => {
  if (!violations && violations !== 0) return { label: "No Data", color: "bg-slate-100 text-slate-600" };
  if (violations === 0) return { label: "No Violations", color: "bg-green-100 text-green-700" };
  if (violations <= 2) return { label: `${violations} Violation${violations !== 1 ? "s" : ""}`, color: "bg-yellow-100 text-yellow-700" };
  return { label: `${violations} Violation${violations !== 1 ? "s" : ""}`, color: "bg-red-100 text-red-700" };
};

const getHazardWasteLevel = (score) => {
  if (!score && score !== 0) return { label: "No Data", color: "bg-slate-100 text-slate-600" };
  if (score < 20) return { label: "Low Risk", color: "bg-green-100 text-green-700" };
  if (score < 50) return { label: "Moderate Risk", color: "bg-yellow-100 text-yellow-700" };
  return { label: "High Risk", color: "bg-red-100 text-red-700" };
};

export default function EnvironmentalSafety({ epa_data, epa_status, epa_logs, restaurant }) {
  if (!epa_data || !epa_status) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Environmental Data Unavailable</p>
            <p className="text-xs text-red-600 mt-1">
              {epa_status === "geocoding_failed" && "Could not geocode restaurant address."}
              {epa_status === "state_mismatch" && "No facilities found in restaurant state."}
              {epa_status === "distance_exceeded" && "Nearest facility beyond 3-mile radius."}
              {epa_status === "invalid_facility_type" && "No water facilities found."}
              {epa_status === "no_valid_facilities" && "No facilities met validation criteria."}
              {!["geocoding_failed", "state_mismatch", "distance_exceeded", "invalid_facility_type", "no_valid_facilities"].includes(epa_status) && "EPA data not available for this location."}
            </p>
            {epa_logs && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-red-600 underline">Debug logs</summary>
                <pre className="mt-1 bg-slate-900 text-slate-100 p-2 rounded text-[10px] overflow-auto max-h-48">
                  {JSON.stringify(epa_logs, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  const aqi = epa_data.air_quality_index;
  const violations = epa_data.water_quality_violations;
  const hazardScore = epa_data.hazardous_waste_score;

  const aqiInfo = getAQILevel(aqi);
  const waterInfo = getWaterViolationLevel(violations);
  const hazardInfo = getHazardWasteLevel(hazardScore);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Zap className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-extrabold text-slate-800">Environmental Safety</p>
          <p className="text-xs text-slate-500">EPA facility data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Air Quality */}
        <div className={`rounded-xl p-4 ${aqiInfo.color}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Air Quality</p>
          </div>
          {aqi !== null ? (
            <>
              <p className="text-2xl font-black">{aqi}</p>
              <p className="text-xs mt-1 font-semibold">{aqiInfo.label}</p>
            </>
          ) : (
            <p className="text-xs font-semibold">No data</p>
          )}
        </div>

        {/* Water Quality */}
        <div className={`rounded-xl p-4 ${waterInfo.color}`}>
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Water Violations</p>
          </div>
          {violations !== null ? (
            <>
              <p className="text-2xl font-black">{violations}</p>
              <p className="text-xs mt-1 font-semibold">{waterInfo.label}</p>
            </>
          ) : (
            <p className="text-xs font-semibold">No data</p>
          )}
        </div>

        {/* Hazardous Waste */}
        <div className={`rounded-xl p-4 ${hazardInfo.color}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Hazard Score</p>
          </div>
          {hazardScore !== null ? (
            <>
              <p className="text-2xl font-black">{hazardScore.toFixed(1)}</p>
              <p className="text-xs mt-1 font-semibold">{hazardInfo.label}</p>
            </>
          ) : (
            <p className="text-xs font-semibold">No data</p>
          )}
        </div>
      </div>

      {/* EPA Link */}
      {epa_data.epa_facility_id && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <a
            href={`https://echo.epa.gov/detailed-facility-report?fid=${epa_data.epa_facility_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            View Full EPA Report
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <p className="text-[10px] text-slate-500 mt-4">Data sourced from EPA ECHO Facility Search. Updated periodically.</p>
    </div>
  );
}