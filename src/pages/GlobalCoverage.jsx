import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Database, Globe, Search, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Confirmed open food safety data sources — verified via research
const LIVE_MARKETS = [
  {
    region: "🇺🇸 United States",
    color: "border-blue-200 bg-blue-50",
    pill: "bg-blue-600 text-white",
    sources: [
      { city: "New York City, NY", note: "NYC DOHMH — letter grades A/B/C, full violation history", url: "https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j" },
      { city: "Los Angeles County, CA", note: "LA County DPH — penalty point scores, letter grades", url: "http://ehservices.publichealth.lacounty.gov/" },
      { city: "San Francisco, CA", note: "SF DPH EHS — scored inspections 0–100", url: "https://data.sfgov.org/Health-and-Social-Services/Restaurant-Scores-LIVES-Standard/pyih-qa8i" },
      { city: "Chicago / Cook County, IL", note: "Chicago CDPH — pass/fail + violation codes, open API", url: "https://data.cityofchicago.org/Health-Human-Services/Food-Inspections/4dn6-by35" },
      { city: "King County, WA (Seattle)", note: "KCHD — scored inspections with full violation detail", url: "https://kingcounty.gov/depts/health/environmental-health/food-safety.aspx" },
      { city: "Austin / Travis County, TX", note: "Austin Public Health — inspection results + scores", url: "https://data.austintexas.gov/Health-and-Community-Services/Food-Establishment-Inspection-Scores/ecmv-9xxi" },
      { city: "Montgomery County, MD", note: "MCDH — full inspection records, open dataset", url: "https://data.montgomerycountymd.gov/Health-and-Human-Services/Food-Inspections/9tm3-jscp" },
      { city: "Philadelphia, PA", note: "Philadelphia DPH — inspection results open data", url: "https://data.phila.gov/visualizations/food-inspections" },
      { city: "Denver, CO", note: "Denver Community Planning — restaurant inspection scores", url: "https://www.denvergov.org/opendata" },
      { city: "Dallas County, TX", note: "Dallas County Health — food establishment inspections", url: "https://www.dallascounty.org/departments/dchhs/environmental-health.php" },
      { city: "Miami-Dade County, FL", note: "Miami-Dade — public food safety inspection data", url: "https://opendata.miamidade.gov/" },
      { city: "Las Vegas / Clark County, NV", note: "SNHD — inspection records publicly searchable", url: "https://www.southernnevadahealthdistrict.org/permits-and-licenses/food-safety/restaurant-inspection-information/" },
    ]
  },
  {
    region: "🇬🇧 United Kingdom",
    color: "border-red-200 bg-red-50",
    pill: "bg-red-700 text-white",
    sources: [
      { city: "England, Wales & Northern Ireland", note: "Food Standards Agency — FHRS 0–5 star ratings via free public API, updated daily. Every food establishment, every local authority.", url: "https://ratings.food.gov.uk/open-data" },
      { city: "Scotland", note: "FSA Food Hygiene Information Scheme (FHIS) — Pass/Improvement Required ratings, public API", url: "https://ratings.food.gov.uk/open-data" },
      { city: "London", note: "All 33 London boroughs covered under FSA FHRS. One of the most complete urban food safety datasets in the world.", url: "https://www.food.gov.uk/uk-food-hygiene-rating-data-api" },
    ]
  },
  {
    region: "🇦🇪 UAE & Middle East",
    color: "border-green-200 bg-green-50",
    pill: "bg-green-700 text-white",
    sources: [
      { city: "Dubai", note: "Dubai Municipality via Dubai Pulse open data API — real-time food establishment inspection data, compliance ratings. One of the most advanced municipal food safety platforms globally.", url: "https://www.dubaipulse.gov.ae/" },
      { city: "Abu Dhabi", note: "Abu Dhabi Agriculture and Food Safety Authority (ADAFSA) — inspection and compliance data", url: "https://www.adafsa.gov.ae/" },
      { city: "All UAE Emirates", note: "UAE federal food safety oversight via UAE Food Safety Department — cross-emirate inspection framework", url: "https://u.ae/en/information-and-services/health-and-fitness/food-safety-and-health-tips" },
    ]
  },
  {
    region: "🇨🇦 Canada",
    color: "border-red-200 bg-red-50",
    pill: "bg-red-600 text-white",
    sources: [
      { city: "Toronto, Ontario", note: "Toronto Public Health DineSafe — full open data API with Pass/Conditional/Closed inspection results for every food establishment in the city", url: "https://open.toronto.ca/dataset/dinesafe/" },
      { city: "Vancouver, BC", note: "Vancouver Coastal Health — restaurant inspection data publicly available", url: "https://opendata.vancouver.ca/" },
      { city: "Ottawa, Ontario", note: "Ottawa Public Health — food premise inspection reports publicly searchable", url: "https://www.ottawapublichealth.ca/" },
      { city: "Calgary, Alberta", note: "Calgary Environmental Health — food establishment inspection results open data", url: "https://data.calgary.ca/" },
    ]
  },
  {
    region: "🇦🇺 Australia & New Zealand",
    color: "border-yellow-200 bg-yellow-50",
    pill: "bg-yellow-600 text-white",
    sources: [
      { city: "NSW — Scores on Doors", note: "NSW Food Authority — public hygiene rating system for restaurants, takeaways, bakeries, cafés. Displayed as 1–5 stars.", url: "https://www.foodauthority.nsw.gov.au/retail/scoresondoors" },
      { city: "South Australia", note: "SA Health Food Safety Rating Scheme — public compliance ratings for food businesses", url: "https://www.sahealth.sa.gov.au/" },
      { city: "New Zealand", note: "NZ Ministry for Primary Industries — food safety compliance publicly tracked nationwide", url: "https://www.mpi.govt.nz/food-business/" },
    ]
  },
  {
    region: "🇩🇰 Denmark",
    color: "border-slate-200 bg-slate-50",
    pill: "bg-slate-700 text-white",
    sources: [
      { city: "All of Denmark — Smiley Scheme", note: "Danish Veterinary and Food Administration — findsmiley.dk publishes inspection results for EVERY food establishment in Denmark. Smiley ratings (☺ ☹) displayed at premises by law since 2001. One of the oldest and most comprehensive open systems in the world.", url: "https://findsmiley.dk/English/Pages/FrontPage.aspx" },
    ]
  },
  {
    region: "🇸🇬 Singapore",
    color: "border-red-200 bg-red-50",
    pill: "bg-red-600 text-white",
    sources: [
      { city: "Singapore", note: "Singapore Food Agency (SFA) — SAFE (Safety Assurance for Food Establishments) grading system. Grades A/B/C/D publicly searchable. QR codes on every licensed establishment. Data published on data.gov.sg.", url: "https://www.sfa.gov.sg/tools-and-resources" },
    ]
  },
  {
    region: "🇰🇷 South Korea",
    color: "border-blue-200 bg-blue-50",
    pill: "bg-blue-700 text-white",
    sources: [
      { city: "Seoul & Nationwide", note: "Seoul Open Data Plaza — food sanitation business data publicly open since 2013. Ministry of Food and Drug Safety (MFDS) — national hygiene rating and inspection records at data.go.kr", url: "https://data.seoul.go.kr/" },
    ]
  },
  {
    region: "🇪🇺 European Union",
    color: "border-blue-200 bg-indigo-50",
    pill: "bg-indigo-600 text-white",
    sources: [
      { city: "EU-wide — RASFF", note: "EU Rapid Alert System for Food and Feed — real-time food safety alerts across all 27 member states + Norway, Iceland, Liechtenstein. Public API available.", url: "https://food.ec.europa.eu/safety/rasff-food-and-feed-safety-alerts_en" },
      { city: "Netherlands", note: "Dutch NVWA (Netherlands Food and Consumer Product Safety Authority) — inspection results published publicly", url: "https://www.nvwa.nl/" },
      { city: "Ireland", note: "FSAI (Food Safety Authority of Ireland) — enforcement orders and closure notices publicly published", url: "https://www.fsai.ie/enforcement-and-legislation/enforcement/food-business-compliance/" },
    ]
  },
];

