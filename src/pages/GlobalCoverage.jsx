import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Database, Globe, Search, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Confirmed LIVE API markets — each has a working, tested API connector in SafeEats.
const LIVE_MARKETS = [
  {
    region: "🇺🇸 United States",
    color: "border-blue-200 bg-blue-50",
    pill: "bg-blue-600 text-white",
    sources: [
      { city: "New York City, NY", note: "NYC DOHMH — Socrata open API. Letter grades A/B/C, full violation history. Tested & confirmed live.", url: "https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j" },
      { city: "New York State (statewide)", note: "NY State Health Data — Socrata API covering all NY state counties outside NYC.", url: "https://health.data.ny.gov/Restaurant-Inspections-Statewide/cnih-y5dw" },
      { city: "San Francisco, CA", note: "SF DPH — Socrata LIVES-standard API. Scored inspections 0–100.", url: "https://data.sfgov.org/Health-and-Social-Services/Restaurant-Scores-LIVES-Standard/pyih-qa8i" },
      { city: "Chicago / Cook County, IL", note: "Chicago CDPH — Socrata open API. Pass/fail + violation codes.", url: "https://data.cityofchicago.org/Health-Human-Services/Food-Inspections/4dn6-by35" },
      { city: "King County, WA (Seattle)", note: "KCHD — Socrata API. Scored inspections with full violation detail.", url: "https://data.kingcounty.gov/Health/Restaurant-inspection/f29f-zza5" },
      { city: "Austin / Travis County, TX", note: "Austin Public Health — Socrata API. Inspection results + scores.", url: "https://data.austintexas.gov/Health-and-Community-Services/Food-Establishment-Inspection-Scores/ecmv-9xxi" },
      { city: "Montgomery County, MD", note: "MCDH — Socrata API. Full inspection records, open dataset.", url: "https://data.montgomerycountymd.gov/Health-and-Human-Services/Food-Inspections/9tm3-jscp" },
      { city: "Delaware (statewide)", note: "Delaware Open Data — Socrata API. Statewide restaurant inspections.", url: "https://data.delaware.gov/Health-and-Social-Services/Restaurant-Inspections/384s-wygj" },
      { city: "Boston, MA", note: "Boston City data — CKAN API. Full inspection records with violation descriptions. Tested & confirmed live.", url: "https://data.boston.gov/" },
      { city: "Houston, TX", note: "Houston Health Dept — CKAN API. Food establishment inspection data.", url: "https://www.houstontx.gov/health/" },
      { city: "Los Angeles County, CA", note: "LA County DPH — ArcGIS Feature Service API. Restaurant inspection scores.", url: "https://ehservices.publichealth.lacounty.gov/" },
      { city: "Stanislaus County, CA", note: "Stanislaus County EHS — scraped public portal with backend processor.", url: "https://schsa.info/" },
    ]
  },
  {
    region: "🇬🇧 United Kingdom",
    color: "border-red-200 bg-red-50",
    pill: "bg-red-700 text-white",
    sources: [
      { city: "England, Wales & Northern Ireland", note: "Food Standards Agency — FHRS 0–5 star ratings via free public API, updated daily. Every food establishment, every local authority. Tested & confirmed live.", url: "https://ratings.food.gov.uk/open-data" },
      { city: "Scotland", note: "FSA Food Hygiene Information Scheme (FHIS) — Pass/Improvement Required ratings. Same FSA API.", url: "https://ratings.food.gov.uk/open-data" },
      { city: "London (all 33 boroughs)", note: "Fully covered under FSA FHRS. One of the most complete urban food safety datasets in the world.", url: "https://www.food.gov.uk/uk-food-hygiene-rating-data-api" },
    ]
  },
  {
    region: "🇨🇦 Canada",
    color: "border-red-200 bg-red-50",
    pill: "bg-red-600 text-white",
    sources: [
      { city: "Toronto, Ontario", note: "Toronto Public Health DineSafe — full open data CKAN API with Pass/Conditional/Closed inspection results. Tested & confirmed live.", url: "https://open.toronto.ca/dataset/dinesafe/" },
      { city: "Vancouver, BC", note: "Vancouver Coastal Health — public disclosure portal API (inspections.vch.ca). Covers Vancouver, Richmond, North Shore, Sea-to-Sky. Full inspection history with critical/non-critical infraction counts. Tested & confirmed live.", url: "https://inspections.vch.ca/" },
    ]
  },
];

