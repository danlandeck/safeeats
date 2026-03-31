import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

const RISK_CONFIG = {
  Low:      { color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200", bar: "bg-green-500",  icon: TrendingDown },
  Moderate: { color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200", bar: "bg-amber-400",  icon: Minus },
  High:     { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200",bar: "bg-orange-500", icon: TrendingUp },
  Critical: { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",   bar: "bg-red-500",    icon: AlertTriangle },
};

function buildPrompt(restaurant, inspections) {
  const recentInspections = inspections.slice(0, 8).map((insp) => {
    const score = insp.inspection_score !== undefined ? insp.inspection_score : (insp.score || 0);
    const safetyScore = Math.max(0, Math.min(100, 100 - parseInt(score)));
    const viols = (insp.violations || []).map((v) => v.violation_description || v).filter(Boolean).slice(0, 3);
    return `- Date: ${insp.inspection_date || insp.date || "unknown"}, Score: ${safetyScore}/100, Result: ${insp.inspection_result || insp.result || "unknown"}${viols.length ? `, Violations: ${viols.join("; ")}` : ""}`;
  }).join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().getMonth() + 1; // 1-12

  return `Today is ${today} (month ${month}).

Restaurant: "${restaurant.name}" located in ${restaurant.city || "unknown city"}.
Business type inferred from name and context.

Recent inspection history (most recent first):
${recentInspections || "No inspection records available."}

Based on this data, assess the risk of this restaurant receiving violations in its NEXT inspection. Consider:
1. Score trend (improving, declining, or stable)
2. Recurring violation patterns
3. Seasonal factors (summer = higher food temp risk, etc.)
4. How recent the last inspection was

Return a JSON risk assessment.`;
}

const SCHEMA = {
  type: "object",
  properties: {
    risk_level: { type: "string", enum: ["Low", "Moderate", "High", "Critical"] },
    risk_score: { type: "number", description: "0-100, higher = more risk" },
    trend: { type: "string", enum: ["Improving", "Stable", "Declining"] },
    summary: { type: "string", description: "1-2 sentence plain English summary" },
    top_risk_factors: { type: "array", items: { type: "string" }, description: "Up to 3 specific risk factors" },
    positive_indicators: { type: "array", items: { type: "string" }, description: "Up to 2 positive indicators" },
    seasonal_note: { type: "string", description: "One sentence on seasonal risk, if relevant" },
  },
};

export default function RiskScoreCard({ restaurant, inspections }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ran, setRan] = useState(false);

  useEffect(() => {
    setData(null);
    setRan(false);
    setExpanded(false);
  }, [restaurant.business_id]);

  const analyze = async () => {
    setLoading(true);
    setExpanded(true);
    const result = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash",
      prompt: buildPrompt(restaurant, inspections),
      add_context_from_internet: false,
      response_json_schema: SCHEMA,
    });
    setData(result);
    setLoading(false);
    setRan(true);
  };

  const cfg = data ? RISK_CONFIG[data.risk_level] || RISK_CONFIG.Moderate : null;
  const Icon = cfg?.icon || Sparkles;

  return (
    <Card className={`border-2 overflow-hidden transition-all ${cfg ? `${cfg.border} ${cfg.bg}` : "border-slate-200 bg-white"}`}>
      {/* Header row — always visible */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg ? cfg.bg : "bg-slate-100"}`}>
            <Sparkles className={`w-4 h-4 ${cfg ? cfg.color : "text-slate-500"}`} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">AI Risk Assessment</h3>
            <p className="text-xs text-slate-500">Likelihood of violations at next inspection</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold ${cfg.color}`}>{data.risk_level} Risk</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{data.risk_score}/100</span>
            </div>
          )}
          {!ran ? (
            <button
              onClick={analyze}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {loading ? "Analyzing…" : "Analyze Risk"}
            </button>
          ) : (
            <button onClick={() => setExpanded((v) => !v)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-black/5 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Analyzing inspection patterns…</p>
            </div>
          ) : data && (
            <>
              {/* Risk bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500">Risk Level</span>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    <span className={`text-xs font-bold ${cfg.color}`}>{data.trend} trend</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${cfg.bar}`}
                    style={{ width: `${data.risk_score}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Low risk</span><span>High risk</span>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>

              {/* Risk factors & positives */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.top_risk_factors?.length > 0 && (
                  <div className="bg-white/70 rounded-xl p-3 border border-red-100">
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-2">⚠ Risk Factors</p>
                    <ul className="space-y-1">
                      {data.top_risk_factors.map((f, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.positive_indicators?.length > 0 && (
                  <div className="bg-white/70 rounded-xl p-3 border border-green-100">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-2">✓ Positive Signals</p>
                    <ul className="space-y-1">
                      {data.positive_indicators.map((f, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Seasonal note */}
              {data.seasonal_note && (
                <div className="flex items-start gap-2 bg-white/60 rounded-xl p-3 border border-amber-100">
                  <span className="text-sm">🌡</span>
                  <p className="text-xs text-slate-600 italic">{data.seasonal_note}</p>
                </div>
              )}

              <p className="text-[10px] text-slate-400">AI estimate · not a regulatory determination · based on publicly available inspection records</p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}