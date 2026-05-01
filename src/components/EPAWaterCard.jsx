import React from "react";
import { Droplets, ExternalLink } from "lucide-react";

// International sources that have no EWG/EPA data
const NO_WATER_DATA_SOURCES = ["toronto", "dubai", "uk_fsa"];

export default function EPAWaterCard({ city, source, zip_code }) {
  // Skip international restaurants
  if (NO_WATER_DATA_SOURCES.includes(source)) return null;

  // Need at least a zip code to link to EWG
  if (!zip_code) return null;

  const ewgUrl = `https://www.ewg.org/tapwater/search-results.php?zip5=${zip_code}`;

  return (
    <div
      className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] flex items-center justify-between gap-2 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 text-blue-800 font-bold min-w-0">
        <Droplets className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />
        <span>💧 Tap Water Quality</span>
      </div>
      <a
        href={ewgUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded whitespace-nowrap text-[11px]"
        aria-label={`Check tap water quality on EWG for zip code ${zip_code} (opens in new tab)`}
      >
        Check on EWG <ExternalLink className="w-2.5 h-2.5 ml-0.5" aria-hidden="true" />
      </a>
    </div>
  );
}