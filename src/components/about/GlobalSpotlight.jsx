import { Shield, Globe } from "lucide-react";
import { Section, Pill } from "./SectionPrimitives";

const UAE_COVERAGE = [
  { icon: "🏙️", title: "Dubai Municipality", desc: "Live inspection data via Dubai Pulse open API — real-time compliance ratings for every licensed food establishment in Dubai." },
  { icon: "📊", title: "Normalized A–F Grading", desc: "Dubai's High/Medium/Low risk matrix and compliance outcomes are normalized to SafeEats' universal 0–100 score and A–F grade." },
  { icon: "🕌", title: "Halal Verification Flags", desc: "SafeEats surfaces halal certification status where published, critical for dining decisions across the UAE." },
  { icon: "🌍", title: "All Seven Emirates", desc: "Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain — covered via AI-assisted research where live APIs don't yet exist." },
];

export default function GlobalSpotlight() {
  return (
    <>
      <Section className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-green-50 overflow-hidden relative">
        <div className="absolute top-0 right-0 text-7xl opacity-10 select-none pointer-events-none leading-none pr-4 pt-2">🇦🇪</div>
        <div className="flex gap-4 items-start">
          <div className="w-11 h-11 bg-gradient-to-br from-green-700 to-red-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="text-xl font-extrabold text-slate-900">UAE & Dubai — A World Leader in Food Safety</h2>
              <Pill color="bg-green-700 text-white">LIVE DATA</Pill>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm mb-4">
              Dubai Municipality is one of the most digitally advanced food safety authorities on the planet. Their open-data platform — <strong>Dubai Pulse</strong> — publishes real-time food establishment inspection records publicly via API, making Dubai one of only a handful of cities in the world to proactively expose this data at scale.
            </p>
            <div className="bg-white rounded-2xl border border-yellow-200 p-5 mb-4 shadow-sm">
              <p className="text-xs font-extrabold text-green-700 uppercase tracking-widest mb-3">What SafeEats Covers for the UAE</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {UAE_COVERAGE.map(({ icon, title, desc }) => (
                  <div key={title} className="flex gap-3 items-start p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <span className="text-xl leading-none mt-0.5">{icon}</span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-4 text-white">
              <p className="text-sm font-bold mb-1">🏆 Why Dubai Is a Model for the World</p>
              <p className="text-slate-300 text-xs leading-relaxed">
                Dubai's approach to open food safety data is a global benchmark. By making inspection records publicly searchable, Dubai Municipality empowers both residents and the 20+ million annual visitors to make informed dining decisions. SafeEats is proud to integrate this data and extend it to a global audience — putting Dubai's safety record on the same screen as New York, London, and Tokyo.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex gap-5 items-start">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900">Built on Esri's Public GIS Standards</h2>
              <Pill color="bg-blue-100 text-blue-700">Color scale</Pill>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm mb-4">
              SafeEats adopts Esri's diverging health-risk color ramp — the same green→yellow→red visual language public health agencies use worldwide — so a safety score reads instantly at a glance, even for users with color vision deficiencies. This is an open/public GIS standard we build on; SafeEats is not formally partnered with Esri.
            </p>
            <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm">
              Learn more about Esri →
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}