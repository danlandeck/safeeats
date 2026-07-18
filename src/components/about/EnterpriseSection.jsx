import { Link } from "react-router-dom";
import { Building2, Globe, BarChart3, ShieldCheck, Workflow, FileSpreadsheet, Layers, Zap, Code2, Database, Lock, CheckCircle2, ArrowRight, Server } from "lucide-react";
import { Section, Pill } from "./SectionPrimitives";
import { Button } from "@/components/ui/button";

const STATS = [
  { value: "20", label: "Live data sources", sub: "Direct government APIs" },
  { value: "3", label: "Countries with live APIs", sub: "US, UK, Canada" },
  { value: "74", label: "Countries mapped", sub: "170+ health departments" },
  { value: "1", label: "Universal A–F + Pass/Fail", sub: "Apples-to-apples, worldwide" },
];

const USE_CASES = [
  { icon: <Globe className="w-5 h-5" />, title: "Maps & Local Search", body: "Embed safety grades alongside business listings — the same way Google Maps shows ratings today, but backed by inspector-issued data, not crowd reviews." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Restaurant Guides & Rankings", body: "Power a ZAGAT-style guide with a defensible, objective safety layer. Every score traces back to an official inspection record." },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "Travel & Booking Platforms", body: "Surface food safety grades on hotel, trip-planning, and reservation flows so travelers dine with confidence in any country." },
  { icon: <Workflow className="w-5 h-5" />, title: "Insurance & Risk Underwriting", body: "Feed normalized violation histories into risk models for food-contamination liability and commercial policy pricing." },
  { icon: <FileSpreadsheet className="w-5 h-5" />, title: "Supply Chain & Procurement", body: "Vet distributors, commissaries, and food vendors against a consistent safety benchmark across jurisdictions." },
  { icon: <Layers className="w-5 h-5" />, title: "Public Health & Research", body: "Cross-jurisdictional trend analysis on a single normalized schema — ready for academic and policy research." },
];

const API_FEATURES = [
  { icon: <Zap className="w-4 h-4" />, title: "Real-time", body: "Live government APIs queried at request time — no stale snapshots." },
  { icon: <Code2 className="w-4 h-4" />, title: "REST / JSON", body: "Clean, documented endpoints. Search, detail, and history by business ID." },
  { icon: <Database className="w-4 h-4" />, title: "Normalized schema", body: "One unified record shape across every source — no per-jurisdiction parsing." },
  { icon: <Lock className="w-4 h-4" />, title: "Tiered access", body: "Free public tier for evaluation; volume & enterprise licensing available." },
];

const TIERS = [
  { name: "Evaluation", price: "Free", features: ["Public-tier API access", "Rate-limited", "For prototyping & due diligence"], cta: "Start exploring", highlight: false },
  { name: "Enterprise", price: "Custom", features: ["Volume API licensing", "Bulk data export", "SLA & support", "Custom jurisdictions"], cta: "Request a quote", highlight: true },
  { name: "Acquisition", price: "—", features: ["Full dataset & pipeline", "Source code & infrastructure", "Ongoing data partnerships", "Transition support"], cta: "Open a conversation", highlight: false },
];

export default function EnterpriseSection() {
  return (
    <>
      <div id="enterprise" className="scroll-mt-32 text-center pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-white font-semibold mb-4 shadow-lg">
          <Building2 className="w-5 h-5 text-emerald-400" />
          Enterprise & API
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          The world's food safety data, <span className="text-[#4CAF50]">ready to integrate</span>
        </h2>
        <p className="mt-3 text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
          The same engine that powers the consumer app — a single normalized, globally comparable dataset — available for licensing, embedding, and acquisition.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map(({ value, label, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs font-bold text-slate-700 mt-1">{label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      <Section>
        <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Built For</h3>
        <p className="text-slate-500 text-sm mb-6">The companies and platforms that gain the most from a unified food safety layer.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {USE_CASES.map(({ icon, title, body }) => (
            <div key={title} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-white">{icon}</div>
              <div>
                <p className="font-extrabold text-slate-900 mb-1">{title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="text-2xl font-extrabold text-slate-900">API Access</h3>
          <Pill color="bg-emerald-600 text-white">Developer-ready</Pill>
        </div>
        <p className="text-slate-600 leading-relaxed text-sm mb-6">
          SafeEats exposes a clean REST/JSON interface for search, restaurant detail, and full inspection history. The same engine that powers the consumer app — available for licensing and embedding.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {API_FEATURES.map(({ icon, title, body }) => (
            <div key={title} className="flex gap-3 items-start p-4 bg-white rounded-xl border border-emerald-100">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white">{icon}</div>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Licensing</h3>
        <p className="text-slate-500 text-sm mb-6">Flexible terms for evaluation, integration, and acquisition.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map(({ name, price, features, cta, highlight }) => (
            <div key={name} className={`rounded-2xl p-5 border-2 ${highlight ? "border-[#4CAF50] bg-emerald-50" : "border-slate-200 bg-white"}`}>
              <p className="font-extrabold text-slate-900">{name}</p>
              <p className="text-2xl font-black text-slate-900 mt-1 mb-4">{price}</p>
              <ul className="space-y-2 mb-5">
                {features.map((f) => (
                  <li key={f} className="flex gap-2 items-start text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4CAF50] flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="block">
                <Button className={`w-full text-xs font-bold ${highlight ? "bg-[#4CAF50] hover:bg-[#43A047] text-white" : "bg-slate-900 hover:bg-slate-700 text-white"}`}>{cta}</Button>
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-slate-900 border-slate-900 text-center">
        <Server className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-extrabold text-white mb-2">Let's talk data.</h2>
        <p className="text-slate-300 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
          Whether you're evaluating an integration, licensing the dataset, or exploring an acquisition — we're ready to share the full picture.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/contact">
            <Button className="bg-[#4CAF50] hover:bg-[#43A047] text-white">Contact the team <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
          </Link>
          <a href="#trust">
            <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-800">Our trust controls</Button>
          </a>
        </div>
      </Section>
    </>
  );
}