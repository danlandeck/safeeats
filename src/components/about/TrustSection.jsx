import { FileSearch, Scale, Clock, Filter, Copy, MapPin, ShieldCheck, CheckCircle2, Globe2, Cpu, AlertTriangle } from "lucide-react";
import { Section } from "./SectionPrimitives";

const TRUST = [
  { icon: <FileSearch className="w-5 h-5" />, title: "Source provenance", body: "Every record stores its source jurisdiction, the original native score, and a freshness timestamp. Any grade can be traced back to its issuing authority — no anonymous data." },
  { icon: <Scale className="w-5 h-5" />, title: "Documented normalization", body: "Each jurisdiction's conversion logic is published on this page — no black-box scoring. The mapping from local violations to a 0–100 score is deterministic and auditable." },
  { icon: <Clock className="w-5 h-5" />, title: "Freshness tracking", body: "Live-API results are queried at request time. Cached records carry a cached_at and last_api_check timestamp so staleness is visible, not hidden." },
  { icon: <Filter className="w-5 h-5" />, title: "Relevance filtering", body: "Post-fetch name-relevance filtering strips false matches from permissive government search APIs — so 'Chipotle' returns Chipotle, not adjacent records the API bundled in." },
  { icon: <Copy className="w-5 h-5" />, title: "Mandatory deduplication", body: "Every result set is deduplicated by normalized name + address prefix before display, collapsing the same establishment that reappeared across API pages or sources." },
  { icon: <CheckCircle2 className="w-5 h-5" />, title: "Unverified-result filtering", body: "AI results the model could not verify (confidence = 'none') are dropped entirely, as are restaurants confirmed closed. 'Restaurant found, no inspection details' is kept and labeled — not invented into a score." },
  { icon: <Globe2 className="w-5 h-5" />, title: "Verification sourcing", body: "AI results include the URL where the restaurant was confirmed (health dept site, official listing). If it can't be verified, it's not shown — zero hallucinated records." },
  { icon: <MapPin className="w-5 h-5" />, title: "Geo-fencing", body: "Location validation runs on raw AI output before any field override. A result whose city/address doesn't match the requested region is rejected — so a Dubai search never returns a Miami strip mall." },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "No review contamination", body: "SafeEats never uses consumer reviews (Yelp, Google Reviews) as a safety signal. Scores are inspector-issued only — opinions never move a grade." },
  { icon: <AlertTriangle className="w-5 h-5" />, title: "Honest uncertainty", body: "AI-estimated scores are always labeled. A 'U' (Unknown) grade means no records were found — never a fabricated score. We say so when we don't know." },
  { icon: <Cpu className="w-5 h-5" />, title: "Tiered model accuracy", body: "Web-search results use Gemini 3.1 Pro for maximum retrieval accuracy; fast preliminary results use Claude Opus 4.8. The right model for each step — never a single weak model for everything." },
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