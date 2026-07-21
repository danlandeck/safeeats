import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "why", label: "Why" },
  { id: "grading", label: "The Grade" },
  { id: "sources", label: "Sources" },
  { id: "trust", label: "Trust" },
  { id: "beyond", label: "Beyond the Grade" },
  { id: "acquisition", label: "Acquisition" },
  { id: "creator", label: "Creator" },
];

export default function StoryNav() {
  const [active, setActive] = useState("why");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="sticky top-16 z-40 -mx-4 px-4 py-2 bg-white/85 backdrop-blur border-b border-slate-100">
      <div className="flex gap-1.5 overflow-x-auto">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              active === s.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}