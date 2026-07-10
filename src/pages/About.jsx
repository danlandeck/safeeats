import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Heart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/about/SectionPrimitives";
import StoryNav from "@/components/about/StoryNav";
import GradingSection from "@/components/about/GradingSection";
import SourcesSection from "@/components/about/SourcesSection";
import TrustSection from "@/components/about/TrustSection";
import ADASection from "@/components/about/ADASection";
import WaterSection from "@/components/about/WaterSection";
import ScanningSection from "@/components/about/ScanningSection";
import GlobalSpotlight from "@/components/about/GlobalSpotlight";
import EnterpriseSection from "@/components/about/EnterpriseSection";
import CreatorSection from "@/components/about/CreatorSection";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
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
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              About SafeEats
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              The World's Source of Truth<br />
              <span className="text-[#4CAF50]">for Food Safety</span>
            </h1>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
              16 live government API sources across the US, UK, Canada, Singapore, and Australia. 25 countries with structured coverage, plus AI-assisted search for the rest of the world. Real inspection data — unified, normalized, and in plain English.
            </p>
          </div>

          <StoryNav />

          {/* Why */}
          <Section id="why">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Why SafeEats Exists</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
                            Food safety data should be accessible — not buried in county portals, PDF archives, or behind paywalls. SafeEats aggregates inspection records from official health departments across 25 countries and presents them through a single, consistent interface with a universal A–F grading system.
            </p>
            <p className="text-slate-600 leading-relaxed mb-3">
              Every jurisdiction grades differently. A "Pass" in Chicago, 94 penalty points in LA, a letter grade in NYC, a score in Tokyo, a compliance rating in London — they all mean different things. SafeEats normalizes everything to a 0–100 scale so you're always comparing apples to apples, whether you're in Austin or Auckland.
            </p>
            <p className="text-slate-600 leading-relaxed">
              SafeEats brings restaurant and food establishment safety data together — for consumers, travelers, parents, and anyone who wants to make informed decisions about what goes into their body.
            </p>
          </Section>

          <GradingSection />
          <SourcesSection />
          <TrustSection />

          {/* Beyond the Grade */}
          <div id="beyond" className="scroll-mt-32 pt-2">
            <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-1">Beyond the Grade</h2>
            <p className="text-slate-500 text-sm text-center mb-6">Safety is more than a score. SafeEats surfaces the details that matter before you walk through the door.</p>
          </div>
          <ADASection />
          <WaterSection />
          <ScanningSection />
          <GlobalSpotlight />
          <EnterpriseSection />

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
                  <p><strong>AI-estimated scores carry additional uncertainty.</strong> For jurisdictions without a live government API, scores are estimated by AI reading publicly available sources — <em>not official government records</em>.</p>
                  <p className="font-bold text-red-900 border-t border-red-200 pt-3">
                    Always consult your local health department for authoritative records. By using SafeEats you acknowledge data may be incomplete and you are solely responsible for decisions made based on it.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <CreatorSection />

          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500 flex items-center justify-center gap-1.5">
              Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for food safety transparency
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}