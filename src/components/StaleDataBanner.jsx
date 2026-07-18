import React from "react";
import { AlertTriangle, ExternalLink, Search } from "lucide-react";

/**
 * StaleDataBanner — shows a transparency notice when restaurant data is
 * historical/outdated (e.g. Portland OregonLive 2019-2020), plus a prominent
 * link letting the end-user search the official live portal themselves.
 *
 * Renders when `restaurant.data_warning` is present OR when the restaurant
 * is in a known stale-data jurisdiction (matched by county_id or city+state),
 * so that AI-fallback results for those areas also get the portal link.
 */

// Counties/cities where we know the data is historical or AI-estimated and
// the user should be directed to the official portal for current records.
const STALE_DATA_BY_COUNTY = {
  portland_oregonlive: {
    data_warning: "Historical data from OregonLive (2019-2020). May not reflect current conditions.",
    portal_url: "https://inspections.myhealthdepartment.com/multco-eh",
    portal_name: "Multnomah County Official Inspection Portal",
  },
};

// City + state fallback for AI results whose county_id may have been re-routed
const STALE_DATA_BY_CITY_STATE = {
  "portland|or": STALE_DATA_BY_COUNTY.portland_oregonlive,
  "gresham|or": STALE_DATA_BY_COUNTY.portland_oregonlive,
};

function resolveStaleInfo(restaurant) {
  // 1. Explicit data_warning on the object (from backend processor)
  if (restaurant?.data_warning) {
    return {
      data_warning: restaurant.data_warning,
      portal_url: restaurant.portal_url,
      portal_name: restaurant.portal_name,
    };
  }
  // 2. Lookup by county_id
  if (restaurant?.county_id && STALE_DATA_BY_COUNTY[restaurant.county_id]) {
    return STALE_DATA_BY_COUNTY[restaurant.county_id];
  }
  // 3. Lookup by city + state (catches AI-fallback results)
  const city = (restaurant?.city || "").toLowerCase().trim();
  const state = (restaurant?.state || "").toLowerCase().trim();
  const key = `${city}|${state}`;
  if (STALE_DATA_BY_CITY_STATE[key]) {
    return STALE_DATA_BY_CITY_STATE[key];
  }
  return null;
}

export default function StaleDataBanner({ restaurant, variant = "card" }) {
  const info = resolveStaleInfo(restaurant);
  if (!info) return null;

  const isDetail = variant === "detail";
  const portalUrl = info.portal_url;
  const portalName = info.portal_name || "official health department portal";

  return (
    <div
      className={`flex flex-col gap-2 mt-2 bg-amber-50 border-2 border-amber-300 rounded-xl ${
        isDetail ? "px-4 py-3" : "px-3 py-2"
      }`}
      role="note"
    >
      <div className="flex items-start gap-1.5">
        <AlertTriangle className={`text-amber-500 flex-shrink-0 mt-0.5 ${isDetail ? "w-4 h-4" : "w-3.5 h-3.5"}`} />
        <span className={`font-bold text-amber-800 ${isDetail ? "text-sm" : "text-[10px]"}`}>
          {info.data_warning}
        </span>
      </div>
      {portalUrl && (
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-1.5 self-start bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#4CAF50] ${
            isDetail ? "px-3 py-2 text-sm" : "px-2.5 py-1.5 text-[11px]"
          }`}
          aria-label={`Search current inspection records on ${portalName} (opens in new tab)`}
        >
          <Search className={isDetail ? "w-3.5 h-3.5" : "w-3 h-3"} />
          Search current records
          <ExternalLink className={isDetail ? "w-3 h-3" : "w-2.5 h-2.5"} />
        </a>
      )}
    </div>
  );
}