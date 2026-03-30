import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ClipboardList, ChevronRight } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { format } from "date-fns";
import { getGrade, getGradeColor } from "../utils/grading";

export default function RestaurantCard({ restaurant, onClick }) {
  const { name, address, city, zip_code, safetyScore, totalInspections, latestDate, latestResult } = restaurant;
  const grade = restaurant.grade || getGrade(safetyScore);

  return (
    <Card
      className="group relative overflow-hidden border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer bg-white"
      onClick={onClick}
    >
      <div className="flex items-center gap-5 p-5">
        <div className="flex flex-col items-center gap-1">
          <ScoreGauge score={safetyScore} size="sm" />
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${getGradeColor(grade)}`}>{grade}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-base truncate">{name}</h3>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors flex-shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{address}, {city} {zip_code}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2.5">
            {latestResult && (
              <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 text-slate-700 border-slate-200">
                {latestResult}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <ClipboardList className="w-3 h-3" />
              {totalInspections} inspection{totalInspections !== 1 ? "s" : ""}
            </span>
            {latestDate && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3" />
                {format(new Date(latestDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}