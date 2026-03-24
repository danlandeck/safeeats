import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { ShieldCheck, Database, TrendingUp, ArrowLeft, Heart, AlertTriangle, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Home")}>
          <Button variant="ghost" className="mb-6 text-slate-500 hover:text-slate-800 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-white font-semibold mb-4">
              <ShieldCheck className="w-5 h-5" />
              About SafeEats
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Your Food Safety Companion
            </h1>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              One platform. All counties. Real inspection data — no third-party redirects.
            </p>
          </div>

          {/* Mission */}
          <Card className="p-8 border-slate-200 bg-white">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              SafeEats was built because food safety data should be accessible, legible, and consolidated. No more bouncing between county portals or decoding government inspection PDFs. We pull the most current data from each jurisdiction's official health department records and present it uniformly — so you can compare a restaurant in King County, WA the same way you'd compare one in Clark County, NV.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Our universal A–F grading system and 0–100 safety scores give you a consistent lens across all regions, even though each jurisdiction grades on its own criteria.
            </p>
          </Card>

          {/* Data Sources */}
          <Card className="p-8 border-slate-200 bg-white">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Data Sources by Region</h2>
            <p className="text-slate-500 text-sm mb-6">We source the most recent publicly available data from each jurisdiction's official health department.</p>
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Washington State</h3>
                <div className="space-y-3">
                  {[
                    { county: "King County", source: "King County Public Health Open Data Portal", url: "https://data.kingcounty.gov", note: "Live API — real-time records updated with every new inspection." },
                    { county: "Snohomish County", source: "Snohomish County Health Services", url: "https://snohomishonline.envisionconnect.com", note: "AI-assisted lookup sourced from official public health records." },
                    { county: "Pierce County", source: "Tacoma-Pierce County Health Dept (TPCHD)", url: "https://aca-prod.accela.com/TPCHD", note: "AI-assisted lookup sourced from official public health records." },
                    { county: "Thurston County", source: "Thurston County Environmental Health", url: "https://www.co.thurston.wa.us", note: "AI-assisted lookup sourced from official public health records." },
                    { county: "Kitsap County", source: "Kitsap Public Health District", url: "https://www.kitsappublichealth.org", note: "AI-assisted lookup sourced from official public health records." },
                  ].map((row) => (
                    <div key={row.county} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-800">{row.county}</p>
                          <p className="text-sm text-slate-500">{row.source}</p>
                          <p className="text-xs text-slate-400 mt-1">{row.note}</p>
                        </div>
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2">
                          Official Site →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Nevada</h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-800">Clark County (Las Vegas Metro)</p>
                      <p className="text-sm text-slate-500">Southern Nevada Health District (SNHD)</p>
                      <p className="text-xs text-slate-400 mt-1">AI-assisted lookup sourced from official SNHD public health records. Covers Las Vegas, Henderson, North Las Vegas, Enterprise, and all incorporated Clark County municipalities.</p>
                    </div>
                    <a href="https://www.southernnevadahealthdistrict.org" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2">
                      Official Site →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 border-slate-200">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Live + AI-Assisted Data</h3>
              <p className="text-sm text-slate-600">
                King County uses a live API. All other regions use AI-assisted lookups pulling from official health department records — same UI, no third-party redirects.
              </p>
            </Card>

            <Card className="p-6 border-slate-200">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Universal A–F Grading</h3>
              <p className="text-sm text-slate-600">
                Because each county uses different criteria, we normalize all scores to a universal 0–100 scale and A–F letter grade, so comparisons are always apples-to-apples.
              </p>
            </Card>

            <Card className="p-6 border-slate-200">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Full History</h3>
              <p className="text-sm text-slate-600">
                We display the complete inspection history for each establishment — not just the latest result — with violation breakdowns, trends, and charts.
              </p>
            </Card>
          </div>

          {/* Score caveat */}
          <Card className="p-6 border-amber-200 bg-amber-50">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-2">A Note on Score Fluctuation</h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Every jurisdiction grades restaurants on different criteria — point systems, letter grades, pass/fail — and inspectors evaluate different risk factors. SafeEats normalizes these into a universal score, but because the underlying grading philosophies differ, scores may fluctuate between counties and over time. A score of 85 in King County may reflect different standards than an 85 in Clark County. Always consider the full inspection history and violation details when making dining decisions.
                </p>
              </div>
            </div>
          </Card>

          {/* How It Works */}
          <Card className="p-8 border-slate-200 bg-slate-50">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How We Calculate Safety Scores</h2>
            <div className="space-y-3 text-slate-600">
              <p className="leading-relaxed">
                <strong className="text-slate-900">1. Data Pull:</strong> We fetch the most current data from each city/county health department — live API for King County, AI-assisted lookup from official public records for all other jurisdictions.
              </p>
              <p className="leading-relaxed">
                <strong className="text-slate-900">2. Normalization:</strong> Each region's raw scores (penalty points, pass/fail, letter grades) are converted to a unified 0–100 scale.
              </p>
              <p className="leading-relaxed">
                <strong className="text-slate-900">3. Letter Grade:</strong> A (90–100), B (80–89), C (70–79), D (60–69), F (below 60) — giving you an instant at-a-glance verdict.
              </p>
              <p className="leading-relaxed">
                <strong className="text-slate-900">4. Full History:</strong> We display every inspection on record — not just the most recent — with charts showing safety trends over time.
              </p>
            </div>
          </Card>

          {/* Creator Info */}
          <Card className="p-6 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">About the Creator</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">Created by Danny Landeck</strong>
              </p>
              <p>Seattle Metro Area · University of Washington Graduate</p>
              <a
                href="https://www.linkedin.com/in/danlandeck/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold transition-colors"
              >
                Connect on LinkedIn →
              </a>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Built with <Heart className="w-4 h-4 inline text-red-500 fill-red-500" /> for food safety transparency
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}