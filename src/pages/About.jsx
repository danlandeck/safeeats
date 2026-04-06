import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { ShieldCheck, Database, TrendingUp, ArrowLeft, Heart, AlertTriangle, Globe, Search, Ban, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
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
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              Real inspection data. No third-party redirects. No angry Yelp reviews.
            </p>
          </div>

          {/* Legal Disclaimer */}
          <Card className="p-8 border-2 border-red-300 bg-red-50">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-red-900 mb-3">Important Disclaimer</h2>
                <div className="space-y-2 text-sm text-red-800 leading-relaxed">
                  <p><strong>SafeEats is an informational research tool only.</strong> It is not affiliated with, endorsed by, or a substitute for any government health agency or official inspection authority.</p>
                  <p><strong>Data accuracy is not guaranteed.</strong> Scores come from government open-data APIs (which SafeEats does not control) or AI-assisted lookups of public records. Both may contain errors, omissions, or outdated entries.</p>
                  <p><strong>AI-estimated scores carry additional uncertainty.</strong> For jurisdictions without a live government API, scores are estimated by AI reading publicly available sources. These are <em>not official government records</em> and may be incorrect or incomplete.</p>
                  <p className="font-bold text-red-900 border-t border-red-200 pt-3">
                    Always consult your local health department for authoritative inspection records. By using SafeEats you acknowledge that data may be incomplete or inaccurate, and that you are solely responsible for decisions made based on it.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Mission */}
          <Card className="p-8 border-slate-200 bg-white">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Why SafeEats Exists</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Food safety data should be accessible — not buried in county portals, PDF archives, or behind paywalls. SafeEats aggregates inspection records from official health departments worldwide and presents them through a single, consistent interface with a universal A–F grading system.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Every jurisdiction grades differently. A "Pass" in Chicago, 94 penalty points in LA, and a letter grade in NYC all mean different things. SafeEats normalizes everything to a 0–100 scale so you're always comparing apples to apples.
            </p>
          </Card>

          {/* How We Get Data */}
          <Card className="p-8 border-slate-200 bg-white">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">How We Source Data</h2>
            <p className="text-slate-500 text-sm mb-6">Two methods — live APIs where they exist, AI-assisted research everywhere else.</p>

            <div className="space-y-4 mb-8">
              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 mb-1">Live Government APIs <span className="text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full ml-2">REAL-TIME</span></p>
                  <p className="text-sm text-slate-600 leading-relaxed">For jurisdictions that publish open-data APIs — including Los Angeles, New York City, Chicago, San Francisco, King County (Seattle), Austin, and Montgomery County MD — SafeEats queries the official database directly. Data is current as of the moment you search.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 mb-1">AI-Assisted Research <span className="text-xs font-bold bg-slate-500 text-white px-2 py-0.5 rounded-full ml-2">EVERYWHERE ELSE</span></p>
                  <p className="text-sm text-slate-600 leading-relaxed">For jurisdictions without a live API, our AI reads official state/county health department websites, publicly posted inspection PDFs, and verified local news coverage of health department records. Results are clearly labeled as AI-estimated — never presented as official government data.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 mb-1">Global Coverage</p>
                  <p className="text-sm text-slate-600 leading-relaxed">SafeEats is location-agnostic. Search for a restaurant by name alone and we find it anywhere in the world. Add a city, state, or ZIP to narrow results to a specific area. The same AI-assisted research applies globally — not just the US.</p>
                </div>
              </div>
            </div>

            {/* Yelp callout */}
            <div className="bg-red-950 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Ban className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <p className="text-lg font-extrabold">We Don't Use Yelp. Not Even a Little.</p>
                    <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">BY DESIGN</span>
                  </div>
                  <p className="text-red-200 leading-relaxed text-sm mb-3">
                    Yelp is a consumer review platform. Your food safety intelligence should not be sourced from the same pool that includes one-star reviews because the parking lot was too small, five-star reviews bought by the restaurant owner, and anonymous rage-posts from someone who waited 20 minutes on a Saturday night.
                  </p>
                  <p className="text-red-100 font-semibold text-sm">
                    SafeEats is just the facts. Inspector-issued scores. Violation codes. Official records. Did the health department pass this restaurant or not?
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Score System */}
          <Card className="p-8 border-slate-200 bg-white">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">The Grading System</h2>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[
                { grade: "A", range: "90–100", color: "bg-green-600" },
                { grade: "B", range: "80–89", color: "bg-lime-500" },
                { grade: "C", range: "70–79", color: "bg-yellow-400" },
                { grade: "D", range: "60–69", color: "bg-orange-500" },
                { grade: "F", range: "< 60", color: "bg-red-600" },
              ].map(({ grade, range, color }) => (
                <div key={grade} className={`${color} rounded-xl p-3 text-center text-white`}>
                  <div className="text-2xl font-extrabold">{grade}</div>
                  <div className="text-xs font-semibold opacity-90">{range}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Raw scores from each jurisdiction (penalty points, pass/fail outcomes, letter grades) are normalized to a universal 0–100 scale. A score of 85 means different underlying criteria in Los Angeles vs. Chicago — the grade gives you a consistent at-a-glance verdict, but always review the full violation history for context.
            </p>
          </Card>

          {/* Esri */}
          <Card className="p-8 border-slate-200 bg-white">
            <div className="flex gap-5 items-start">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900">Powered by Esri GIS Technology</h2>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Map Data Partner</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm mb-3">
                  SafeEats uses Esri's diverging health-risk color scale — the same visual language used by public health agencies worldwide — to make safety risk immediately legible at a glance. Their perceptually calibrated color ramp works even for users with color vision deficiencies. We also use Esri's GeoJSON boundary datasets for geographic visualizations.
                </p>
                <a
                  href="https://www.esri.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  Learn more about Esri →
                </a>
              </div>
            </div>
          </Card>

          {/* Creator */}
          <Card className="p-8 border-slate-200 bg-white">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">About the Creator</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <p className="text-xl font-extrabold text-slate-900">Daniel Landeck</p>
                <p className="text-slate-500 text-xs mt-0.5">Seattle Metro Area · University of Washington Graduate</p>
              </div>
              <p className="leading-relaxed">
                Veteran game developer, film producer, and black belt in Okinawan Karate (Shudokan). Daniel built SafeEats as a genuine public service — transparent food safety data, free, because the public deserves better than a wall of government PDFs.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <a href="https://www.linkedin.com/in/danlandeck/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors">LinkedIn →</a>
                <a href="https://www.mobygames.com/person/277275/daniel-landeck/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors">MobyGames →</a>
                <a href="https://www.imdb.com/name/nm6015660/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors">IMDb →</a>
              </div>
            </div>
          </Card>

          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Built with <Heart className="w-4 h-4 inline text-red-500 fill-red-500" /> for food safety transparency
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}