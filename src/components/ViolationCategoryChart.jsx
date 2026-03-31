import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORIES = [
  { key: "Temperature",    keywords: ["temp", "cold", "hot", "heat", "cook", "cool", "refriger", "frozen", "thaw", "warm"] },
  { key: "Sanitation",     keywords: ["sanit", "clean", "wash", "handwash", "hygiene", "soap", "toilet", "sewage", "plumbing", "waste"] },
  { key: "Pest Control",   keywords: ["pest", "rodent", "insect", "vermin", "fly", "roach", "mouse", "rat", "vector", "bird"] },
  { key: "Food Storage",   keywords: ["storage", "store", "label", "date mark", "covered", "container", "protect", "package"] },
  { key: "Equipment",      keywords: ["equipment", "utensil", "surface", "facility", "floor", "wall", "ceiling", "light", "ventil", "hood"] },
  { key: "Employee",       keywords: ["employee", "worker", "glove", "hair", "jewelry", "illness", "bare hand", "person", "health"] },
  { key: "Food Source",    keywords: ["source", "approved", "wholesome", "adulterat", "shellfish", "recall", "origin"] },
];

function categorize(description) {
  if (!description) return null;
  const lower = description.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.key;
  }
  return "Other";
}

export default function ViolationCategoryChart({ inspections }) {
  const data = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach((c) => { counts[c.key] = 0; });
    counts["Other"] = 0;

    inspections.forEach((insp) => {
      (insp.violations || []).forEach((v) => {
        const cat = categorize(v.violation_description) || "Other";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      // Also handle flat rows where violation_description is a direct field
      if (insp.violation_description && insp.violation_description.trim()) {
        const cat = categorize(insp.violation_description) || "Other";
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });

    const allCategories = [...CATEGORIES.map((c) => c.key), "Other"];
    return allCategories
      .map((key) => ({ category: key, count: counts[key] || 0 }))
      .filter((d) => d.count > 0);
  }, [inspections]);

  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0 || data.length < 3) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { category, count } = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
        <p className="font-bold">{category}</p>
        <p className="text-slate-300">{count} violation{count !== 1 ? "s" : ""} ({Math.round((count / total) * 100)}%)</p>
      </div>
    );
  };

  return (
    <Card className="p-6 border-slate-200 bg-white">
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Violation Category Breakdown</h3>
        <p className="text-xs text-slate-500 mt-0.5">{total} total violations across {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full md:w-64 flex-shrink-0" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                tickLine={false}
              />
              <Radar
                name="Violations"
                dataKey="count"
                stroke="#0f172a"
                fill="#0f172a"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ fill: "#0f172a", r: 3 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 w-full space-y-2">
          {[...data].sort((a, b) => b.count - a.count).map((d) => (
            <div key={d.category} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 w-28 flex-shrink-0">{d.category}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-800 transition-all"
                  style={{ width: `${Math.round((d.count / data[0]?.count || 1) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-900 w-6 text-right flex-shrink-0">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}