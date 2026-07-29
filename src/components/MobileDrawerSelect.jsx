import { useState } from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ChevronDown, Check } from "lucide-react";

/**
 * MobileDrawerSelect — renders a bottom-sheet Drawer on mobile and a
 * standard <select> on desktop (md+). Provides a touch-friendly picker
 * for filter dropdowns.
 *
 * Props:
 *   label    — display label (e.g. "Cuisine")
 *   value    — current selected value
 *   onChange — callback receives the selected value string
 *   options  — array of { value, label }
 *   disabled — when true, the trigger is disabled
 */
export default function MobileDrawerSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((o) => o.value === value)?.label ||
    `All ${label.toLowerCase()}`;

  return (
    <>
      {/* Mobile: bottom-sheet Drawer */}
      <div className="block md:hidden">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] cursor-pointer min-h-[36px] flex items-center gap-1 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="truncate max-w-[90px]">{selectedLabel}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle>Select {label}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6 safe-area-bottom space-y-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value || "all"}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-[#4CAF50] text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop: standard select */}
      <div className="hidden md:flex items-center gap-1">
        <label
          className="text-xs font-bold text-slate-500 whitespace-nowrap"
        >
          {label}:
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] cursor-pointer min-h-[36px]"
        >
          {options.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}