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
import HolisticSection from "@/components/about/HolisticSection";
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
              Live government data sources across the US, UK, and Canada — queried directly at request time. AI-assisted research for additional jurisdictions where public records are accessible. For everywhere else, SafeEats links to the official health department portal so you can search manually. We don't call that coverage — it's a redirect, not the invention.
            </p>
          </div>

          <StoryNav />

          {/* Why */}
          <Section id="why">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Why SafeEats Exists</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Food safety data should be accessible — not buried in county portals, PDF archives, or behind paywalls. SafeEats aggregates inspection records from official health departments and presents them through a single, consistent interface with a universal A–F grading system.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Every jurisdiction grades differently — penalty points in LA, letter grades in NYC, star ratings in London, pass/fail in Chicago. SafeEats normalizes all of them to a universal 0–100 scale and A–F grade. Apples to apples, wherever we have data. For jurisdictions where no scrapable data exists, we link to the official portal — but that's a convenience, not coverage. The invention is the normalization; where there's nothing to normalize, there's no invention to claim.
            </p>
          </Section>

          <GradingSection />
          <SourcesSection />
          <TrustSection />

          {/* Beyond the Grade — Holistic Safety */}
          <HolisticSection />
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