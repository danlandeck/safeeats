import React from "react";
import { AlertTriangle, ExternalLink, Search } from "lucide-react";

/**
 * StaleDataBanner — shows a transparency notice when restaurant data is
 * historical/outdated (e.g. Portland OregonLive 2019-2020), plus a prominent
 * link letting the end-user search the official live portal themselves.
 *
 * Renders only when `restaurant.data_warning` is present.
 */
export default function StaleDataBanner({ restaurant, variant = "card" }) {
  if (!restaurant?.data_warning) return null;

  const isDetail = variant === "detail";
  const portalUrl = restaurant.portal_url;
  const portalName = restaurant.portal_name || "official health department portal";

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
          {restaurant.data_warning}
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