// Markets where food safety data EXISTS but SafeEats uses AI web search (Gemini 3 Flash)
// rather than a direct API connector. Results are clearly labeled as AI-estimated.
const AI_ENHANCED_MARKETS = [
  { city: "Singapore", note: "SFA's SAFE grading system (A/B/C/D) launched January 2026. Grades are publicly searchable on sfa.gov.sg but no per-establishment API is published on data.gov.sg. SafeEats uses AI to read official SFA sources." },
  { city: "Sydney / NSW, Australia", note: "NSW 'Scores on Doors' program (1–5 stars) is real but run by individual councils — no centralized API exists. data.nsw.gov.au only publishes aggregate offence counts. SafeEats uses AI to estimate from official sources." },
  { city: "Dubai, UAE", note: "Dubai Municipality's Dubai Pulse platform exists, but SafeEats currently uses AI web search to read official inspection data rather than a direct API connector." },
  { city: "Denmark (nationwide)", note: "Danish Smiley Scheme (findsmiley.dk) publishes results for every food establishment. No structured API connector built yet — AI reads the public database." },
  { city: "Seoul / South Korea", note: "Seoul Open Data Plaza and MFDS publish food sanitation data. No API connector built yet — AI reads official sources." },
  { city: "EU-wide (RASFF)", note: "EU Rapid Alert System for Food and Feed publishes real-time alerts. Not per-establishment inspection data — SafeEats uses AI for country-specific estimates." },
  { city: "Philadelphia, PA", note: "Philadelphia DPH publishes inspection results, but no Socrata/CKAN API is registered in SafeEats. AI reads official data with location-specific processing." },
];

const AI_RESEARCH_MARKETS = [
  { city: "Japan (Tokyo)", note: "Tokyo Metropolitan Government tracks food sanitation compliance via local 保健所 (health centers). No public API — SafeEats uses AI to read official Japanese health inspection records." },
  { city: "France (Alim'confiance)", note: "A live public national food safety rating system (alim-confiance.gouv.fr) with 4-tier results. No API connector — AI reads the official DGCCRF database." },
  { city: "Germany", note: "No nationwide hygiene rating system. Local Lebensmittelüberwachung offices publish some results. AI reads verbraucherportal.de and state health authority records." },
  { city: "Brazil (São Paulo)", note: "ANVISA oversees national regulation; VISA São Paulo publishes inspection records. No per-establishment API — AI reads Vigilância Sanitária records." },
  { city: "India (Mumbai, Delhi)", note: "FSSAI maintains a national licensing database (fssai.gov.in). AI reads FSSAI registration data and municipal corporation food safety records." },
  { city: "Hong Kong", note: "FEHD publishes inspection results for licensed food premises (fehd.gov.hk). No structured API — AI reads official FEHD records." },
  { city: "Denver, CO", note: "Denver publishes restaurant inspection scores publicly. No API registered — AI reads official Denver Environmental Health records." },
  { city: "Dallas County, TX", note: "Dallas County Health publishes food establishment inspections. No API registered — AI reads official county health records." },
  { city: "Miami-Dade County, FL", note: "Miami-Dade publishes public food safety inspection data. No API registered — AI reads official county health records." },
  { city: "Las Vegas / Clark County, NV", note: "SNHD publishes searchable inspection records. No API registered — AI reads official Southern Nevada Health District records." },
  { city: "Ottawa, Ontario", note: "Ottawa Public Health publishes food premise inspection reports. No API registered — AI reads official Ottawa Public Health records." },
  { city: "Calgary, Alberta", note: "Calgary Environmental Health (Alberta Health Services) publishes inspection results. No API — AI reads official AHS records." },
  { city: "South Australia", note: "SA Health Food Safety Rating Scheme exists. No centralized API — AI reads official SA Health and council records." },
  { city: "New Zealand", note: "NZ MPI tracks food safety compliance nationwide. No per-establishment API — AI reads official council FoodSafe verification records." },
  { city: "Abu Dhabi, UAE", note: "ADAFSA publishes inspection and compliance data. No API connector — AI reads official Abu Dhabi Agriculture & Food Safety Authority records." },
  { city: "Netherlands", note: "NVWA publishes inspection results (inspectieresultaten.nl). No API connector — AI reads official NVWA records." },
  { city: "Ireland", note: "FSAI publishes enforcement orders and closure notices (fsai.ie). No per-establishment API — AI reads official Food Safety Authority of Ireland records." },
];

