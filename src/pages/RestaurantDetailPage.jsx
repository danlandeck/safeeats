import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import RestaurantDetail from "../components/RestaurantDetail";
import { fetchDetail as engineFetchDetail } from "../utils/searchEngine";
import { resolveGrade } from "../utils/grading";

// Inspection rows store DEDUCTION points — the safety score is 100 minus them.
// Rows without a usable score return null (never NaN, never 0).
const parseSafetyScore = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const pts = parseInt(raw);
  if (isNaN(pts)) return null;
  return Math.max(0, Math.min(100, 100 - pts));
};

/**
 * Route-based restaurant detail page.
 * Receives restaurant data via location.state from the originating page.
 * The Android WebView back button natively closes this view because it
 * is a real React Router route, not local state.
 */
export default function RestaurantDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { restaurant } = location.state || {};

  const [detailRows, setDetailRows] = useState([]);
  const [enrichedRestaurant, setEnrichedRestaurant] = useState(restaurant);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const rows = await engineFetchDetail(restaurant);
        if (cancelled) return;

        // Deduplicate inspection rows
        const uniqueMap = {};
        rows.forEach((row) => {
          const key = row.inspection_serial_num || `${row.inspection_date}|${row.inspection_result}`;
          if (!uniqueMap[key]) uniqueMap[key] = row;
        });
        const uniqueRows = Object.values(uniqueMap);
        setDetailRows(uniqueRows);

        // Compute enriched scores from actual inspection data
        const actualCount = uniqueRows.length;
        const sortedDates = uniqueRows
          .map((r) => r.inspection_date)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a));
        const trueLatestDate = sortedDates[0] || restaurant.latestDate;
        const mostRecent =
          uniqueRows.find((r) => r.inspection_date === trueLatestDate) || uniqueRows[0];
        const trueLatestResult =
          mostRecent?.inspection_result || restaurant.latestResult;

        let trueSafetyScore = restaurant.safetyScore;
        const scoresFromRows = uniqueRows
          .map((r) => parseSafetyScore(r.inspection_score !== undefined ? r.inspection_score : r.score))
          .filter((s) => s !== null);
        if (scoresFromRows.length > 0) {
          const latestScoreRaw = mostRecent
            ? (mostRecent.inspection_score !== undefined ? mostRecent.inspection_score : mostRecent.score)
            : undefined;
          const latestSafety = parseSafetyScore(latestScoreRaw);
          if (latestSafety !== null) trueSafetyScore = latestSafety;
        }

        // Current grade ALWAYS matches the current (most recent) inspection on
        // file — recomputed here from the same score the hero displays — never
        // the possibly stale grade carried over from the search card.
        const trueGrade = trueSafetyScore !== null && trueSafetyScore !== undefined
          ? resolveGrade(trueSafetyScore, trueLatestResult)
          : restaurant.grade;

        setEnrichedRestaurant({
          ...restaurant,
          totalInspections: actualCount,
          latestDate: trueLatestDate,
          latestResult: trueLatestResult,
          safetyScore: trueSafetyScore,
          grade: trueGrade,
          inspectionHistory: uniqueRows,
        });
      } catch {
        // Keep basic restaurant data on error
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!restaurant) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400">Loading inspection details…</p>
      </div>
    );
  }

  return (
    <RestaurantDetail
      restaurant={enrichedRestaurant || restaurant}
      inspections={detailRows}
      onBack={() => navigate(-1)}
    />
  );
}