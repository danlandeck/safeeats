import { useRef, useState, useCallback } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 100;

/**
 * PullToRefresh — wraps children with a touch-based pull-to-refresh gesture.
 * Activates only when the page is scrolled to the top. When the user pulls
 * down past THRESHOLD and releases, calls onRefresh and shows a spinner.
 *
 * Props:
 *   onRefresh — async callback invoked when the pull threshold is met
 *   disabled  — when true, the gesture is ignored
 *   children  — content to wrap
 */
export default function PullToRefresh({ onRefresh, disabled, children }) {
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = useCallback(
    (e) => {
      if (disabled || isRefreshing) return;
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!pullingRef.current || disabled || isRefreshing) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Dampen the pull so it feels native
      const dampened = Math.min(delta * 0.4, MAX_PULL);
      setPullDistance(dampened);
    },
    [disabled, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pullDistance >= THRESHOLD && !disabled && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, disabled, isRefreshing, onRefresh]);

  const showSpinner = isRefreshing || pullDistance >= THRESHOLD;
  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: `${pullDistance}px` }}
        >
          {showSpinner ? (
            <Loader2 className="w-6 h-6 text-[#4CAF50] animate-spin" />
          ) : (
            <ArrowDown
              className="w-5 h-5 text-slate-400"
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}