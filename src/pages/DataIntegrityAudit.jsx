import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ShieldCheck, Database, RefreshCw, Droplets, Accessibility,
  AlertTriangle, CheckCircle2, Clock, ExternalLink, TrendingUp,
  Eye, FileBarChart, Loader2, BadgeCheck, XCircle
} from "lucide-react";

const FRESHNESS_STYLES = {
  fresh: { label: "Fresh", color: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500" },
  stale: { label: "Aging", color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  very_stale: { label: "Stale", color: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" },
  no_data: { label: "No data", color: "text-slate-500 bg-slate-50 border-slate-200", dot: "bg-slate-400" },
};

const TYPE_STYLES = {
  live_api: { label: "Live API", color: "text-teal-700 bg-teal-50 border-teal-200", icon: Database },
  ai_enhanced: { label: "AI-Enhanced", color: "text-indigo-700 bg-indigo-50 border-indigo-200", icon: Eye },
  llm_fallback: { label: "AI Fallback", color: "text-purple-700 bg-purple-50 border-purple-200", icon: AlertTriangle },
};

function StatCard({ icon: Icon, label, value, sublabel, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color || "bg-slate-100"}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-authority-navy font-heading">{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
    </div>
  );
}

export default function DataIntegrityAudit() {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const runAudit = async () => {
      try {
        setLoading(true);
        const res = await base44.functions.invoke("runDataIntegrityAudit", {});
        setAudit(res.data);
      } catch (err) {
        setError(err.message || "Failed to run audit");
      } finally {
        setLoading(false);
      }
    };
    runAudit();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-authority-teal animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600">Running live data integrity audit…</p>
          <p className="text-xs text-slate-400 mt-1">Checking every municipality against the database.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-700 mb-1">Audit could not be completed</p>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const s = audit?.summary || {};
  const sources = audit?.source_reports || [];
  const inactive = audit?.inactive_sources || [];
  const water = audit?.water_quality || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-12 sm:py-16 px-4 border-b-4 border-authority-teal">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-authority-teal/20 border border-authority-teal/40 rounded-full px-4 py-1.5 mb-6">
            <FileBarChart className="w-4 h-4 text-authority-teal" />
            <span className="text-sm font-bold text-teal-300">Data Integrity Audit</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 font-heading">
            Radically transparent. Auditably honest.
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            This page runs a live audit of every data source in SafeEats™ — every municipality,
            every cached record, every water system. No cherry-picking. No hiding the gaps.
            This is what "the most ethical food safety platform on earth" looks like in practice.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Audit run: {new Date(audit?.audit_timestamp).toLocaleString()}</span>
            <span className="mx-1">•</span>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Runs live on page load</span>
          </div>
        </div>
      </section>

      {/* Summary stats */}
      <section className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Database} label="Restaurants" value={s.total_restaurants ?? 0} sublabel="cached records audited" color="bg-authority-teal" />
            <StatCard icon={CheckCircle2} label="Live API sources" value={s.live_api_sources ?? 0} sublabel={`of ${s.active_sources ?? 0} active`} color="bg-brand-green" />
            <StatCard icon={Droplets} label="Water systems" value={s.total_water_systems ?? 0} sublabel="EPA SDWIS tracked" color="bg-blue-500" />
            <StatCard icon={Accessibility} label="ADA coverage" value={`${s.ada_coverage_percentage ?? 0}%`} sublabel="of records with status" color="bg-authority-gold" />
          </div>

          {/* Honesty metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <StatCard icon={TrendingUp} label="New vs last audit" value={s.new_records_vs_last ?? 0} sublabel="records added" color="bg-emerald-600" />
            <StatCard icon={Eye} label="AI-generated" value={`${s.llm_percentage ?? 0}%`} sublabel={`${s.total_llm_records ?? 0} records`} color="bg-purple-500" />
            <StatCard icon={Clock} label="Stale records" value={s.stale_record_count ?? 0} sublabel=">365 days old" color="bg-red-500" />
            <StatCard icon={AlertTriangle} label="AI-fallback sources" value={s.ai_fallback_sources ?? 0} sublabel="not live API" color="bg-indigo-500" />
          </div>
        </div>
      </section>

      {/* Transparency commitments */}
      {audit?.transparency_notes && (
        <section className="px-4 pb-6">
          <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-authority-teal" />
              <h2 className="text-base font-extrabold font-heading">Our transparency commitments</h2>
            </div>
            <ul className="space-y-2">
              {audit.transparency_notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-authority-teal flex-shrink-0 mt-0.5" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Per-source audit table */}
      <section className="py-10 px-4 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-authority-navy mb-1 font-heading">Per-source audit</h2>
            <p className="text-sm text-slate-500">
              Every data source, its record count, freshness, and AI-fallback percentage. No spin.
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="py-3 pr-3 font-bold">Source</th>
                  <th className="py-3 px-3 font-bold text-center">Type</th>
                  <th className="py-3 px-3 font-bold text-center">Records</th>
                  <th className="py-3 px-3 font-bold text-center">Freshness</th>
                  <th className="py-3 px-3 font-bold text-center">AI %</th>
                  <th className="py-3 px-3 font-bold text-center">Avg score</th>
                  <th className="py-3 pl-3 font-bold text-center">ADA %</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((src) => {
                  const fr = FRESHNESS_STYLES[src.freshness_status] || FRESHNESS_STYLES.no_data;
                  const ty = TYPE_STYLES[src.data_type] || TYPE_STYLES.llm_fallback;
                  const TyIcon = ty.icon;
                  return (
                    <tr key={src.source_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-slate-800 text-xs">{src.source_name}</div>
                        {src.portal_url && (
                          <a href={src.portal_url} target="_blank" rel="noopener noreferrer"
                             className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline mt-0.5">
                            Official portal <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ty.color}`}>
                          <TyIcon className="w-2.5 h-2.5" /> {ty.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-slate-700">{src.record_count}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${fr.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${fr.dot}`} /> {fr.label}
                        </span>
                        {src.days_since_latest !== null && (
                          <span className="block text-[9px] text-slate-400 mt-0.5">{src.days_since_latest}d ago</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold text-xs ${src.llm_percentage > 0 ? "text-purple-600" : "text-slate-400"}`}>
                          {src.llm_percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {src.avg_safety_score !== null ? src.avg_safety_score : "—"}
                      </td>
                      <td className="py-3 pl-3 text-center font-bold text-slate-700">
                        {src.ada_coverage_percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sources.map((src) => {
              const fr = FRESHNESS_STYLES[src.freshness_status] || FRESHNESS_STYLES.no_data;
              const ty = TYPE_STYLES[src.data_type] || TYPE_STYLES.llm_fallback;
              const TyIcon = ty.icon;
              return (
                <div key={src.source_id} className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{src.source_name}</p>
                      {src.portal_url && (
                        <a href={src.portal_url} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline mt-0.5">
                          Portal <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${ty.color} flex-shrink-0`}>
                      <TyIcon className="w-2.5 h-2.5" /> {ty.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-extrabold text-slate-700">{src.record_count}</p>
                      <p className="text-[9px] text-slate-400">Records</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-700">{src.avg_safety_score ?? "—"}</p>
                      <p className="text-[9px] text-slate-400">Avg score</p>
                    </div>
                    <div>
                      <p className={`text-lg font-extrabold ${src.llm_percentage > 0 ? "text-purple-600" : "text-slate-400"}`}>{src.llm_percentage}%</p>
                      <p className="text-[9px] text-slate-400">AI %</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${fr.color}`}>
                        <span className={`w-1 h-1 rounded-full ${fr.dot}`} /> {fr.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inactive sources */}
          {inactive.length > 0 && (
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> {inactive.length} registered sources with zero cached records
              </p>
              <div className="flex flex-wrap gap-1.5">
                {inactive.map((src) => (
                  <span key={src.source_id} className="text-[10px] text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                    {src.source_name}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                These sources have live APIs or AI connectors registered but haven't been queried recently.
                They activate the moment a user searches a restaurant in that jurisdiction.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Water quality coverage */}
      <section className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="w-5 h-5 text-blue-500" />
            <h2 className="text-2xl font-black text-authority-navy font-heading">Water quality coverage</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            EPA Safe Drinking Water Information System data — contaminants, violations, and health-based grades.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Droplets} label="Systems tracked" value={water.total_systems ?? 0} sublabel="community water systems" color="bg-blue-500" />
            <StatCard icon={CheckCircle2} label="States covered" value={(water.states_covered || []).length} sublabel={(water.states_covered || []).join(", ")} color="bg-cyan-600" />
            <StatCard icon={AlertTriangle} label="Total violations" value={water.total_violations ?? 0} sublabel="last 10 years" color="bg-amber-500" />
            <StatCard icon={AlertTriangle} label="Above guideline" value={water.systems_above_guideline ?? 0} sublabel="systems w/ contaminants" color="bg-red-500" />
          </div>
        </div>
      </section>

      {/* Ethics & methodology */}
      <section className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <BadgeCheck className="w-6 h-6 text-authority-teal" />
            <h2 className="text-2xl font-black font-heading">Why this matters</h2>
          </div>
          <p className="text-slate-300 leading-relaxed mb-4 text-sm">
            Every metric on this page was computed live from the SafeEats™ database at the moment you loaded
            this page. Nothing is hardcoded. Nothing is aspirational. If a source has zero records, we show
            zero. If a record is AI-generated, we flag it. If data is stale, we tell you.
          </p>
          <p className="text-slate-300 leading-relaxed mb-6 text-sm">
            This is the difference between a platform that <em>claims</em> transparency and one that
            <em> practices</em> it. Copycats register a domain the day after press coverage and scrape
            whatever they can find. SafeEats™ built original API connectors to government databases,
            documents every normalization rule, and publishes a live audit so you can verify it yourself.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/fact-detective" className="inline-flex items-center gap-2 bg-authority-teal hover:bg-authority-teal/90 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              <Eye className="w-4 h-4" /> How we verify
            </Link>
            <Link to="/global-coverage" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              <Database className="w-4 h-4" /> Full source list
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}