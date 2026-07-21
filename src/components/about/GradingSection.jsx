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
    patent_disclosure: {
      status: "EXPLICITLY UNCLAIMED — FALLBACK EMBODIMENT",
      note: "This archetype is documented as a distinct fallback embodiment for disclosure purposes only. It is NOT claimed in any independent or dependent claim. Per counsel guidance: (1) Post-Alice, 'use an LLM to estimate a value when real data is unavailable' is close to unpatentable as an abstract idea. (2) §112 enablement risk: LLM outputs are not reproducible, which undermines enablement of any claim covering this archetype. (3) Defamation liability exposure: an AI-estimated failing grade (e.g., 'F') displayed on a real, named restaurant that has never failed an inspection creates defamation risk. The confidence filter mitigates but does not eliminate this, as it relies on the model's self-assessed confidence, which is not reliable. (4) Claiming this archetype risks tainting the stronger Archetypes 1–6 claims by association during prosecution. NOTE TO COUNSEL: Exclude from all claims. Retain in disclosure as fallback embodiment only. AI-estimated results (Denmark, Dubai, and all no-API global jurisdictions) are visibly labeled as 'AI-estimated' via DataSourceBadge and StaleDataBanner components on both search cards and detail pages.",
    },
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
          {/* Patent disclosure note — only for unclaimed fallback embodiments */}
          {archetype.patent_disclosure && (
            <div className="bg-red-50 border-t-2 border-red-300 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-200 px-2 py-0.5 rounded-full">
                  {archetype.patent_disclosure.status}
                </span>
              </div>
              <p className="text-xs text-red-800 leading-relaxed">{archetype.patent_disclosure.note}</p>
            </div>
          )}
        </div>
      ))}

      {/* Current vs Legacy Grade */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3 className="text-xl font-extrabold text-slate-900">Current Grade vs Legacy Grade</h3>
          <Pill color="bg-indigo-100 text-indigo-700">Trend Intelligence</Pill>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          A single snapshot score can be misleading — a restaurant that scored 95 on its last visit might
          have averaged 72 over the past three years. SafeEats computes <strong>two distinct grades</strong>
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
              The arithmetic mean of every inspection score on record, converted to a letter grade.
              This reveals the establishment's <em>long-term</em> safety pattern — not just a single
              good or bad day.
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
          <p className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="text-indigo-500">📈</span> Interactive Trend Graph
          </p>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            On each restaurant's detail page (when 2+ inspections exist), SafeEats renders an interactive
            area chart showing the score trajectory over time, with:
          </p>
          <ul className="space-y-1 text-xs text-slate-600 ml-1">
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> Color-coded data points (green ≥90, lime ≥80, amber ≥70, red &lt;70)</li>
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> Reference lines for A/B/C/F grade thresholds (90, 80, 70, 60)</li>
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> A dashed average line showing the Legacy Grade position</li>
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> An automatic trend badge: Improving / Stable / Declining (comparing first-half vs second-half averages)</li>
            <li className="flex items-start gap-1.5"><span className="text-slate-400 mt-0.5">•</span> A contextual alert when Current Grade differs from Legacy Grade (e.g. "recent decline in safety standards")</li>
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Why this matters:</strong> A restaurant with a Current Grade of A but a Legacy Grade of C
            may have just had a single good inspection after years of problems. Conversely, a Current Grade of C
            with a Legacy Grade of A may indicate a recent slip from an otherwise strong track record. This
            dual-grade system gives diners context that a single score cannot — and is a core differentiator
            of the SafeEats normalization invention.
          </p>
        </div>
      </div>

      {/* ── Patent Disclosure: Secondary / Unclaimed Embodiments ── */}
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3 className="text-xl font-extrabold text-red-900">Patent Disclosure — Unclaimed Embodiments</h3>
          <Pill color="bg-red-200 text-red-800">Not Claimed</Pill>
          <Pill color="bg-red-100 text-red-700">For Counsel</Pill>
        </div>
        <p className="text-sm text-red-800 leading-relaxed mb-4">
          The following embodiments are documented in this disclosure for completeness and transparency.
          They are <strong>explicitly excluded from all patent claims</strong> — independent and dependent —
          and are retained solely as fallback or secondary embodiments. Per counsel guidance, claiming these
          risks tainting the stronger claims (Archetypes 1–6 normalization, dual-grade trend intelligence)
          by association during prosecution.
        </p>

        {/* Camera Scanner — Secondary Embodiment */}
        <div className="bg-white border border-red-200 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-extrabold text-slate-900">Secondary Embodiment: Camera Sign Scanner (OCR → Search Pipeline)</h4>
            <Pill color="bg-red-100 text-red-700">§103 Vulnerable</Pill>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            The camera scanner (<code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded">CameraScanner.jsx</code>)
            captures a photo of a restaurant sign, inspection placard, or food label, then uses LLM vision
            (Gemini with <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded">file_urls</code>) to
            extract the establishment name and address via OCR. The extracted text is fed into the existing
            search pipeline as a query string — no score is derived from the image itself.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-1">Note to Counsel</p>
            <p className="text-xs text-red-800 leading-relaxed">
              This is OCR-into-existing-pipeline — reading a restaurant name sign and searching for it.
              Combining known prior art (OCR + search query) via an LLM is vulnerable to a §103 obviousness
              rejection. Documented as a secondary embodiment only; <strong>not claimed</strong>. The food-label
              decoding variant (allergen/nutrition extraction from packaging) is similarly unclaimed and
              documented solely for disclosure completeness.
            </p>
          </div>
        </div>

        {/* Archetype 7 cross-reference */}
        <div className="bg-white border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-extrabold text-slate-900">Fallback Embodiment: Archetype 7 — AI-Enriched Scores</h4>
            <Pill color="bg-red-100 text-red-700">Post-Alice / §112</Pill>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            See Archetype 7 above (red disclosure banner). AI-estimated safety scores via LLM web search
            are documented as a distinct fallback embodiment for jurisdictions with no live API.
            <strong> Explicitly unclaimed.</strong> Key risks: post-Alice abstract idea (§101),
            non-reproducible output (§112 enablement), and defamation liability for AI-estimated failing
            grades on real, named restaurants. AI-estimated results are visibly labeled to end users via
            DataSourceBadge and StaleDataBanner on both search cards and detail pages.
          </p>
        </div>
      </div>

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