import React, { useState, useEffect } from "react";
import { Accessibility, CheckCircle2, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../lib/LanguageContext";
import { formatLocalDate } from "../utils/i18n";

const FIELDS = [
  { key: "ada_parking",            label: "Accessible Parking",  emoji: "🚗" },
  { key: "ada_entrance_ramp",      label: "Accessible Entrance", emoji: "♿" },
  { key: "ada_restroom",           label: "Accessible Restroom", emoji: "🚻" },
  { key: "ada_accessible_seating", label: "Accessible Seating",  emoji: "🪑" },
];

const COMPLIANCE_CONFIG = {
  accessible:           { label: "Accessible",           bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  partially_accessible: { label: "Partially Accessible", bg: "bg-yellow-100",  text: "text-yellow-800",  border: "border-yellow-200" },
  not_accessible:       { label: "Not Accessible",       bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200" },
  unknown:              { label: "Unknown",               bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200" },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function boolToYesNo(val) {
  if (val === true) return "yes";
  if (val === false) return "no";
  return "unknown";
}

function deriveCompliance(parking, entrance, restroom, seating) {
  const vals = [parking, entrance, restroom, seating];
  const known = vals.filter(v => v !== "unknown");
  if (known.length === 0) return "unknown";
  if (known.every(v => v === "yes")) return "accessible";
  if (known.every(v => v === "no")) return "not_accessible";
  if (known.some(v => v === "yes")) return "partially_accessible";
  return "unknown";
}

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

const UNKNOWN_ADA = {
  ada_parking: "unknown",
  ada_entrance_ramp: "unknown",
  ada_restroom: "unknown",
  ada_accessible_seating: "unknown",
  ada_compliance: "unknown",
  ada_last_updated: null,
};

export default function ADADetailSection({ restaurant }) {
  const { langCode } = useLanguage();
  const [adaData, setAdaData] = useState(UNKNOWN_ADA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurant?.business_id || !restaurant?.name) return;

    const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log("[ADA] API key present:", !!API_KEY);

    if (!API_KEY) {
      console.error("[ADA] VITE_GOOGLE_MAPS_API_KEY is not set. Showing all fields as Unknown.");
      setAdaData(UNKNOWN_ADA);
      return;
    }

    async function fetchADA() {
      setLoading(true);
      try {
        // Step 1: Check DB for existing cached record
        console.log("[ADA] Checking DB cache for business_id:", restaurant.business_id);
        const existing = await base44.entities.Restaurant.filter({ business_id: restaurant.business_id });
        const record = existing?.[0] || null;
        console.log("[ADA] DB record found:", !!record, record ? `ada_last_updated: ${record.ada_last_updated}` : "");

        // Step 2: Use cache if fresh
        if (record?.ada_last_updated) {
          const age = Date.now() - new Date(record.ada_last_updated).getTime();
          if (age < THIRTY_DAYS_MS) {
            console.log("[ADA] Using cached data (age:", Math.round(age / 86400000), "days)");
            setAdaData({
              ada_parking:            record.ada_parking            || "unknown",
              ada_entrance_ramp:      record.ada_entrance_ramp      || "unknown",
              ada_restroom:           record.ada_restroom           || "unknown",
              ada_accessible_seating: record.ada_accessible_seating || "unknown",
              ada_compliance:         record.ada_compliance         || "unknown",
              ada_last_updated:       record.ada_last_updated,
            });
            setLoading(false);
            return;
          }
          console.log("[ADA] Cache expired, fetching from Google...");
        }

        // Step 3: Google Places Text Search to get place_id
        let placeId = record?.google_place_id || null;

        if (!placeId) {
          const textQuery = [restaurant.name, restaurant.address, restaurant.city].filter(Boolean).join(" ");
          console.log("[ADA] Searching for:", textQuery);

          const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": API_KEY,
              "X-Goog-FieldMask": "places.id",
            },
            body: JSON.stringify({ textQuery }),
          });

          const searchData = await searchRes.json();
          console.log("[ADA] Text Search response:", searchData);

          placeId = searchData?.places?.[0]?.id || null;
          console.log("[ADA] Found place_id:", placeId);
        } else {
          console.log("[ADA] Reusing cached place_id:", placeId);
        }

        // Step 4: Fetch accessibility details
        let opts = null;
        if (placeId) {
          const detailRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
            method: "GET",
            headers: {
              "X-Goog-Api-Key": API_KEY,
              "X-Goog-FieldMask": "accessibilityOptions",
            },
          });
          const detailData = await detailRes.json();
          console.log("[ADA] Details response:", detailData);
          opts = detailData?.accessibilityOptions || null;
        }

        // Step 5: Map fields
        const ada_parking            = boolToYesNo(opts?.wheelchairAccessibleParking);
        const ada_entrance_ramp      = boolToYesNo(opts?.wheelchairAccessibleEntrance);
        const ada_restroom           = boolToYesNo(opts?.wheelchairAccessibleRestroom);
        const ada_accessible_seating = boolToYesNo(opts?.wheelchairAccessibleSeating);
        const ada_compliance         = deriveCompliance(ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating);
        const ada_last_updated       = new Date().toISOString();

        const mapped = { ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating, ada_compliance, ada_last_updated };
        console.log("[ADA] Mapped fields:", mapped);

        // Step 6: Save to DB
        const dbPayload = {
          ...mapped,
          ...(placeId ? { google_place_id: placeId } : {}),
        };
        console.log("[ADA] Saving to DB:", dbPayload);

        try {
          if (record) {
            await base44.entities.Restaurant.update(record.id, dbPayload);
          } else {
            await base44.entities.Restaurant.create({
              business_id: restaurant.business_id,
              name: restaurant.name,
              source: "ada_cache",
              ...dbPayload,
            });
          }
          console.log("[ADA] DB save successful");
        } catch (dbErr) {
          console.error("[ADA] DB save failed (non-fatal):", dbErr?.message || dbErr);
        }

        setAdaData(mapped);
      } catch (err) {
        console.error("[ADA] Fetch failed, showing Unknown:", err?.message || err);
        setAdaData(UNKNOWN_ADA);
      } finally {
        setLoading(false);
      }
    }

    fetchADA();
  }, [restaurant?.business_id]);

  const compliance = adaData.ada_compliance || "unknown";
  const cfg = COMPLIANCE_CONFIG[compliance] || COMPLIANCE_CONFIG.unknown;

  const lastUpdatedStr = adaData.ada_last_updated
    ? formatLocalDate(adaData.ada_last_updated, langCode, { year: "numeric", month: "short", day: "numeric" })
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
            <StatusBadge value={adaData[key] || "unknown"} />
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