export default function GlobalCoverage() {
  const [expanded, setExpanded] = useState(null);
  const totalSources = LIVE_MARKETS.reduce((acc, m) => acc + m.sources.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Button variant="ghost" asChild className="mb-8 text-slate-500 hover:text-slate-800 -ml-2 group">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
        </Button>

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
            Governments worldwide publish food safety inspection records as open data. SafeEats integrates every single one with a live API connector. For markets without public APIs, we use AI to read official sources — clearly labeled as AI-estimated. We never fabricate a score.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-slate-900">{LIVE_MARKETS.length}</p>
              <p className="text-xs text-slate-500 font-semibold">Live API regions</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-[#4CAF50]">{totalSources}</p>
              <p className="text-xs text-slate-500 font-semibold">Live API sources</p>
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
                Every jurisdiction below has independently decided that food safety is a <em>public right to know</em> — not a government secret. SafeEats is the only platform that unifies all of these into a single, normalized, globally comparable system. A restaurant in Toronto, a pub in London, and a taco truck in Austin all receive the same A–F grade scale. Apples to apples. Everywhere.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Live API markets */}
        <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#4CAF50] flex-shrink-0"></span>
          Live API Markets — Direct Government Data
        </h2>
        <div className="space-y-4 mb-10">
          {LIVE_MARKETS.map((market, idx) => {
            const isOpen = expanded === idx;
            const regionId = `region-${idx}`;
            return (
              <div key={market.region} className={`rounded-2xl border-2 overflow-hidden ${market.color}`}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:opacity-80 transition-opacity"
                  onClick={() => setExpanded(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={regionId}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-extrabold text-slate-900">{market.region}</h3>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${market.pill}`}>
                      {market.sources.length} LIVE API SOURCE{market.sources.length !== 1 ? "S" : ""}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {isOpen && (
                  <div id={regionId} role="region" aria-label={`${market.region} sources`} className="px-5 pb-5 space-y-3">
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

        {/* Section: AI-enhanced markets */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-extrabold text-slate-900">AI-Enhanced Markets — Official Sources, AI-Read</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">These markets have real government food safety programs that exist as public websites or search portals, but no structured open API. SafeEats uses Gemini 3 Flash web search to read official sources and present results — clearly labeled as AI-estimated.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_ENHANCED_MARKETS.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-indigo-100 p-3 shadow-sm">
                <p className="font-bold text-slate-800 text-xs">{item.city}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Coming soon */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-extrabold text-slate-900">On the Radar — No Open Data Available</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">These markets have varying levels of public food safety data — from live government portals to licensing-only databases. None are currently wired as live API sources; results come from AI-estimated research.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_RESEARCH_MARKETS.map((item, i) => (
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
            For the remaining 180+ countries where live government APIs don't yet exist, SafeEats uses AI to read official health department websites, publicly posted inspection PDFs, local health bulletins, and verified sources — and presents those results clearly labeled as AI-estimated. Preliminary restaurant identification is powered by GPT-5 Mini for fast results, with live web search via Gemini 3 Flash pulling real-time data from official sources. We never fabricate a score. If we can't verify it, we say so.
          </p>
        </div>

        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Button variant="outline" asChild>
              <Link to="/About">The Full Story</Link>
            </Button>
          </div>
          <Button asChild className="bg-[#4CAF50] hover:bg-[#43A047] text-white">
            <Link to="/">Search a Restaurant →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}