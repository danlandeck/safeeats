import { useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Maps a route pathname to its parent bottom-tab.
 * Deep routes like /restaurant/:id and /county-drilldown belong to "search".
 */
function getTabForRoute(pathname) {
  if (
    pathname === "/" ||
    pathname.startsWith("/restaurant") ||
    pathname.startsWith("/county-drilldown")
  )
    return "search";
  if (pathname.startsWith("/global-coverage")) return "coverage";
  if (pathname.startsWith("/About")) return "about";
  if (pathname.startsWith("/contact")) return "contact";
  return "search";
}

const TAB_BASES = {
  search: "/",
  coverage: "/global-coverage",
  about: "/About",
  contact: "/contact",
};

/**
 * useTabStack — manages per-tab navigation state so switching bottom tabs
 * preserves each tab's last route, scroll position, and location.state.
 *
 * On tab click:
 *  - Saves the current tab's { route, scrollY, state }.
 *  - If switching to a different tab, navigates to that tab's saved route
 *    (or base route on first visit) with its saved state, then restores scroll.
 *  - If tapping the already-active tab, resets to the base route (native behavior).
 *
 * Returns { currentTab, handleTabClick }.
 */
export function useTabStack() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabStateRef = useRef({});

  const currentTab = getTabForRoute(location.pathname);

  const handleTabClick = useCallback(
    (tabKey) => {
      const currentTabKey = getTabForRoute(location.pathname);

      // Save current route + scroll + state for the outgoing tab
      tabStateRef.current[currentTabKey] = {
        route: location.pathname,
        scrollY: window.scrollY,
        state: location.state,
      };

      if (tabKey === currentTabKey) {
        // Already on this tab — reset to base route + scroll to top
        const base = TAB_BASES[tabKey];
        if (location.pathname !== base) {
          navigate(base);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Switch to target tab — restore its saved route + state
      const saved = tabStateRef.current[tabKey];
      const targetRoute = saved?.route || TAB_BASES[tabKey];

      if (saved?.state) {
        navigate(targetRoute, { state: saved.state });
      } else {
        navigate(targetRoute);
      }

      // Restore scroll position after the page transition completes
      const scrollY = saved?.scrollY ?? 0;
      setTimeout(() => {
        window.scrollTo(0, scrollY);
      }, 300);
    },
    [location.pathname, location.state, navigate]
  );

  return { currentTab, handleTabClick };
}