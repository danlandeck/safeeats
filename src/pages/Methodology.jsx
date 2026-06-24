import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FlaskConical, Database, Scale, ShieldCheck, GitBranch, AlertTriangle, FileSearch, Layers, CheckCircle2, Clock, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Section = ({ children, className = "" }) => (
  <Card className={`p-7 sm:p-9 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
    {children}
  </Card>
);

const Pill = ({ children, color = "bg-slate-900 text-white" }) => (
  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{children}</span>
);

const GRADE_TABLE = [
  { grade: "A", range: "90–100", label: "Excellent", color: "bg-green-700", text: "text-white" },
  { grade: "B", range: "80–89", label: "Good", color: "bg-green-400", text: "text-white" },
  { grade: "C", range: "70–79", label: "Okay", color: "bg-yellow-400", text: "text-slate-800" },
  { grade: "D", range: "60–69", label: "Poor", color: "bg-orange-400", text: "text-white" },
  { grade: "F", range: "< 60", label: "Critical", color: "bg-red-600", text: "text-white" },
  { grade: "U", range: "No data", label: "Unknown", color: "bg-slate-400", text: "text-white" },
];

const NORMALIZATION = [
  { source: "NYC DOHMH", native: "Letter grade A/B/C", method: "Mapped directly to SafeEats A–F; numeric score derived from violation points." },
  { source: "LA County DPH", native: "Penalty point score", method: "Inverted to 0–100 (100 − penalty points); letter grade from resulting band." },
  { source: "Chicago CDPH", native: "Pass / Fail + violation codes", method: "Pass → high score; Fail → F; weighted by violation severity and count." },
  { source: "UK FSA (FHRS)", native: "0–5 star rating", method: "Linear scale to 0–100 (5★ → 90–100, 0★ → < 60); grade from band." },
  { source: "Singapore SFA", native: "Grades A–D", method: "Mapped to SafeEats bands with minor calibration for the D threshold." },
  { source: "Denmark Smiley", native: "4-tier smiley (☺–☹)", method: "Top smiley → A; descending tiers map to B, C, D/F." },
  { source: "Dubai Municipality", native: "High/Medium/Low risk + compliance", method: "Compliance outcome + risk tier → normalized score; grade from band." },
  { source: "AI-assisted (no live API)", native: "Estimated from public records", method: "LLM reads official sources; score flagged as AI-estimated, never presented as official." },
];

const TRUST = [
  { icon: <FileSearch className="w-5 h-5" />, title: "Source transparency", body: "Every record stores its source jurisdiction, the original native score, and a freshness timestamp. Users and acquirers can trace any grade back to its origin." },
  { icon: <Scale className="w-5 h-5" />, title: "Documented normalization", body: "Each jurisdiction's conversion logic is published here — no black-box scoring. The mapping is deterministic and auditable." },
  { icon: <AlertTriangle className="w-5 h-5" />, title: "Honest uncertainty", body: "AI-estimated scores are always labeled. A 'U' (Unknown) grade means no records were found — never a fabricated score. We say so when we don't know." },
  { icon: <Clock className="w-5 h-5" />, title: "Freshness tracking", body: "Live-API results are queried at request time. Cached records carry a cached_at timestamp so staleness is visible, not hidden." },
  { icon: <GitBranch className="w-5 h-5" />, title: "Relevance filtering", body: "Post-fetch name-relevance filtering removes false matches from permissive government search APIs — so 'Chipotle' returns Chipotle, not adjacent records." },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "No review contamination", body: "SafeEats never uses consumer reviews (Yelp, Google Reviews) as a safety signal. Scores are inspector-issued only." },
];

export default function Methodology() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link to="/">
          <Button variant="ghost" className="mb-8 text-slate-500 hover:text-slate-800 -ml-2 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-6">

          {/* Hero */}
          <div className="text-center pb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-white font-semibold mb-5 shadow-lg">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
              Data Methodology & Trust
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              How every grade<br />
              <span className="text-[#4CAF50]">is earned</span>
            </h1>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              SafeEats is built on a single principle: every score must be traceable, auditable, and honestly labeled. This page documents exactly how data is sourced, normalized, and quality-controlled.
            </p>
          </div>

          {/* The universal grade */}
          <Section>
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
            <p className="text-sm text-slate-600 leading-relaxed">
              All native scores — penalty points, pass/fail, letter grades, star ratings, smileys, risk tiers — are converted to a universal 0–100 scale, then banded into A–F. A score of 85 means different underlying criteria in LA vs. Chicago, but the grade gives a consistent at-a-glance verdict. The full violation history is always available for context.
            </p>
          </Section>

          {/* Normalization table */}
          <Section>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-slate-900">Normalization by Source</h2>
              <Pill color="bg-slate-100 text-slate-700">Auditable</Pill>
            </div>
            <p className="text-slate-500 text-sm mb-6">Each jurisdiction's native scoring system and how it maps to the universal scale.</p>
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

          {/* Data pipeline */}
          <Section>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">The Data Pipeline</h2>
            <p className="text-slate-500 text-sm mb-6">From government database to your screen — every step documented.</p>
            <div className="space-y-4">
              {[
                { step: "1", icon: <Database className="w-5 h-5" />, title: "Source identification", body: "SafeEats maintains a registry of every confirmed open-data API (15+ jurisdictions) plus AI-assisted research paths for 195+ countries. Each source is verified against the official health department." },
                { step: "2", icon: <Globe2 className="w-5 h-5" />, title: "Live query or AI research", body: "Live-API jurisdictions are queried at request time for real-time data. Jurisdictions without an API use AI-assisted research of public records — clearly labeled as estimated." },
                { step: "3", icon: <Layers className="w-5 h-5" />, title: "Normalization", body: "Native scores are converted to the universal 0–100 scale using the documented per-source mapping above. The original native score is preserved alongside the normalized one." },
                { step: "4", icon: <FileSearch className="w-5 h-5" />, title: "Relevance filtering", body: "Permissive government search APIs can return false matches. A post-fetch name-relevance filter ensures results actually match the query — fail-open if it would remove everything." },
                { step: "5", icon: <ShieldCheck className="w-5 h-5" />, title: "Provenance & labeling", body: "Each record is tagged with its source, freshness, and an isLLMData flag. AI-estimated results are visually distinguished from official data throughout the UI." },
              ].map(({ step, icon, title, body }) => (
                <div key={step} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm">{icon}</div>
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Trust & quality controls */}
          <Section className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Trust & Quality Controls</h2>
            <p className="text-slate-500 text-sm mb-6">The safeguards that make SafeEats a defensible, auditable dataset.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TRUST.map(({ icon, title, body }) => (
                <div key={title} className="flex gap-3 items-start p-4 bg-white rounded-xl border border-emerald-100">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                    {icon}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* AI disclosure */}
          <Section className="border-2 border-amber-200 bg-amber-50">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-amber-900 mb-2">AI-Assisted Data — Full Disclosure</h2>
                <div className="space-y-2 text-sm text-amber-800 leading-relaxed">
                  <p>For jurisdictions without a live government API, SafeEats uses AI to research publicly available inspection records. This data is <strong>always labeled</strong> as AI-estimated and never presented as official government data.</p>
                  <p>Preliminary restaurant identification is powered by Anthropic's Claude Opus for maximum accuracy; live web search uses Gemini to pull real-time data from official sources. Both are clearly distinguished from direct-source API data.</p>
                  <p className="font-bold text-amber-900 border-t border-amber-200 pt-2">
                    AI-estimated scores carry additional uncertainty. Always consult your local health department for authoritative records.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Disclaimer */}
          <Section className="border-2 border-red-300 bg-red-50 shadow-none">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-red-900 mb-3">Important Disclaimer</h2>
                <div className="space-y-2 text-sm text-red-800 leading-relaxed">
                  <p><strong>SafeEats is an informational research tool only.</strong> It is not affiliated with, endorsed by, or a substitute for any government health agency or official inspection authority.</p>
                  <p><strong>Data accuracy is not guaranteed.</strong> Scores come from government open-data APIs or AI-assisted lookups of public records. Both may contain errors, omissions, or outdated entries.</p>
                  <p className="font-bold text-red-900 border-t border-red-200 pt-3">
                    Always consult your local health department for authoritative records. By using SafeEats you acknowledge data may be incomplete and you are solely responsible for decisions made based on it.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* CTA */}
          <div className="text-center pt-2">
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/Enterprise">
                <Button className="bg-slate-900 hover:bg-slate-700 text-white">
                  Explore Enterprise & API <ArrowLeft className="w-4 h-4 ml-1.5 rotate-180" />
                </Button>
              </Link>
              <Link to="/global-coverage">
                <Button variant="outline">See live data sources</Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}