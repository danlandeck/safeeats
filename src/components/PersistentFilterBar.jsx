import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "safeeats_persistent_filters";

const FILTER_DEFS = [
  {
    id: "fails_only",
    label: "Fails Only",
    emoji: "🚨",
    color: "bg-red-500 text-white border-red-500",
    inactive: "bg-white text-red-600 border-red-300 hover:bg-red-50",
    description: "Show only restaurants with failing grades",
  },
  {
    id: "recent_30",
    label: "Last 30 Days",
    emoji: "📅",
    color: "bg-blue-500 text-white border-blue-500",
    inactive: "bg-white text-blue-600 border-blue-300 hover:bg-blue-50",
    description: "Only show restaurants inspected in the past 30 days",
  },
  {
    id: "allergen_nuts",
    label: "🥜 Nuts",
    emoji: "",
    color: "bg-amber-600 text-white border-amber-600",
    inactive: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
    description: "Flag restaurants with nut-related violations",
  },
  {
    id: "allergen_gluten",
    label: "🌾 Gluten",
    emoji: "",
    color: "bg-yellow-700 text-white border-yellow-700",
    inactive: "bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50",
    description: "Flag restaurants with cross-contamination violations",
  },
  {
    id: "allergen_dairy",
    label: "🥛 Dairy",
    emoji: "",
    color: "bg-sky-500 text-white border-sky-500",
    inactive: "bg-white text-sky-700 border-sky-300 hover:bg-sky-50",
    description: "Flag restaurants with dairy handling violations",
  },
  {
    id: "vegan_only",
    label: "🌱 Vegan",
    emoji: "",
    color: "bg-green-600 text-white border-green-600",
    inactive: "bg-white text-green-700 border-green-300 hover:bg-green-50",
    description: "Show only vegan-friendly restaurants",
  },
  {
    id: "kosher_only",
    label: "✡️ Kosher",
    emoji: "",
    color: "bg-blue-700 text-white border-blue-700",
    inactive: "bg-white text-blue-800 border-blue-300 hover:bg-blue-50",
    description: "Show only kosher restaurants",
  },
  {
    id: "halal_only",
    label: "☪️ Halal",
    emoji: "",
    color: "bg-emerald-700 text-white border-emerald-700",
    inactive: "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50",
    description: "Show only halal restaurants",
  },
];

function loadFilters() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveFilters(f) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); } catch {}
}

/** Applies persistent filters to a list of restaurants */
export function applyPersistentFilters(restaurants, activeFilters) {
  let results = [...restaurants];

  if (activeFilters.fails_only) {
    results = results.filter((r) => r.safetyScore !== null && r.safetyScore < 60);
  }

  if (activeFilters.recent_30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    results = results.filter((r) => r.latestDate && new Date(r.latestDate) >= cutoff);
  }

  // Allergen filters: look for matching keywords in latest result or violations
  const nutKeywords = ["nut", "peanut", "almond", "walnut", "cashew", "allergen"];
  const glutenKeywords = ["gluten", "wheat", "cross-contamin", "contamination"];
  const dairyKeywords = ["dairy", "milk", "lactose", "cheese", "cream"];

  const getViolationText = (r) => {
    const violations = r.violations || r.inspectionHistory?.flatMap(i => i.violations || []) || [];
    return ((r.latestResult || "") + " " + violations.join(" ")).toLowerCase();
  };

  if (activeFilters.allergen_nuts) {
    results = results.filter((r) => nutKeywords.some((k) => getViolationText(r).includes(k)));
  }
  if (activeFilters.allergen_gluten) {
    results = results.filter((r) => glutenKeywords.some((k) => getViolationText(r).includes(k)));
  }
  if (activeFilters.allergen_dairy) {
    results = results.filter((r) => dairyKeywords.some((k) => getViolationText(r).includes(k)));
  }

  if (activeFilters.vegan_only) {
    results = results.filter((r) =>
      r.is_vegan_friendly === true ||
      (r.dietary_tags || []).some((t) => /vegan/i.test(t)) ||
      /vegan/i.test(r.cuisine || "") ||
      /vegan/i.test(r.name || "")
    );
  }

  if (activeFilters.kosher_only) {
    results = results.filter((r) =>
      r.is_kosher === true ||
      (r.dietary_tags || []).some((t) => /kosher/i.test(t)) ||
      /kosher/i.test(r.name || "")
    );
  }

  if (activeFilters.halal_only) {
    results = results.filter((r) =>
      r.is_halal === true ||
      (r.dietary_tags || []).some((t) => /halal/i.test(t)) ||
      /halal/i.test(r.name || "")
    );
  }

  return results;
}

export default function PersistentFilterBar({ onChange }) {
  const [active, setActive] = useState(loadFilters);

  const toggle = useCallback((id) => {
    setActive((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveFilters(next);
      return next;
    });
  }, []);

  useEffect(() => {
    onChange?.(active);
  }, [active, onChange]);

  const anyActive = Object.values(active).some(Boolean);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Quick filters"
    >
      {FILTER_DEFS.map(({ id, label, color, inactive, description }) => {
        const isActive = !!active[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-pressed={isActive}
            title={description}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold border-2 transition-all min-h-[44px] touch-manipulation select-none ${
              isActive ? color : inactive
            }`}
          >
            {label}
            {isActive && <X className="w-3 h-3 ml-0.5" aria-hidden="true" />}
          </button>
        );
      })}
      {anyActive && (
        <button
          type="button"
          onClick={() => { const cleared = {}; saveFilters(cleared); setActive(cleared); }}
          className="text-xs text-slate-400 hover:text-slate-700 font-semibold underline transition-colors min-h-[44px] px-1"
          aria-label="Clear all filters"
        >
          Clear all
        </button>
      )}
    </div>
  );
}