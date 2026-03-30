import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, FileText, Hash } from "lucide-react";
import ViolationItem from "./ViolationItem";
import ScoreGauge from "./ScoreGauge";

export default function InspectionDetail({ inspection, violations, isLatest }) {
  const inspScore = parseInt(inspection.inspection_score) || 0;
  // King County: lower score = better. 0 is perfect. Convert to 0-100 safety score.
  const safetyScore = Math.max(0, Math.min(100, 100 - inspScore));

  const resultColor = {
    "Satisfactory": "bg-emerald-100 text-emerald-800",
    "Unsatisfactory": "bg-red-100 text-red-800",
    "Complete": "bg-blue-100 text-blue-800",
    "Incomplete": "bg-amber-100 text-amber-800",
  };

  return (
    <Card className="border border-slate-100 overflow-hidden">
      {isLatest && (
        <div className="bg-slate-900 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>
          Most Recent Inspection
        </div>
      )}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ScoreGauge score={safetyScore} size="sm" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(inspection.inspection_date), "MMMM d, yyyy")}
                </span>
                <Badge className={`${resultColor[inspection.inspection_result] || "bg-slate-100 text-slate-700"} text-[11px] font-medium`}>
                  {inspection.inspection_result}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {inspection.inspection_type}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Score: {inspScore} penalty pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-5">
        {violations.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Violations ({violations.length})
            </h4>
            {violations.map((v, i) => (
              <ViolationItem key={i} violation={v} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">✓</span>
            </div>
            <p className="text-sm text-slate-500">No violations found — clean inspection!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}