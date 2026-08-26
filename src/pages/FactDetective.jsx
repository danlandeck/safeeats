import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Search,
  FileCheck,
  Link2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Eye,
  Scale,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    icon: Database,
    step: "01",
    title: "Direct from the source",
    body: "Every score comes straight from official government health department APIs and open-data portals — not scraped HTML, not a third-party aggregator, not an AI guess. We connect to the same databases the inspectors use.",
    accent: "authority-teal",
  },
  {
    icon: RefreshCw,
    step: "02",
    title: "Live refresh, not a snapshot",
    body: "Our backend re-queries each jurisdiction's live endpoint when you search. When a restaurant is reinspected, the new grade shows up here — not months later from a stale export someone downloaded once.",
    accent: "brand-green",
  },
  {
    icon: Search,
    step: "03",
    title: "Every record is traceable",
    body: "Each restaurant profile links back to the exact official record it came from. One tap takes you to the health department page so you can verify the score yourself. No black box, no 'trust us.'",
    accent: "authority-gold",
  },
  {
    icon: FileCheck,
    step: "04",
    title: "Normalized, not invented",
    body: "Different counties grade differently — points, letter grades, pass/fail, demerits. We translate each system into a single 0–100 scale using documented, per-jurisdiction rules. We never fabricate a number.",
    accent: "authority-teal",
  },
];

const FRESHNESS = [
  {
    icon: RefreshCw,
    title: "On-demand live queries",
    body: "When you search a restaurant, we hit the health department's live API in real time — not a cached snapshot from last quarter.",
  },
  {
    icon: Clock,
    title: "Stale-data warnings",
    body: "If the most recent inspection on record is older than typical for that jurisdiction, we flag it openly with a banner instead of hiding the date.",
  },
  {
    icon: Database,
    title: "Official endpoints only",
    body: "We list every data source and its government portal link on our Coverage page. No mystery feeds, no resold data, no scraped PDFs dressed up as 'live.'",
  },
];

const COMPARISON = [
  {
    label: "Where the score comes from",
    safeeats: "Live government API call",
    copycat: "Scraped HTML or AI estimate",
  },
  {
    label: "Can you verify it yourself?",
    safeeats: "Direct link to the official record",
    copycat: "No source link, or a broken one",
  },
  {
    label: "How current is it?",
    safeeats: "Re-queried when you search",
    copycat: "Unknown — often a one-time snapshot",
  },
  {
    label: "Who built it?",
    safeeats: "Independent, months of original dev",
    copycat: "Registered a domain the day after press coverage",
  },
  {
    label: "Methodology public?",
    safeeats: "Documented per-jurisdiction rules",
    copycat: "No explanation of how scores are made",
  },
];

export default function FactDetective() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-14 sm:py-20 px-4 border-b-4 border-authority-teal">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-authority-teal/20 border border-authority-teal/40 rounded-full px-4 py-1.5 mb-6">
            <Eye className="w-4 h-4 text-authority-teal" />
            <span className="text-sm font-bold text-teal-300">Fact Detective</span>
          </div>
          <h1
            className="text-3xl sm:text-5xl font-black tracking-tight mb-4 font-heading"
          >
            How we verify every score
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            SafeEats™ doesn't ask you to trust a number on a screen. Here's exactly how each
            inspection grade gets from the health inspector's clipboard to your phone — and why
            that process makes us more reliable than the copycats.
          </p>
        </div>
      </section>

      {/* Verification Pipeline */}
      <section className="py-14 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-authority-navy mb-2 font-heading">
              The verification pipeline
            </h2>
            <p className="text-slate-500 text-sm">
              Four steps, no shortcuts. Every restaurant on SafeEats™ passes through all of them.
            </p>
          </div>

          <div className="space-y-4">
            {PIPELINE_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-authority-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 tracking-widest">
                        STEP {s.step}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">
                      {s.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How we keep it current */}
      <section className="bg-white py-14 sm:py-16 px-4 border-y border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-authority-teal font-bold text-sm mb-2">
              <RefreshCw className="w-4 h-4" /> Keeping it current
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-authority-navy mb-2 font-heading">
              Stale data is just as bad as wrong data
            </h2>
            <p className="text-slate-500 text-sm">
              A restaurant can go from an A to a C overnight. Here's how we make sure you're not
              reading last year's grade.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {FRESHNESS.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-slate-50 rounded-2xl border border-slate-100 p-5"
                >
                  <Icon className="w-6 h-6 text-authority-teal mb-3" />
                  <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SafeEats vs. Copycats */}
      <section className="py-14 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-authority-gold font-bold text-sm mb-2">
              <Scale className="w-4 h-4" /> Real data vs. copycat shortcuts
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-authority-navy mb-2 font-heading">
              Why our sources are more reliable
            </h2>
            <p className="text-slate-500 text-sm">
              The difference between a verified grade and a rip-off artist's guess.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 bg-slate-900 text-white text-xs sm:text-sm font-bold">
              <div className="p-3 sm:p-4">Question</div>
              <div className="p-3 sm:p-4 border-l border-white/10 text-authority-teal">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> SafeEats™
                </div>
              </div>
              <div className="p-3 sm:p-4 border-l border-white/10 text-red-400">
                <div className="flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Copycats
                </div>
              </div>
            </div>
            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 text-xs sm:text-sm ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50"
                }`}
              >
                <div className="p-3 sm:p-4 font-semibold text-slate-700">{row.label}</div>
                <div className="p-3 sm:p-4 border-l border-slate-100 flex items-start gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-green flex-shrink-0 mt-0.5" />
                  <span>{row.safeeats}</span>
                </div>
                <div className="p-3 sm:p-4 border-l border-slate-100 flex items-start gap-1.5 text-slate-500">
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{row.copycat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency CTA */}
      <section className="bg-slate-900 text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <BadgeCheck className="w-12 h-12 text-authority-teal mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-black mb-4 font-heading">
            Verify it yourself — that's the whole point
          </h2>
          <p className="text-slate-300 leading-relaxed mb-8">
            Every restaurant profile on SafeEats™ carries a "Verified Source" badge and a direct
            link to the official health department record. We don't expect you to take our word for
            it. We built the tools so you don't have to.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/global-coverage"
              className="inline-flex items-center gap-2 bg-authority-teal hover:bg-authority-teal/90 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
            >
              <Layers className="w-4 h-4" /> See our data sources
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
            >
              Try a search <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}