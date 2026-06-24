import { Camera, Languages } from "lucide-react";
import { Section, Pill } from "./SectionPrimitives";

const PITFALLS = [
  { flag: "🦐", text: "Hidden shellfish — Japanese sauces often contain エキス (extract) from shrimp or crab. SafeEats flags these from the ingredient list even when buried in kanji." },
  { flag: "📅", text: "Expiration labels — 賞味期限 (best before) vs 消費期限 (use by) look identical to untrained eyes. SafeEats translates both and explains the difference." },
  { flag: "🥛", text: "\"Domestic\" labeling — 国産 means \"Product of Japan\" not \"dairy-free.\" SafeEats reads country-of-origin and surfaces it clearly." },
  { flag: "📊", text: "Nutrition per 100g — Japan doesn't use US-style \"per serving\" sizing. SafeEats converts and displays calories, fat, sodium in the format you understand." },
  { flag: "🕌", text: "Halal & vegan flags — Japan's labeling standards differ from Western ones. SafeEats checks ingredient lists, not just packaging claims." },
];

export default function ScanningSection() {
  return (
    <Section className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white overflow-hidden relative">
      <div className="absolute top-0 right-0 text-7xl opacity-10 select-none pointer-events-none leading-none pr-4 pt-2">🇯🇵</div>
      <div className="flex gap-4 items-start">
        <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-xl font-extrabold text-slate-900">Built for the American in Japan</h2>
            <Pill color="bg-blue-600 text-white">Scan Any Language</Pill>
          </div>
          <p className="text-slate-600 leading-relaxed text-sm mb-4">
            Imagine arriving at a Tokyo konbini or a Osaka izakaya — menus entirely in kanji, ingredient labels in fine-print kana, and a health inspection placard you can't read. As a parent, an allergy sufferer, or anyone navigating a foreign food system, this is genuinely stressful.
          </p>
          <div className="bg-white rounded-2xl border border-blue-200 p-5 mb-4 shadow-sm">
            <p className="text-xs font-extrabold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5" /> Real Pitfalls SafeEats Helps You Avoid
            </p>
            <ul className="space-y-2.5 text-sm text-slate-700">
              {PITFALLS.map(({ flag, text }) => (
                <li key={flag} className="flex gap-3 items-start">
                  <span className="text-lg leading-none mt-0.5">{flag}</span>
                  <span className="text-slate-600 leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-slate-500 italic">
            Point SafeEats' camera at any sign, label, or menu in any language — it reads, translates, and surfaces what matters most in seconds.
          </p>
        </div>
      </div>
    </Section>
  );
}