const COMING_SOON = [
  { city: "Japan (Tokyo)", note: "Tokyo Metropolitan Government tracks food sanitation compliance, but no public API or downloadable dataset exists. Results are AI-estimated from official sources only." },
  { city: "France", note: "Alim'confiance — a live, public national food safety rating system (every establishment's last 3 inspections). The data is available; SafeEats has not yet built a dedicated API connector." },
  { city: "Germany", note: "No nationwide hygiene rating system. Some cities (Berlin) run local 'Hygiene-Ampel' pilot programs, but data is not standardized or publicly downloadable." },
  { city: "Brazil (São Paulo)", note: "ANVISA oversees national food safety regulation but does not publish per-establishment inspection scores as open data. Municipal-level data is partial." },
  { city: "India (Mumbai, Delhi)", note: "FSSAI maintains a national licensing database — it tracks whether a business holds a valid license, not inspection results or hygiene scores. No inspection dataset is publicly available." },
  { city: "Hong Kong", note: "FEHD publishes inspection results for licensed food premises on a searchable website, but no structured API or bulk download is offered. Results are AI-estimated." },
];

export default function GlobalCoverage() {
  const [expanded, setExpanded] = useState(null);
  const totalSources = LIVE_MARKETS.reduce((acc, m) => acc + m.sources.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link to="/">
          <Button variant="ghost" className="mb-8 text-slate-500 hover:text-slate-800 -ml-2 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Button>
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-white font-semibold mb-5 shadow-lg">
            <Globe className="w-5 h-5 text-emerald-400" />
            Global Open Data Coverage
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Every Market Where<br />
            <span className="text-[#4CAF50]">Real Data Exists</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Governments worldwide publish food safety inspection records as open data. SafeEats integrates every single one. Here's every confirmed live market — and why each matters.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-slate-900">{LIVE_MARKETS.length}</p>
              <p className="text-xs text-slate-500 font-semibold">Confirmed data regions</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-[#4CAF50]">{totalSources}+</p>
              <p className="text-xs text-slate-500 font-semibold">Confirmed data sources</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-slate-900">180+</p>
              <p className="text-xs text-slate-500 font-semibold">Countries via AI search</p>
            </div>
          </div>
        </div>

        {/* Key insight banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8">
          <div className="flex gap-4 items-start">
            <Database className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-base mb-1">Why Open Data Matters</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Every jurisdiction below has independently decided that food safety is a <em>public right to know</em> — not a government secret. SafeEats is the only platform that unifies all of these into a single, normalized, globally comparable system. A restaurant in Dubai, a pub in London, a ramen shop in Seoul, and a taco truck in Austin all receive the same A–F grade scale. Apples to apples. Everywhere.
              </p>
            </div>
          </div>
        </div>

        {/* Live markets */}
        <div className="space-y-4 mb-10">
          {LIVE_MARKETS.map((market, idx) => {
            const isOpen = expanded === idx;
            return (
              <div key={idx} className={`rounded-2xl border-2 overflow-hidden ${market.color}`}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:opacity-80 transition-opacity"
                  onClick={() => setExpanded(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-extrabold text-slate-900">{market.region}</h2>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${market.pill}`}>
                      {market.sources.length} SOURCE{market.sources.length !== 1 ? "S" : ""}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-3">
                    {market.sources.map((src, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-extrabold text-slate-900 text-sm">{src.city}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{src.note}</p>
                          </div>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline flex-shrink-0 mt-0.5"
                          >
                            Source <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Coming soon */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-extrabold text-slate-900">On the Radar — In Active Development</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">These markets have food safety data that is partially public or becoming available. SafeEats is actively integrating these.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMING_SOON.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-100 p-3 shadow-sm">
                <p className="font-bold text-slate-800 text-xs">{item.city}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI coverage note */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6">
          <h2 className="font-extrabold text-base mb-2">🌍 Everywhere Else — AI-Powered</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            For the remaining 180+ countries where live government APIs don't yet exist, SafeEats uses AI to read official health department websites, publicly posted inspection PDFs, local health bulletins, and verified sources — and presents those results clearly labeled as AI-estimated. Preliminary restaurant identification is powered by Anthropic's Claude Opus for maximum accuracy, with live web search via Gemini pulling real-time data from official sources. We never fabricate a score. If we can't verify it, we say so.
          </p>
        </div>

        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Link to="/About">
              <Button variant="outline">The Full Story</Button>
            </Link>
            <Link to="/About">
              <Button variant="outline">Read About SafeEats</Button>
            </Link>
          </div>
          <Link to="/">
            <Button className="bg-[#4CAF50] hover:bg-[#43A047] text-white">Search a Restaurant →</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}