import React, { useState, useEffect } from "react";
import {
  Accessibility,
  CheckCircle2, XCircle, HelpCircle, Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../lib/LanguageContext";
import { formatLocalDate } from "../utils/i18n";

const FIELDS = [
  { key: "ada_parking",            label: "Accessible Parking",   emoji: "🚗" },
  { key: "ada_entrance_ramp",      label: "Accessible Entrance",  emoji: "♿" },
  { key: "ada_restroom",           label: "Accessible Restroom",  emoji: "🚻" },
  { key: "ada_accessible_seating", label: "Accessible Seating",   emoji: "🪑" },
];

const COMPLIANCE_CONFIG = {
  accessible:           { label: "Accessible",           bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  partially_accessible: { label: "Partially Accessible", bg: "bg-yellow-100",  text: "text-yellow-800",  border: "border-yellow-200" },
  not_accessible:       { label: "Not Accessible",       bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200" },
  unknown:              { label: "Unknown",               bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200" },
};

function StatusBadge({ value }) {
  if (value === "yes") {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3" /> Yes
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">
        <XCircle className="w-3 h-3" /> No
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">
      <HelpCircle className="w-3 h-3" /> Unknown
    </span>
  );
}

export default function ADADetailSection({ restaurant: initialRestaurant }) {
  const { langCode } = useLanguage();
  const [data, setData] = useState(initialRestaurant);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialRestaurant?.business_id || !initialRestaurant?.name) return;

    setLoading(true);
    base44.functions.invoke("getGoogleADA", {
      business_id: initialRestaurant.business_id,
      name: initialRestaurant.name,
      address: initialRestaurant.address || "",
      city: initialRestaurant.city || "",
    })
      .then((res) => {
        if (res.data && !res.data.error) {
          setData(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {}) // fail silently
      .finally(() => setLoading(false));
  }, [initialRestaurant?.business_id]);

  const compliance = data.ada_compliance || "unknown";
  const cfg = COMPLIANCE_CONFIG[compliance] || COMPLIANCE_CONFIG.unknown;

  const lastUpdatedStr = data.ada_last_updated
    ? formatLocalDate(data.ada_last_updated, langCode, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Accessibility className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">ADA Accessibility</h2>
          {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <Accessibility className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* 4-field grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FIELDS.map(({ key, label, emoji }) => (
          <div key={key} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base flex-shrink-0">{emoji}</span>
              <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
            </div>
            <StatusBadge value={data[key] || "unknown"} />
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed italic">
        Accessibility data sourced from Google Maps.{lastUpdatedStr ? ` Last updated: ${lastUpdatedStr}.` : ""}
      </p>
    </div>
  );
}