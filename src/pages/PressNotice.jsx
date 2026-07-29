import React from "react";
import { ShieldCheck, Clock, AlertTriangle, CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

// All dates verified against public records (WHOIS, MI Reporter, git commit history).
const TIMELINE = [
  {
    date: "February 17, 2026",
    title: "SafeEats Platform Launched",
    description:
      "SafeEats launched as a functioning application — an international food safety platform built on verified government inspection APIs and months of original development.",
    type: "safeeats",
  },
  {
    date: "April 10, 2026",
    title: "Press Release — MI Reporter",
    description:
      "The MI Reporter published a feature article on SafeEats and its creator, publicly announcing the platform to the community.",
    type: "safeeats",
    link: "https://www.mi-reporter.com/2026/04/10/mihs-graduate-serves-up-safeeats-free-web-app/",
  },
  {
    date: "April 11, 2026",
    title: "safeeats.live Domain Registered",
    description:
      "One day after the press release, the safeeats.live domain was registered via NameCheap, Inc. (WHOIS: registered 2026-04-11, updated 2026-04-16).",
    type: "thirdparty",
    link: "https://www.whois.com/whois/safeeats.live",
  },
  {
    date: "June 24, 2026",
    title: "Normalization Methodology Published",
    description:
      "SafeEats' per-jurisdiction score normalization methodology — the exact conversion formulas across diverse grading systems — was first publicly committed, representing original research and development.",
    type: "safeeats",
  },
  {
    date: "Present",
    title: "SafeEats Continues Independent Operation",
    description:
      "SafeEats remains the original platform for verified, transparent food safety data — continuously expanding live API coverage across multiple countries.",
    type: "safeeats",
  },
];

const DOT_STYLES = {
  safeeats: "bg-brand-green border-brand-green",
  thirdparty: "bg-amber-400 border-amber-500",
};

const CARD_STYLES = {
  safeeats: "border-l-4 border-brand-green bg-green-50",
  thirdparty: "border-l-4 border-amber-500 bg-amber-50",
};

export default function PressNotice() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-12 sm:py-16 px-4 border-b-4 border-brand-green">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-full px-4 py-1.5 mb-6">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-300">Official Brand Notice</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-black tracking-tight mb-4"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            SafeEats is not affiliated with safeeats.live
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            SafeEats launched on February 17, 2026 and was featured in the MI Reporter on April 10, 2026.
            The safeeats.live domain was registered the very next day. All dates below are publicly verifiable.
          </p>
        </div>
      </section>

      {/* Key Finding Callout */}
      <section className="bg-red-50 border-y-2 border-red-200 py-8 px-4">
        <div className="max-w-3xl mx-auto flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1" style={{ fontFamily: "Nunito, sans-serif" }}>
              Registered one day after the press release
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              SafeEats was featured in the{" "}
              <a href="https://www.mi-reporter.com/2026/04/10/mihs-graduate-serves-up-safeeats-free-web-app/" target="_blank" rel="noopener noreferrer" className="font-bold text-red-600 underline">MI Reporter on April 10, 2026</a>.
              The <strong>safeeats.live</strong> domain was registered on <strong>April 11, 2026</strong> — one day later — via NameCheap, Inc.
              (Source:{" "}
              <a href="https://www.whois.com/whois/safeeats.live" target="_blank" rel="noopener noreferrer" className="font-bold text-red-600 underline">WHOIS public records</a>)
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-black text-slate-900 mb-2"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Timeline of Events
          </h2>
          <p className="text-slate-500 mb-8 text-sm">
            Based on publicly verifiable domain registration records and publication dates.
          </p>

          <div className="relative">
            <div className="absolute left-4 sm:left-6 top-2 bottom-2 w-0.5 bg-slate-200" />
            <div className="space-y-6">
              {TIMELINE.map((event, i) => (
                <div key={i} className="relative pl-12 sm:pl-16">
                  <div
                    className={`absolute left-0 top-1 w-8 sm:w-12 h-8 sm:h-12 rounded-full flex items-center justify-center border-2 ${DOT_STYLES[event.type]}`}
                  >
                    {event.type === "safeeats" ? (
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    )}
                  </div>
                  <div className={`bg-white rounded-2xl p-5 shadow-md ${CARD_STYLES[event.type]}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-500">{event.date}</span>
                    </div>
                    <h3
                      className="text-lg font-extrabold text-slate-900 mb-2"
                      style={{ fontFamily: "Nunito, sans-serif" }}
                    >
                      {event.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
                    {event.link && (
                      <a href={event.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-brand-green hover:underline mt-2">
                        View source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="bg-white py-12 px-4 border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-black text-slate-900 mb-6"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            How to Verify You're on the Official SafeEats
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl border-l-4 border-brand-green p-5">
              <CheckCircle2 className="w-6 h-6 text-green-600 mb-2" />
              <h3 className="font-extrabold text-slate-900 mb-1">Official SafeEats</h3>
              <p className="text-sm text-slate-600">
                This platform — independently developed with verified government data sources and original
                methodology.
              </p>
            </div>
            <div className="bg-amber-50 rounded-2xl border-l-4 border-amber-500 p-5">
              <AlertTriangle className="w-6 h-6 text-amber-600 mb-2" />
              <h3 className="font-extrabold text-slate-900 mb-1">Not Affiliated</h3>
              <p className="text-sm text-slate-600">
                safeeats.live is a separate, unaffiliated entity that appeared after SafeEats' public launch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence & Sources */}
      <section className="bg-slate-100 py-12 px-4 border-t border-slate-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-slate-900 mb-6" style={{ fontFamily: "Nunito, sans-serif" }}>
            Public Records & Sources
          </h2>
          <div className="space-y-3">
            <a href="https://www.mi-reporter.com/2026/04/10/mihs-graduate-serves-up-safeeats-free-web-app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <ExternalLink className="w-5 h-5 text-brand-green flex-shrink-0" />
              <div>
                <p className="font-bold text-slate-900 text-sm">MI Reporter — "MIHS graduate serves up SafeEats free web app"</p>
                <p className="text-xs text-slate-500">Published April 10, 2026</p>
              </div>
            </a>
            <a href="https://www.whois.com/whois/safeeats.live" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <ExternalLink className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-slate-900 text-sm">WHOIS — safeeats.live domain registration</p>
                <p className="text-xs text-slate-500">Registered April 11, 2026 via NameCheap, Inc.</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ShieldCheck className="w-12 h-12 text-brand-green mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
            Our Commitment to Originality & Safety
          </h2>
          <p className="text-slate-300 leading-relaxed mb-6">
            SafeEats was independently developed with a commitment to verified, transparent food safety data.
            Our methodology, data normalization archetypes, and international coverage model are the result of
            original research and development.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green/90 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
          >
            Return to SafeEats <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}