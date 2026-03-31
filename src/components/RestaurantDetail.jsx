import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, Building2, ClipboardList, Globe } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import InspectionDetail from "./InspectionDetail";
import InspectionTrendChart from "./InspectionTrendChart";
import { getGrade, getGradeColor } from "../utils/grading";

export default function RestaurantDetail({ restaurant, inspections, onBack }) {
  // Group inspections by serial number, collect violations per inspection
  const inspectionMap = {};
  inspections.forEach((row) => {
    const key = row.inspection_serial_num;
    if (!inspectionMap[key]) {
      inspectionMap[key] = {
        ...row,
        violations: [],
      };
    }
    if (row.violation_description && row.violation_description.trim()) {
      inspectionMap[key].violations.push({
        violation_type: row.violation_type,
        violation_description: row.violation_description,
        violation_points: row.violation_points,
      });
    }
  });

  const uniqueInspections = Object.values(inspectionMap).sort(
    (a, b) => new Date(b.inspection_date) - new Date(a.inspection_date)
  );

  const grade = restaurant.grade || getGrade(restaurant.safetyScore);

  // Legacy (average) grade across all inspections
  const legacyScores = uniqueInspections
    .map((insp) => {
      const raw = insp.inspection_score !== undefined ? insp.inspection_score : insp.score;
      return raw !== undefined ? Math.max(0, Math.min(100, 100 - parseInt(raw))) : 0;
    })
    .filter((s) => s > 0);
  const avgScore = legacyScores.length > 0
    ? Math.round(legacyScores.reduce((a, b) => a + b, 0) / legacyScores.length)
    : restaurant.safetyScore;
  const legacyGrade = getGrade(avgScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-4 text-slate-500 hover:text-slate-800 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to results
        </Button>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <ScoreGauge score={restaurant.safetyScore} size="lg" />
              <div className="flex flex-col items-center gap-1">
                <span className={`text-sm font-extrabold px-3 py-1 rounded-lg ${getGradeColor(grade)}`}>
                  Current: Grade {grade}
                </span>
                {uniqueInspections.length > 1 && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg border-2 ${getGradeColor(legacyGrade)} opacity-80`}>
                    Legacy: Grade {legacyGrade} ({avgScore})
                  </span>
                )}
                {uniqueInspections.length > 1 && (
                  <p className="text-[10px] text-slate-400">avg · {uniqueInspections.length} inspections</p>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{restaurant.description}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" />{restaurant.address}, {restaurant.city} {restaurant.zip_code}</span>
                {restaurant.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" />{restaurant.phone}</span>
                )}
                {restaurant.website && (
                  <a
                    href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-700 font-semibold hover:text-slate-900 underline underline-offset-2 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-slate-400" />
                    {restaurant.website.replace(/^https?:\/\//, '').replace(/\/+$/, '')}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Badge variant="outline" className="bg-slate-50 text-slate-700 gap-1">
                  <ClipboardList className="w-3 h-3" />
                  {uniqueInspections.length} Inspection{uniqueInspections.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 gap-1">
                  <Building2 className="w-3 h-3" />
                  {restaurant.business_id}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {uniqueInspections.length > 1 && (
        <InspectionTrendChart inspections={uniqueInspections} />
      )}

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">
          Food Safety Inspection History
        </h2>
        {uniqueInspections.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">No inspection records available</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                The safety score shown is an AI estimate based on publicly available information. This jurisdiction may not publish detailed inspection records online, or no recent inspections were found.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {uniqueInspections.map((insp, idx) => (
              <InspectionDetail
                key={insp.inspection_serial_num}
                inspection={insp}
                violations={insp.violations}
                isLatest={idx === 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}