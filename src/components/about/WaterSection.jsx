import { Droplets } from "lucide-react";
import { Section, Pill } from "./SectionPrimitives";

const CONTAMINANTS = [
  { icon: "🔩", name: "Lead & Copper", risk: "Neurological damage, especially in children" },
  { icon: "☣️", name: "Nitrates", risk: "Dangerous for infants under 6 months" },
  { icon: "🦠", name: "Bacteria (E. coli)", risk: "Gastrointestinal illness" },
  { icon: "⚗️", name: "Arsenic", risk: "Cancer risk with long-term exposure" },
  { icon: "🧪", name: "Disinfection Byproducts", risk: "Trihalomethanes, cancer risk" },
  { icon: "☢️", name: "Radionuclides", risk: "Radon, uranium — cancer risk" },
];

export default function WaterSection() {
  return (
    <Section className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 overflow-hidden relative">
      <div className="absolute top-0 right-0 text-7xl opacity-10 select-none pointer-events-none leading-none pr-4 pt-2">💧</div>
      <div className="flex gap-4 items-start">
        <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-xl font-extrabold text-slate-900">Tap Water Quality — Should You Order From the Tap?</h2>
            <Pill color="bg-blue-600 text-white">US Restaurants</Pill>
          </div>
          <p className="text-slate-700 leading-relaxed text-sm mb-4">
            The water your restaurant uses comes from a municipal supply — the same source feeding every soda fountain, ice machine, and pasta pot on the premises. For every US restaurant, SafeEats surfaces a direct link to the <strong>Environmental Working Group (EWG) Tap Water Database</strong> so you can look up your exact zip code's water quality report in seconds.
          </p>
          <div className="bg-white rounded-2xl border border-blue-100 p-5 mb-4 shadow-sm">
            <p className="text-xs font-extrabold text-blue-700 uppercase tracking-widest mb-3">What EWG's Tap Water Database Covers</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONTAMINANTS.map(({ icon, name, risk }) => (
                <div key={name} className="flex flex-col p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-lg mb-1">{icon}</span>
                  <p className="text-[11px] font-extrabold text-slate-800">{name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{risk}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-blue-800 rounded-2xl p-4 text-white">
            <p className="text-sm font-bold mb-1">🇺🇸 US Coverage — Powered by EWG</p>
            <p className="text-blue-200 text-xs leading-relaxed">
              On every US restaurant detail card, SafeEats shows a 💧 Tap Water Quality link that takes you directly to the EWG report for that restaurant's zip code. EWG tests go beyond EPA legal limits — they compare contaminants against stricter health guidelines, so you get the full picture, not just the legal minimum. International tap water data is on our roadmap.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}