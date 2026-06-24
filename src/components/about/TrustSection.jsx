import { FileSearch, Scale, AlertTriangle, Clock, GitBranch, ShieldCheck, CheckCircle2, Globe2 } from "lucide-react";
import { Section } from "./SectionPrimitives";

const TRUST = [
  { icon: <FileSearch className="w-5 h-5" />, title: "Source transparency", body: "Every record stores its source jurisdiction, the original native score, and a freshness timestamp. Users and acquirers can trace any grade back to its origin." },
  { icon: <Scale className="w-5 h-5" />, title: "Documented normalization", body: "Each jurisdiction's conversion logic is published here — no black-box scoring. The mapping is deterministic and auditable." },
  { icon: <AlertTriangle className="w-5 h-5" />, title: "Honest uncertainty", body: "AI-estimated scores are always labeled. A 'U' (Unknown) grade means no records were found — never a fabricated score. We say so when we don't know." },
  { icon: <Clock className="w-5 h-5" />, title: "Freshness tracking", body: "Live-API results are queried at request time. Cached records carry a cached_at timestamp so staleness is visible, not hidden." },
  { icon: <GitBranch className="w-5 h-5" />, title: "Relevance filtering", body: "Post-fetch name-relevance filtering removes false matches from permissive government search APIs — so 'Chipotle' returns Chipotle, not adjacent records." },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "No review contamination", body: "SafeEats never uses consumer reviews (Yelp, Google Reviews) as a safety signal. Scores are inspector-issued only." },
  { icon: <CheckCircle2 className="w-5 h-5" />, title: "AI confidence labeling", body: "Every AI-sourced result is tagged with a confidence level — High (official record found), Medium (restaurant confirmed), Low (found, no inspection details), or None (unverified, filtered out). The confidence is shown on every card and detail page." },
  { icon: <Globe2 className="w-5 h-5" />, title: "Verification sourcing", body: "AI results include the source URL where the restaurant was confirmed (health dept site, official listing). Closed restaurants are flagged. No hallucinated data — if it can't be verified, it's not shown." },
];

export default function TrustSection() {
  return (
    <Section id="trust" className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Trust & Quality Controls</h2>
      <p className="text-slate-500 text-sm mb-6">The safeguards that make SafeEats a defensible, auditable dataset.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TRUST.map(({ icon, title, body }) => (
          <div key={title} className="flex gap-3 items-start p-4 bg-white rounded-xl border border-emerald-100">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm">{icon}</div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">{title}</p>
              <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}