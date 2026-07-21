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

// ── Conversion Archetypes ─────────────────────────────────────────────────────
// Every jurisdiction's native scoring system is converted to a 0–100 intermediate
// via one of seven distinct methodologies. The conversion rules below are the
// auditable, code-level formulas — not approximate descriptions.
const CONVERSION_ARCHETYPES = [
  {
    id: "direct",
    name: "Archetype 1 — Direct Pass-Through",
    principle: "Native score is already a 0–100 safety score. No arithmetic conversion needed; clamped to [0, 100].",
    formula: "safetyScore = clamp(nativeScore, 0, 100)",
    jurisdictions: [
      { source: "LA County DPH", native: "Numeric score 0–100 (SCORE field)", detail: "Already a 0–100 safety score. Used directly. Grade letter (A/B/C) from source preserved." },
      { source: "Louisville / Jefferson Co., KY", native: "Numeric score 0–100", detail: "Already a 0–100 safety score. Used directly; native letter grade (A/B/C/D/U) preserved when available." },
      { source: "Wake County, NC", native: "Numeric score 0–100 (SCORE field)", detail: "Already a 0–100 safety score. Used directly." },
      { source: "Alabama (ADPH, state-wide)", native: "Numeric score 0–100", detail: "Backend scraper extracts numeric score from ADPH portal. Used directly." },
    ],
  },
  {
    id: "inversion",
    name: "Archetype 2 — Penalty Point Inversion",
    principle: "Native score is a penalty/deduction point total (higher = worse). Inverted via 100 − penaltyPoints to produce a safety score (higher = better).",
    formula: "safetyScore = clamp(100 − penaltyPoints, 0, 100)",
    jurisdictions: [
      { source: "King County, WA (Seattle)", native: "Penalty point total (SCORE_INSPECTION)", detail: "100 − SCORE_INSPECTION. Inspection result text (Complete, Incomplete, etc.) shown alongside for context." },
      { source: "NYC DOHMH", native: "Violation point total (score field)", detail: "100 − violationPoints. NYC's native letter grade (A/B/C) is not used; SafeEats derives its own from the inverted score." },
    ],
  },
  {
    id: "weighted",
    name: "Archetype 3 — Weighted Violation Count",
    principle: "Native data provides violation counts by severity tier. Each tier carries a fixed point weight; sum is subtracted from 100.",
    formula: "safetyScore = clamp(100 − Σ(tierWeightᵢ × countᵢ), 0, 100)",
    jurisdictions: [
      { source: "NY State DOH", native: "Critical + non-critical violation counts", detail: "100 − (criticals × 7 + nonCriticals × 2). Weights: critical = 7 pts, non-critical = 2 pts." },
      { source: "Boston, MA", native: "Critical (**) + minor violation counts", detail: "100 − (criticals × 8 + minors × 2). Violations marked '**' = critical (8 pts), all others = minor (2 pts)." },
      { source: "Washington DC", native: "Priority + priority foundation + core counts", detail: "100 − (priority × 7 + priorityFoundation × 4 + round(core × 1.5)). FDA Food Code tier weights." },
      { source: "Illinois CDP Portal", native: "Risk factor + good retail + repeat counts", detail: "100 − (riskFactor × 7 + round(goodRetail × 1.5) + repeat × 3). Additional penalty for repeat violations." },
      { source: "Indiana Marion Co. (Indianapolis)", native: "Priority + priority foundation + core counts", detail: "100 − (priority × 7 + priorityFoundation × 4 + core × 2). FDA Food Code tier weights from MCPHD portal." },
      { source: "Florida DBPR", native: "High priority + intermediate + basic counts", detail: "100 − (highPriority × 10 + intermediate × 5 + basic × 2). Tiered weights for FL DBPR violation categories." },
    ],
  },
  {
    id: "tiered",
    name: "Archetype 4 — Violation Count Tiered Mapping",
    principle: "Native data provides only a raw violation count (no severity tiers). A tiered lookup table maps count ranges to fixed safety scores.",
    formula: "safetyScore = tieredLookup(violationCount)",
    jurisdictions: [
      { source: "Delaware", native: "Violation count per inspection", detail: "0 violations → 95; 1–2 → 80; 3–5 → 65; 6–10 → 50; 11+ → 30. No severity data available from DPH API." },
      { source: "Tri-County Colorado (Adams, Arapahoe, Douglas)", native: "Foodborne illness risk + good retail practice counts", detail: "riskIndex = risk × 7 + round(goodRetail × 1.5). If riskIndex ≥ 110 → 20; if ≥ 50 → 45; else max(55, 95 − riskIndex). Hybrid of weighted + tiered." },
    ],
  },
  {
    id: "result",
    name: "Archetype 5 — Result-Based Discrete Mapping",
    principle: "Native data uses Pass/Fail/Conditional outcomes without numeric scores. Each outcome maps to a fixed penalty subtracted from 100; violation counts add additional deductions.",
    formula: "safetyScore = clamp(100 − basePenalty(outcome) − violationDeduction, 0, 100)",
    jurisdictions: [
      { source: "Chicago, IL (CDPH)", native: "Pass / Pass w/ Conditions / Fail", detail: "Pass → 92 (100−8); Pass w/ Conditions → 76 (100−24); Fail → 45 (100−55). Fixed penalties per outcome." },
      { source: "San Francisco, CA", native: "Facility rating status + violation count", detail: "Closed → 20 (100−80); Conditional → 100−(35+violations×3); Pass → 100−(violations×3). Base penalty + per-violation deduction." },
      { source: "Toronto DineSafe (Canada)", native: "Closed / Conditional Pass / Pass + infractions", detail: "100 − (closedCount × 20 + conditionalCount × 5 + otherInfractions × 1). Aggregated across all inspection visits." },
      { source: "Stanislaus County, CA", native: "Permit status (Open / Closed)", detail: "Closed → 25; Open → 85. Binary status mapping; no per-violation granularity available." },
      { source: "Australia NSW / QLD", native: "Pass / Fail / Notice outcome per inspection", detail: "Latest = Fail → 45; 0 historical fails → 88; some historical fails → 72. Three-tier mapping based on latest + history." },
    ],
  },
  {
    id: "lookup",
    name: "Archetype 6 — Grade/Star Lookup Table",
    principle: "Native data uses a categorical grade or star rating. A fixed lookup table maps each category to a safety score. When sub-scores are available, a penalty-inversion formula is used instead.",
    formula: "safetyScore = lookupTable[nativeGrade] OR clamp(100 − (subscores / maxPenalty) × 100, 0, 100)",
    jurisdictions: [
      { source: "UK FSA (FHRS)", native: "0–5 star rating + sub-scores (Hygiene, Structural, Confidence in Management)", detail: "If sub-scores present: 100 − ((Hygiene + Structural + ConfidenceInManagement) / 80) × 100, clamped. Else star lookup: 5★→95, 4★→82, 3★→68, 2★→52, 1★→35, 0★→15. 'Pass'→92, 'Improvement Required'→55." },
      { source: "Singapore (SFA/NEA)", native: "Letter grade A–E", detail: "A→95, B→80, C→60, D→40, E→20. Fixed lookup per SFA hygiene grade." },
      { source: "FVHD, CT (Farmington Valley)", native: "Letter grade A/B/C/U", detail: "A→95, B→85, C→75, U→30. Fixed lookup per FVHD food rating." },
      { source: "Denmark Smiley (AI-estimated)", native: "4-tier smiley (☺–☹)", detail: "Top smiley → 95 (A); second → 78 (C); third → 60 (D); bottom → 35 (F). AI reads findsmiley.dk public database." },
    ],
  },
  {
    id: "ai",
    name: "Archetype 7 — AI-Enriched (LLM Web Search)",
    principle: "For jurisdictions with no live API, Gemini 3 Flash performs live web search of official health department records. The LLM returns either a violation point total (inverted) or a numeric score (used directly), with a confidence level and verification source.",
    formula: "if violationPoints: safetyScore = clamp(100 − violationPoints, 0, 100); elif latestScore: safetyScore = clamp(latestScore, 0, 100) [bumped to 85 if result=Pass and score<75]; else: null (U grade)",
    jurisdictions: [
      { source: "Dubai Municipality (AI-estimated)", native: "High/Medium/Low risk + compliance status", detail: "AI reads Dubai Municipality public sources. Compliance + risk tier → estimated violation points → inverted to safety score." },
      { source: "Mississippi, Oklahoma, S. Carolina, Utah, SD, VT, WY (backend scrapers)", native: "Numeric score or grade from state portal", detail: "Backend scrapers extract native scores from state health portals. If numeric → Archetype 1 (direct). If grade → Archetype 6 (lookup). If Pass/Fail → Archetype 5 (result-based)." },
      { source: "All other global jurisdictions (no live API)", native: "Estimated from public web records", detail: "Gemini 3 Flash live web search. Each result carries a confidence level (high/medium/low/none) and verification source. Unverified results are filtered out entirely." },
    ],
  },
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
        <Pill color="bg-teal-100 text-teal-700">7 Conversion Archetypes</Pill>
      </div>
      <p className="text-slate-500 text-sm mb-4">
        Every jurisdiction's native scoring system is converted to the universal 0–100 intermediate via one of seven
        distinct methodologies. The formulas below are the exact, code-level conversion rules — not approximate descriptions.
        The 0–100 → letter grade step (A≥90, B≥80, C≥70, D≥60, F&lt;60) is applied uniformly after conversion and is not jurisdiction-specific.
      </p>

      {CONVERSION_ARCHETYPES.map((archetype) => (
        <div key={archetype.id} className="mb-5 border border-slate-200 rounded-2xl overflow-hidden">
          {/* Archetype header */}
          <div className="bg-slate-900 px-4 py-3">
            <h4 className="text-sm font-extrabold text-white">{archetype.name}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{archetype.principle}</p>
          </div>
          {/* Formula */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Formula</p>
            <code className="text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 block overflow-x-auto whitespace-pre-wrap break-all">
              {archetype.formula}
            </code>
          </div>
          {/* Jurisdictions */}
          <div className="divide-y divide-slate-100">
            {archetype.jurisdictions.map((j) => (
              <div key={j.source} className="px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                  <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{j.source}</span>
                  <span className="text-xs text-slate-500 font-medium">{j.native}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{j.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Worked examples */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <h4 className="text-sm font-extrabold text-slate-900 mb-3">Worked Examples</h4>
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <div>
            <p className="font-bold text-slate-800 mb-0.5">UK FHRS Rating of 4 (sub-scores: Hygiene=5, Structural=5, Confidence=10):</p>
            <p className="font-mono text-slate-600">penalty = 5 + 5 + 10 = 20 → score = 100 − (20/80)×100 = 100 − 25 = <strong className="text-slate-900">75</strong> → Grade C</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 mb-0.5">King County penalty total of 12 points:</p>
            <p className="font-mono text-slate-600">score = 100 − 12 = <strong className="text-slate-900">88</strong> → Grade B</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 mb-0.5">Chicago restaurant with "Pass w/ Conditions" result:</p>
            <p className="font-mono text-slate-600">score = 100 − 24 = <strong className="text-slate-900">76</strong> → Grade C</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 mb-0.5">NY State inspection with 3 critical + 5 non-critical violations:</p>
            <p className="font-mono text-slate-600">penalty = 3×7 + 5×2 = 21 + 10 = 31 → score = 100 − 31 = <strong className="text-slate-900">69</strong> → Grade D</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 mb-0.5">Singapore SFA Grade B restaurant:</p>
            <p className="font-mono text-slate-600">lookup[B] = <strong className="text-slate-900">80</strong> → Grade B</p>
          </div>
        </div>
      </div>
    </Section>
  );
}