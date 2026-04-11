import React, { useState } from "react";
import { Navigation } from "lucide-react";

/**
 * Free direction deep-links — no API keys needed.
 * Works on all browsers (desktop + mobile).
 * Google Maps: universal
 * Waze: opens app on mobile, web fallback on desktop
 * Apple Maps: opens on iOS/macOS, ignored elsewhere
 */
function buildAddress(restaurant) {
  const parts = [restaurant.address, restaurant.city, restaurant.zip_code].filter(Boolean);
  return parts.join(", ");
}

function googleMapsUrl(addr) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`;
}

function wazeUrl(addr) {
  return `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;
}

function appleMapsUrl(addr) {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(addr)}&dirflg=d`;
}

const NAV_OPTIONS = [
  {
    id: "google",
    label: "Google Maps",
    emoji: "🗺️",
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    url: googleMapsUrl,
    note: "Traffic-aware",
  },
  {
    id: "waze",
    label: "Waze",
    emoji: "🚗",
    color: "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100",
    url: wazeUrl,
    note: "Real-time traffic",
  },
  {
    id: "apple",
    label: "Apple Maps",
    emoji: "🍎",
    color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
    url: appleMapsUrl,
    note: "iOS / macOS",
  },
];

export default function DirectionsButtons({ restaurant, compact = false }) {
  const [open, setOpen] = useState(false);
  const addr = buildAddress(restaurant);
  if (!addr.trim()) return null;

  if (compact) {
    // Inline row — used on cards
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
          title="Get directions"
        >
          <Navigation className="w-3 h-3" />
          Directions
        </button>
        {open && (
          <div
            className="absolute z-50 bottom-full mb-1 left-0 bg-white rounded-xl border border-slate-200 shadow-xl p-2 flex flex-col gap-1 min-w-[170px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-0.5">Open in…</p>
            {NAV_OPTIONS.map((opt) => (
              <a
                key={opt.id}
                href={opt.url(addr)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${opt.color}`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
                <span className="ml-auto text-[10px] opacity-60">{opt.note}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-size — used on detail page
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-800">Get Directions</h3>
        <span className="text-xs text-slate-400 ml-1">— {addr}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {NAV_OPTIONS.map((opt) => (
          <a
            key={opt.id}
            href={opt.url(addr)}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-sm transition-colors ${opt.color}`}
          >
            <span className="text-lg">{opt.emoji}</span>
            <div>
              <div>{opt.label}</div>
              <div className="text-[10px] font-normal opacity-60">{opt.note}</div>
            </div>
          </a>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">Opens your preferred navigation app. All options are free and include live traffic.</p>
    </div>
  );
}