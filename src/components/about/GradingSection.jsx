import { Section, Pill } from "./SectionPrimitives";

const GRADE_TABLE = [
  { grade: "A", range: "90–100", color: "bg-green-700", text: "text-white", label: "Excellent" },
  { grade: "B", range: "80–89", color: "bg-green-400", text: "text-white", label: "Good" },
  { grade: "C", range: "70–79", color: "bg-yellow-400", text: "text-slate-800", label: "Okay" },
  { grade: "D", range: "60–69", color: "bg-orange-400", text: "text-white", label: "Poor" },
  { grade: "F", range: "< 60", color: "bg-red-600", text: "text-white", label: "Critical" },
  { grade: "P", range: "Pass/Fail", color: "bg-teal-500", text: "text-white", label: "Passed" },
  { grade: "U", range: "No data", color: "bg-slate-400", text: "text-white", label: "Unknown" },
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

      {/* Pass / Fail jurisdictions */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex gap-3 items-start mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-black text-lg">P</span>
        </div>
        <div>
          <p className="font-extrabold text-slate-800 text-sm mb-1">Pass / Fail Jurisdictions</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Some jurisdictions — like Chicago, Delaware, Toronto, and others — use a simple <strong>Pass / Fail</strong> system instead of numeric scores. A restaurant that <strong>passes</strong> gets a <strong className="text-green-600">teal P badge</strong>, meaning it met health inspection standards. A restaurant that <strong>fails</strong> gets a <strong className="text-red-600">red F badge</strong>, indicating serious violations that failed to meet minimum requirements.
          </p>
        </div>
      </div>

      {/* U grade */}
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

      {/* Normalization approach — high-level only, no formulas */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="text-xl font-extrabold text-slate-900">How Normalization Works</h3>
        <Pill color="bg-slate-100 text-slate-700">Proprietary Method</Pill>
      </div>
      <p className="text-slate-500 text-sm mb-4">
        Every jurisdiction grades differently — penalty points in LA, letter grades in NYC, star ratings in
        London, pass/fail in Chicago. SafeEats™ normalizes all of them to a single 0–100 scale using a
        proprietary conversion methodology tailored to each source's native data structure. The process
        accounts for the unique scoring scheme of each jurisdiction and is applied uniformly after conversion
        to derive the letter grade (A≥90, B≥80, C≥70, D≥60, F&lt;60). The specific conversion formulas,
        weight assignments, and tiered mappings are proprietary to SafeEats™ and are not publicly disclosed.
      </p>

      {/* Current vs Legacy Grade — concept only, no algorithm details */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3 className="text-xl font-extrabold text-slate-900">Current Grade vs Legacy Grade</h3>
          <Pill color="bg-indigo-100 text-indigo-700">Trend Intelligence</Pill>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          A single snapshot score can be misleading — a restaurant that scored 95 on its last visit might
          have averaged 72 over the past three years. SafeEats™ computes <strong>two distinct grades</strong>
          for every establishment with inspection history, and visualizes them on an interactive trend graph:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 border border-indigo-100">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Current Grade</p>
            <p className="text-sm font-bold text-slate-800 mb-1">Most Recent Inspection</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Derived from the single most recent inspection on file. This is what the restaurant scored
              <em> today</em> — the grade shown on the search card and in the hero section of the detail page.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-indigo-100">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Legacy Grade</p>
            <p className="text-sm font-bold text-slate-800 mb-1">All-Time Historical Average</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              The average of every inspection score on record, converted to a letter grade.
              This reveals the establishment's <em>long-term</em> safety pattern — not just a single
              good or bad day.
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
          <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="text-indigo-500">📈</span> Interactive Trend Graph
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            On each restaurant's detail page (when 2+ inspections exist), SafeEats™ renders an interactive
            area chart showing the score trajectory over time, with color-coded data points, grade threshold
            reference lines, and an automatic trend badge (Improving / Stable / Declining) that contextualizes
            the restaurant's safety direction over time.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Why this matters:</strong> A restaurant with a Current Grade of A but a Legacy Grade of C
            may have just had a single good inspection after years of problems. Conversely, a Current Grade of C
            with a Legacy Grade of A may indicate a recent slip from an otherwise strong track record. This
            dual-grade system gives diners context that a single score cannot.
          </p>
        </div>
      </div>
    </Section>
  );
}