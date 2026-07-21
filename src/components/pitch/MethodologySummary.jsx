import { Scale, FileSearch, Filter, CheckCircle2 } from "lucide-react";

const GRADE_BANDS = [
  { grade: "A", range: "90–100", color: "bg-emerald-600" },
  { grade: "B", range: "80–89", color: "bg-emerald-400" },
  { grade: "C", range: "70–79", color: "bg-yellow-400" },
  { grade: "D", range: "60–69", color: "bg-orange-400" },
  { grade: "F", range: "< 60", color: "bg-red-600" },
  { grade: "U", range: "Unknown", color: "bg-slate-400" },
];

const SOURCES = [
  { source: "NYC DOHMH", native: "Letter grade A/B/C", method: "Mapped directly; score from violation points" },
  { source: "LA County DPH", native: "Penalty points", method: "Inverted: 100 − penalty points" },
  { source: "King County, WA", native: "Penalty points + result", method: "Inverted; result shown on detail" },
  { source: "Chicago CDPH", native: "Pass / Fail + codes", method: "Pass→high; Fail→F; weighted by severity" },
  { source: "UK FSA (FHRS)", native: "0–5 star rating", method: "Linear scale to 0–100" },
  { source: "France (Alim'confiance)", native: "4-tier evaluation", method: "Result-based: 1→95, 2→82, 3→68, 4→40" },
  { source: "Netherlands (NVWA)", native: "Compliance status", method: "Voldoet→88; Niet voldoet→45" },
  { source: "AI-assisted", native: "Public records", method: "Gemini 3 Flash + confidence filtering" },
];

const SAFEGUARDS = [
  { icon: FileSearch, title: "Source provenance", body: "Every record traces back to its issuing authority" },
  { icon: Scale, title: "Documented normalization", body: "Conversion logic published — no black-box scoring" },
  { icon: Filter, title: "Relevance filtering", body: "False matches stripped from permissive APIs" },
  { icon: CheckCircle2, title: "Unverified filtering", body: "AI results with no verification are dropped entirely" },
];

export default function MethodologySummary() {
  return (
    <div className="space-y-5">
      {/* Grade scale */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-3">Universal A–F Grade Scale</p>
        <div className="grid grid-cols-6 gap-2">
          {GRADE_BANDS.map(({ grade, range, color }) => (
            <div key={grade} className={`${color} rounded-xl p-2.5 text-center shadow-sm`}>
              <p className="text-xl font-black text-white">{grade}</p>
              <p className="text-[9px] font-semibold text-white/80 mt-0.5">{range}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Every jurisdiction's native scoring — penalty points, pass/fail, star ratings, compliance outcomes —
          is normalized to a single 0–100 scale. A score of 85 means the same thing whether the restaurant is in
          Los Angeles, London, or Toronto. Apples to apples, worldwide.
        </p>
      </div>

      {/* Normalization table */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-3">Normalization by Source</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-left">
                <th className="py-2 pr-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Source</th>
                <th className="py-2 pr-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Native System</th>
                <th className="py-2 font-bold text-slate-600 text-xs uppercase tracking-wider">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map(({ source, native, method }) => (
                <tr key={source} className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 font-bold text-slate-900 whitespace-nowrap text-xs">{source}</td>
                  <td className="py-2.5 pr-4 text-slate-600 text-xs">{native}</td>
                  <td className="py-2.5 text-slate-600 text-xs">{method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safeguards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SAFEGUARDS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <Icon className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="font-bold text-slate-900 text-xs">{title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}