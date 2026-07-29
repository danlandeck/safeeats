import { Link, useLocation } from "react-router-dom";
import { Search, Database, Info, MessageCircle } from "lucide-react";

const TABS = [
  { to: "/", label: "Search", icon: Search, exact: true },
  { to: "/global-coverage", label: "Coverage", icon: Database },
  { to: "/About", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: MessageCircle },
];

/**
 * BottomTabNav — mobile-only fixed bottom navigation bar.
 * Visible on screens below the md breakpoint. Provides native-like
 * tab switching with active/inactive states and safe-area padding.
 */
export default function BottomTabNav() {
  const location = useLocation();

  return (
    <nav
      className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 safe-area-bottom"
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch justify-around">
        {TABS.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact
            ? location.pathname === "/"
            : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-h-[56px] flex-1 transition-colors ${
                isActive
                  ? "text-[#4CAF50]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-bold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}