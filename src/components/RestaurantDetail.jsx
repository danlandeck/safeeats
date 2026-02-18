import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, Building2, ClipboardList } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import InspectionDetail from "./InspectionDetail";
import AdPlacement from "./AdPlacement";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 text-slate-500 hover:text-slate-800 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to results
        </Button>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <ScoreGauge score={restaurant.safetyScore} size="lg" />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{restaurant.description}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {restaurant.address}, {restaurant.city} {restaurant.zip_code}
                </span>
                {restaurant.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {restaurant.phone}
                  </span>
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

      {/* Ad Placement */}
      <AdPlacement slot="1234567890" format="horizontal" />

      {/* Inspection History */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 tracking-tight">
          Food Safety Inspection History
        </h2>
        <div className="space-y-4">
          {uniqueInspections.map((insp) => (
            <InspectionDetail
              key={insp.inspection_serial_num}
              inspection={insp}
              violations={insp.violations}
            />
          ))}
        </div>
      </div>
    </div>
  );
}