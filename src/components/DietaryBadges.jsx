import React from "react";

const BADGES = [
  { key: "is_vegan_friendly",      label: "🌱 Vegan",       bg: "bg-green-100 text-green-800 border-green-300" },
  { key: "is_vegetarian_friendly", label: "🥦 Veggie",      bg: "bg-lime-100 text-lime-800 border-lime-300" },
  { key: "is_kosher",              label: "✡️ Kosher",      bg: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "is_halal",               label: "☪️ Halal",       bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "is_gluten_free_options", label: "🌾 GF Options",  bg: "bg-yellow-100 text-yellow-800 border-yellow-300" },
];

export default function DietaryBadges({ restaurant, maxShow = 3 }) {
  const active = BADGES.filter((b) => restaurant[b.key] === true);
  const visible = active.slice(0, maxShow);
  const extra = active.length - visible.length;

  if (active.length === 0 && !restaurant.cuisine) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {restaurant.cuisine && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          🍽️ {restaurant.cuisine}
        </span>
      )}
      {visible.map((b) => (
        <span
          key={b.key}
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.bg}`}
        >
          {b.label}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
          +{extra} more
        </span>
      )}
    </div>
  );
}