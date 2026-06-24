import { Section, Pill } from "./SectionPrimitives";

const GRADE_TABLE = [
  { grade: "A", range: "90–100", color: "bg-green-700", text: "text-white", label: "Excellent" },
  { grade: "B", range: "80–89", color: "bg-green-400", text: "text-white", label: "Good" },
  { grade: "C", range: "70–79", color: "bg-yellow-400", text: "text-slate-800", label: "Okay" },
  { grade: "D", range: "60–69", color: "bg-orange-400", text: "text-white", label: "Poor" },
  { grade: "F", range: "< 60", color: "bg-red-600", text: "text-white", label: "Critical" },
  { grade: "U", range: "No data", color: "bg-slate-400", text: "text-white", label: "Unknown" },
];

const NORMALIZATION = [
  { source: "NYC DOHMH", native: "Letter grade A/B/C", method: "Mapped directly to SafeEats A–F; numeric score derived from violation points." },
  { source: "LA County DPH", native: "Penalty point score", method: "Inverted to 0–100 (100 − penalty points); letter grade from resulting band." },
  { source: "Chicago CDPH", native: "Pass / Fail + violation codes", method: "Pass → high score; Fail → F; weighted by violation severity and count." },
  { source: "UK FSA (FHRS)", native: "0–5 star rating", method: "Linear scale to 0–100 (5★ → 90–100, 0★ → < 60); grade from band." },
  { source: "Singapore SFA", native: "Grades A–D", method: "Mapped to SafeEats bands with minor calibration for the D threshold." },
  { source: "Denmark Smiley", native: "4-tier smiley (☺–☹)", method: "Top smiley → A; descending tiers map to B, C, D/F." },
  { source: "Dubai Municipality", native: "High/Medium/Low risk + compliance", method: "Compliance outcome + risk tier → normalized score; grade from band." },
  { source: "AI-assisted (no live API)", native: "Estimated from public records", method: "Gemini 3.1 Pro performs live web search of official sources; each result carries a confidence level (high/medium/low/none) and verification source. Unverified results are filtered out." },
];

export default function GradingSection() {
  return (
    <Section id="grading">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-5">The Universal A–F Grade</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {GRADE_TABLE.map(({ grade, range, color, text, label }) => (
          <div key={grade} className={`${color} rounded-2xl p-3 text-center shadow-sm`}>
            <div className={`text-2xl font-extrabold ${text}`}>{grade}</div>
            <div className={`text-xs font-bold mt-0.5 ${text}`}>{label}</div>
            <div className={`text-[10px] font-semibold opacity-80 mt-0.5 ${text}`}>{range}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Raw scores from each jurisdiction (penalty points, pass/fail outcomes, letter grades) are normalized to a universal 0–100 scale. A score of 85 means different underlying criteria in Los Angeles vs. Chicago — the grade gives you a consistent at-a-glance verdict, but always review the full violation history for context.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 items-start mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-black text-lg">U</span>
        </div>
        <div>
          <p className="font-extrabold text-slate-800 text-sm mb-1">Unknown — What does this mean?</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            A <strong>U grade</strong> means we found this establishment but have <strong>no official inspection records</strong> on file. This is more common than you might think — many restaurants, food trucks, and pop-ups have never been inspected, or their records aren't publicly available yet.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> If past inspections exist, you'll see their full history and trend chart on the detail page — even if a current score can't be calculated.</li>
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> If no inspections exist at all, the listing shows a clear "No official records found" notice — not a fabricated score.</li>
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> A U grade is <strong>not necessarily bad</strong> — but it means you should call ahead or check with your local health department before dining.</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="text-xl font-extrabold text-slate-900">Normalization by Source</h3>
        <Pill color="bg-slate-100 text-slate-700">Auditable</Pill>
      </div>
      <p className="text-slate-500 text-sm mb-4">Each jurisdiction's native scoring system and how it maps to the universal scale.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-left">
              <th className="py-2 pr-4 font-extrabold text-slate-700 text-xs uppercase tracking-wider">Source</th>
              <th className="py-2 pr-4 font-extrabold text-slate-700 text-xs uppercase tracking-wider">Native system</th>
              <th className="py-2 font-extrabold text-slate-700 text-xs uppercase tracking-wider">Conversion method</th>
            </tr>
          </thead>
          <tbody>
            {NORMALIZATION.map(({ source, native, method }) => (
              <tr key={source} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-bold text-slate-900 whitespace-nowrap">{source}</td>
                <td className="py-3 pr-4 text-slate-600">{native}</td>
                <td className="py-3 text-slate-600 leading-relaxed">{method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}