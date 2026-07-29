import { Search, Database, Info, MessageCircle } from "lucide-react";
import { useTabStack } from "@/hooks/useTabStack";

const TABS = [
  { tab: "search", label: "Search", icon: Search },
  { tab: "coverage", label: "Coverage", icon: Database },
  { tab: "about", label: "About", icon: Info },
  { tab: "contact", label: "Contact", icon: MessageCircle },
];

/**
 * BottomTabNav — mobile-only fixed bottom navigation bar.
 * Uses useTabStack to preserve each tab's route, scroll position,
 * and navigation state when switching between tabs.
 */
export default function BottomTabNav() {
  const { currentTab, handleTabClick } = useTabStack();

  return (
    <nav
      className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 safe-area-bottom"
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch justify-around">
        {TABS.map(({ tab, label, icon: Icon }) => {
          const isActive = currentTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-h-[56px] flex-1 transition-colors ${
                isActive
                  ? "text-[#4CAF50]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}