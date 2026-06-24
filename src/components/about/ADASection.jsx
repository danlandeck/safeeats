import { Link } from "react-router-dom";
import { Accessibility } from "lucide-react";
import { Section, Pill } from "./SectionPrimitives";

const CHECKS = [
  { icon: "🚪", title: "Accessible Entrance", desc: "Ramp or level entry confirmed" },
  { icon: "🚻", title: "Accessible Restroom", desc: "ADA-compliant facilities on-site" },
  { icon: "🅿️", title: "Accessible Parking", desc: "Designated accessible spaces nearby" },
  { icon: "🔄", title: "Automatic Doors", desc: "Power-assisted or automatic entry doors" },
];

export default function ADASection() {
  return (
    <Section className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white overflow-hidden relative">
      <div className="absolute top-0 right-0 text-7xl opacity-10 select-none pointer-events-none leading-none pr-4 pt-2">♿</div>
      <div className="flex gap-4 items-start">
        <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Accessibility className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-xl font-extrabold text-slate-900">ADA Accessibility — A Personal Commitment</h2>
            <Pill color="bg-emerald-600 text-white">US Restaurants</Pill>
          </div>
          <p className="text-slate-700 leading-relaxed text-sm mb-4">
            Accessibility is deeply personal to our family. Knowing whether a restaurant is wheelchair accessible, has accessible restrooms, or adequate parking shouldn't require a phone call or a gamble — it should be right there alongside the health score before you ever leave the house.
          </p>
          <div className="bg-white rounded-2xl border border-emerald-200 p-5 mb-4 shadow-sm">
            <p className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest mb-3">What SafeEats Checks for Every US Restaurant</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CHECKS.map(({ icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-2xl mb-1">{icon}</span>
                  <p className="text-xs font-extrabold text-slate-800">{title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-emerald-700 rounded-2xl p-4 text-white">
            <p className="text-sm font-bold mb-1">📧 See wrong ADA info? Tell us.</p>
            <p className="text-emerald-100 text-xs leading-relaxed">
              If SafeEats displays incorrect accessibility information for any restaurant, use the <Link to="/contact" className="underline font-semibold text-white">Feedback page</Link> to report it. Daniel personally follows up with businesses where accessibility data is inaccurate — because every family deserves to know before they show up.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}