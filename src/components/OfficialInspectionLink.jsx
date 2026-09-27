import React from "react";
import { ExternalLink, Search } from "lucide-react";
import { resolveOfficialPortal } from "@/utils/officialPortal";
import { resolveStaleInfo } from "@/utils/staleData";

/**
 * OfficialInspectionLink — a button on every restaurant card that lets the
 * user verify the latest inspection status on the official health department
 * portal (or a search fallback when no specific portal is known).
 *
 * Hidden when StaleDataBanner is already showing a portal link, so a stale
 * restaurant never gets two "check the official site" buttons.
 */
export default function OfficialInspectionLink({ restaurant, variant = "card" }) {
  // StaleDataBanner renders the portal button when it has one; don't duplicate it.
  if (resolveStaleInfo(restaurant)?.portal_url) return null;

  const portal = resolveOfficialPortal(restaurant);
  if (!portal) return null;

  const isDetail = variant === "detail";
  const isFallback = portal.isFallback;

  return (
    <a
      href={portal.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-1.5 mt-2 rounded-xl font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E7D32] ${
        isFallback
          ? "bg-slate-50 border-2 border-slate-300 text-slate-600 hover:bg-slate-100"
          : "bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100"
      } ${isDetail ? "px-4 py-3 text-sm" : "px-3 py-2 text-[11px]"}`}
      aria-label={`${portal.name} (opens in new tab)`}
    >
      {isFallback ? <Search className={isDetail ? "w-4 h-4" : "w-3.5 h-3.5"} /> : <ExternalLink className={isDetail ? "w-4 h-4" : "w-3.5 h-3.5"} />}
      <span className="underline">{portal.name}</span>
    </a>
  );
}