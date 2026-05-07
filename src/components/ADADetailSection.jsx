import React from "react";
import {
  Accessibility, ParkingSquare, Car, DoorOpen, Zap, MoveHorizontal,
  Armchair, ArrowDownToLine, Bath, GripVertical, PawPrint,
  BookOpen, FileText, CheckCircle2, XCircle, HelpCircle
} from "lucide-react";

const FIELDS = [
  { key: "ada_parking",           label: "Accessible Parking",            Icon: ParkingSquare },
  { key: "ada_van_parking",       label: "Van-Accessible Parking",        Icon: Car },
  { key: "ada_entrance_ramp",     label: "Accessible Entrance / Ramp",    Icon: DoorOpen },
  { key: "ada_auto_door",         label: "Automatic Door Opener",         Icon: Zap },
  { key: "ada_wide_pathways",     label: "Wide Interior Pathways (36\"+)", Icon: MoveHorizontal },
  { key: "ada_accessible_seating",label: "Accessible Seating & Tables",   Icon: Armchair },
  { key: "ada_lowered_counter",   label: "Lowered Service Counter",       Icon: ArrowDownToLine },
  { key: "ada_restroom",          label: "ADA-Compliant Restroom",        Icon: Bath },
  { key: "ada_restroom_grab_bars",label: "Restroom Grab Bars",            Icon: GripVertical },
  { key: "ada_service_animal",    label: "Service Animals Permitted",     Icon: PawPrint },
  { key: "ada_signage",           label: "Braille & Accessible Signage",  Icon: BookOpen },
  { key: "ada_accessible_menu",   label: "Accessible Menu Formats",       Icon: FileText },
];

const COMPLIANCE_CONFIG = {
  accessible:           { label: "Accessible",           bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  partially_accessible: { label: "Partially Accessible", bg: "bg-yellow-100",  text: "text-yellow-800",  border: "border-yellow-200" },
  not_accessible:       { label: "Not Accessible",        bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200" },
  unknown:              { label: "Unknown",               bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200" },
};

function StatusBadge({ value }) {
  if (value === "yes") {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Yes
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" /> No
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
      <HelpCircle className="w-3 h-3" /> Unknown
    </span>
  );
}

export default function ADADetailSection({ restaurant }) {
  const compliance = restaurant.ada_compliance || "unknown";
  const cfg = COMPLIANCE_CONFIG[compliance] || COMPLIANCE_CONFIG.unknown;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Accessibility className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">ADA Accessibility</h2>
        </div>
        {/* Overall compliance badge */}
        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <Accessibility className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* 12-field grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FIELDS.map(({ key, label, Icon }) => (
          <div key={key} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
            </div>
            <StatusBadge value={restaurant[key] || "unknown"} />
          </div>
        ))}
      </div>

      {/* Disclaimer note */}
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        ⚠️ ADA data is self-reported or community-sourced. Verify directly with the restaurant.
      </p>
    </div>
  );
}