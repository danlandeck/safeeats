import React from "react";
import { BadgeCheck, ExternalLink, FileSearch } from "lucide-react";

/**
 * Authority-styled "evidence" badge that surfaces the official data source
 * prominently. Uses serif typography + teal/gold authority palette to
 * visually separate SafeEats™ from copycat platforms that lack verified
 * source linking.
 */
export default function VerifiedSourceBadge({ restaurant, sourceInfo }) {
  const isLiveAPI = sourceInfo && !restaurant.isLLMData;

  return (
    <div className="rounded-2xl border-2 border-authority-teal/30 bg-gradient-to-br from-authority-cream to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isLiveAPI ? "bg-authority-teal/10" : "bg-authority-gold/10"}`}>
          {isLiveAPI ? (
            <BadgeCheck className="w-5 h-5 text-authority-teal" />
          ) : (
            <FileSearch className="w-5 h-5 text-authority-gold" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 font-heading ${isLiveAPI ? "text-authority-teal" : "text-authority-gold"}`}>
            {isLiveAPI ? "✓ Verified Live Source" : "AI-Assisted Research"}
          </p>
          {sourceInfo ? (
            <>
              <p className="text-sm font-bold text-authority-navy leading-tight font-heading">
                {sourceInfo.name}
              </p>
              <a
                href={sourceInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-authority-teal hover:underline font-semibold mt-1"
              >
                View official records <ExternalLink className="w-3 h-3" />
              </a>
            </>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Retrieved via live web search of publicly available health department records by AI.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}