import React from "react";
import { Link } from "react-router-dom";

/**
 * Dubai Spotlight — a premium hero callout for UAE visitors.
 * Shown on the home page landing section.
 */
export default function DubaiSpotlight({ onSearchDubai }) {
  const FEATURED = [
    { name: "Nobu Dubai", area: "Atlantis, The Palm", emoji: "🍣" },
    { name: "Zuma Dubai", area: "DIFC", emoji: "🥢" },
    { name: "Nusr-Et Steakhouse", area: "Jumeirah", emoji: "🥩" },
    { name: "Shakespeare and Co.", area: "Dubai Mall", emoji: "☕" },
    { name: "Ravi Restaurant", area: "Satwa", emoji: "🍛" },
    { name: "Al Fanar", area: "Festival City", emoji: "🫕" },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1628] via-[#0d2240] to-[#1a3a2a] border border-[#c9a227]/30 shadow-2xl">
      {/* Gold accent top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#c9a227] via-[#f0d060] to-[#c9a227]" />

      <div className="px-5 pt-5 pb-4">
        {/* AI badge banner */}
        <div className="flex items-center gap-2 mb-4 bg-[#c9a227]/10 border border-[#c9a227]/25 rounded-xl px-3 py-2">
          <span className="text-lg flex-shrink-0">🤖</span>
          <p className="text-xs text-[#f0d060] font-semibold leading-snug">
            <span className="font-extrabold">AI-Enhanced Market</span> — Dubai data sourced via AI web search of official Dubai Municipality records
          </p>
        </div>

        {/* Header */}
        <div className="mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🇦🇪</span>
              <span className="text-[10px] font-extrabold text-[#f0d060] uppercase tracking-widest bg-[#c9a227]/20 border border-[#c9a227]/30 px-2.5 py-1 rounded-full">
                🤖 AI-Enhanced
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">
              Dubai Food Safety Hub
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Dubai Municipality inspects every licensed establishment. SafeEats reads official sources via AI.
            </p>
          </div>
        </div>

        {/* Featured restaurants */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {FEATURED.map((r) => (
            <button
              key={r.name}
              onClick={() => onSearchDubai(r.name)}
              className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#c9a227]/40 rounded-xl p-2.5 text-left transition-all"
            >
              <div className="flex items-center mb-1">
                <span className="text-base">{r.emoji}</span>
              </div>
              <p className="text-xs font-extrabold text-white leading-tight truncate group-hover:text-[#f0d060] transition-colors">{r.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{r.area}</p>
            </button>
          ))}
        </div>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onSearchDubai("restaurant Dubai")}
            className="flex-1 bg-[#c9a227] hover:bg-[#f0d060] text-slate-900 font-extrabold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            🔍 Search All Dubai Restaurants
          </button>
          <Link
            to="/global-coverage"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#c9a227]/40 text-[#f0d060] text-xs font-bold hover:bg-[#c9a227]/10 transition-colors whitespace-nowrap"
          >
            View Coverage →
          </Link>
        </div>

        {/* Footnote */}
        <p className="text-[10px] text-slate-600 mt-3 text-center">
          AI-estimated from official Dubai Municipality sources · Scores normalized to A–F scale · Click any restaurant to search for current data
        </p>
      </div>
    </div>
  );
}