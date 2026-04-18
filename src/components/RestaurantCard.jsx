import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ClipboardList, ChevronRight, GitCompareArrows, Heart } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import FailRiskBadge from "./FailRiskBadge";
import { format } from "date-fns";
import { getGrade, getGradeColor } from "../utils/grading";
import { isFavorite, toggleFavorite } from "../utils/favorites";

export default function RestaurantCard({ restaurant, onClick, onToggleCompare, isCompared, compareDisabled }) {
  const { name, address, city, zip_code, safetyScore, totalInspections, latestDate, latestResult, inspectionHistory } = restaurant;
  const isUnknown = safetyScore === null || safetyScore === undefined;
  const grade = isUnknown ? "U" : getGrade(safetyScore);
  const [favorited, setFavorited] = useState(() => isFavorite(restaurant.business_id));

  const handleFav = (e) => {
    e.stopPropagation();
    const newState = toggleFavorite(restaurant);
    setFavorited(newState);
  };

  return (
    <Card
      className={`group relative overflow-hidden border hover:shadow-md transition-all duration-300 cursor-pointer bg-white ${
        isCompared ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-100 hover:border-slate-300"
      }`}
      onClick={onClick}
    >
      {/* Grade color accent */}
      {!isUnknown && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getGradeColor(grade).split(" ")[0]}`} />
      )}
      <div className="flex items-center gap-4 p-4 pl-5">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <ScoreGauge score={isUnknown ? null : safetyScore} size="sm" animate={false} />
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${isUnknown ? "bg-slate-100 text-slate-400" : getGradeColor(grade)}`}>
            {grade}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-base truncate leading-tight">{name}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleFav}
                className={`p-1.5 rounded-lg transition-all ${favorited ? "text-red-500" : "text-slate-200 hover:text-red-400"}`}
                title={favorited ? "Remove from favorites" : "Save to favorites"}
              >
                <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-current" : ""}`} />
              </button>
              {onToggleCompare && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleCompare(restaurant); }}
                  disabled={compareDisabled && !isCompared}
                  className={`p-1.5 rounded-lg transition-all ${
                    isCompared ? "bg-blue-100 text-blue-700" : compareDisabled ? "text-slate-200 cursor-not-allowed" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"
                  }`}
                  title={isCompared ? "Remove from compare" : "Add to compare"}
                >
                  <GitCompareArrows className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors mt-0.5" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{address}, {city} {zip_code}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {latestResult && (
              <Badge variant="outline" className="text-[10px] font-medium bg-slate-50 text-slate-600 border-slate-200 pointer-events-none">
                {latestResult}
              </Badge>
            )}
            {inspectionHistory && <FailRiskBadge inspections={inspectionHistory} />}
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <ClipboardList className="w-2.5 h-2.5" />
              {totalInspections} inspection{totalInspections !== 1 ? "s" : ""}
            </span>
            {latestDate && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(latestDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}