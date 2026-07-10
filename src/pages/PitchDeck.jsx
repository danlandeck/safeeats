import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShieldCheck, TrendingUp, Scale, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import PitchMetrics from "@/components/pitch/PitchMetrics";
import CoverageSummary from "@/components/pitch/CoverageSummary";
import MethodologySummary from "@/components/pitch/MethodologySummary";
import ScalabilitySummary from "@/components/pitch/ScalabilitySummary";

export default function PitchDeck() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Back */}
        <Button variant="ghost" asChild className="mb-8 text-slate-500 hover:text-slate-800 -ml-2 group">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
        </Button>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-white font-semibold mb-5 shadow-lg">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Acquisition Summary
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            The Global Standard for<br />
            <span className="text-[#4CAF50]">Food Safety Data</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            SafeEats unifies government inspection records from 16 live API sources and 25 countries
            into a single, normalized, commercially scalable dataset. Here's what makes it defensible.
          </p>
        </div>

        {/* Key metrics */}
        <div className="mb-12">
          <PitchMetrics />
        </div>

        {/* Section 1: Coverage */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Global Data Coverage
              </h2>
              <p className="text-sm text-slate-500">Three-tier strategy across live APIs and AI-assisted markets</p>
            </div>
          </div>
          <CoverageSummary />
        </section>

        {/* Section 2: Methodology */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Inspection Grade Methodology
              </h2>
              <p className="text-sm text-slate-500">One universal A–F scale, auditable from source to score</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <MethodologySummary />
          </div>
        </section>

        {/* Section 3: Scalability */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Scalability of Restaurant Discovery
              </h2>
              <p className="text-sm text-slate-500">Architecture designed to scale from 16 sources to global coverage</p>
            </div>
          </div>
          <ScalabilitySummary />
        </section>

        {/* Closing CTA */}
        <div className="bg-slate-900 rounded-2xl p-8 text-center shadow-lg">
          <Server className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-white mb-2">A defensible, scalable data asset</h2>
          <p className="text-slate-300 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            16 live government API connectors. A proven normalization framework. Structured coverage
            across 25 countries. All shipped, all tested, all ready to scale.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/contact">
              <Button className="bg-[#4CAF50] hover:bg-[#43A047] text-white">
                Open a conversation <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/About">
              <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-800">
                Full documentation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}