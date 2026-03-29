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
            <p className="text-slate-500 text-sm mb-6">SafeEats covers all 50 states + Washington D.C., sourcing data from each jurisdiction's official health department. <strong className="text-slate-700">12 jurisdictions</strong> use live real-time public APIs — data updates with every new inspection. All other jurisdictions use AI-assisted lookup from official public health records — same interface, no third-party redirects.</p>

            {/* Live API callouts - alphabetical */}
            <div className="mb-6 space-y-3">
              {[
                {
                  name: "Austin (Travis County), TX",
                  desc: "City of Austin Open Data Portal — Food Establishment Inspection Scores",
                  detail: "Real-time inspection scores for food establishments inspected within the last 3 years by Austin Public Health.",
                  url: "https://data.austintexas.gov/Health-and-Community-Services/Food-Establishment-Inspection-Scores/ecmv-9xxi",
                  urlLabel: "data.austintexas.gov →",
                },
                {
                  name: "Baton Rouge (East Baton Rouge Parish), LA",
                  desc: "City of Baton Rouge Open Data — Retail Food Inspections",
                  detail: "Real-time inspection records for all East Baton Rouge Parish food establishments from the Louisiana Dept. of Health.",
                  url: "https://data.brla.gov/Health-and-Human-Services/Retail-Food-Inspections/ux2t-b9wr",
                  urlLabel: "data.brla.gov →",
                },
                {
                  name: "Boston (Suffolk County), MA",
                  desc: "Analyze Boston Open Data — Food Establishment Inspections",
                  detail: "Real-time inspection records from the Boston Inspectional Services Department, updated continuously.",
                  url: "https://data.boston.gov/dataset/food-establishment-inspections",
                  urlLabel: "data.boston.gov →",
                },
                {
                  name: "Chicago (Cook County), IL",
                  desc: "City of Chicago Data Portal — Food Inspections",
                  detail: "Real-time inspection records from the Chicago Dept. of Public Health's Food Protection Program.",
                  url: "https://data.cityofchicago.org/Health-Human-Services/Food-Inspections/4ijn-s7e5",
                  urlLabel: "data.cityofchicago.org →",
                },
                {
                  name: "Iowa (Statewide), IA",
                  desc: "State of Iowa Open Data — Food Establishment Inspections",
                  detail: "Statewide real-time inspection records from the Iowa Dept. of Inspections and Appeals, covering all licensed food establishments.",
                  url: "https://data.iowa.gov/Regulatory/Food-Establishment-Inspections/xqcp-6ys7",
                  urlLabel: "data.iowa.gov →",
                },
                {
                  name: "King County (Seattle), WA",
                  desc: "King County Public Health Open Data Portal",
                  detail: "Real-time records updated with every new inspection across all King County food establishments.",
                  url: "https://data.kingcounty.gov",
                  urlLabel: "data.kingcounty.gov →",
                },
                {
                  name: "Los Angeles, CA",
                  desc: "Los Angeles Open Data — Restaurant and Market Health Inspections",
                  detail: "Real-time inspection results for restaurants and markets in the City of Los Angeles, provided by LA County Environmental Health.",
                  url: "https://data.lacity.org/Health/Restaurant-and-Market-Health-Inspections/29fd-3paw",
                  urlLabel: "data.lacity.org →",
                },
                {
                  name: "Montgomery County, MD",
                  desc: "dataMontgomery — Food Inspection Open Data Portal",
                  detail: "Real-time food inspection records from Montgomery County's Licensure & Regulatory Services Program.",
                  url: "https://data.montgomerycountymd.gov/Health-and-Human-Services/Food-Inspection/5pue-gfbe",
                  urlLabel: "data.montgomerycountymd.gov →",
                },
                {
                  name: "New York City (5 Boroughs), NY",
                  desc: "NYC Open Data — DOHMH Restaurant Inspection Results",
                  detail: "Real-time records from all five boroughs, updated continuously by the NYC Dept. of Health.",
                  url: "https://data.cityofnewyork.us/resource/43nn-pn8j",
                  urlLabel: "data.cityofnewyork.us →",
                },
                {
                  name: "New York State (Statewide), NY",
                  desc: "NY Open Data — Food Safety Inspections: Current Ratings",
                  detail: "Statewide real-time inspection data covering all food safety inspections conducted in the last 24 months across New York State.",
                  url: "https://data.ny.gov/Health/Food-Safety-Inspections-Current-Ratings/d6dy-3h7r",
                  urlLabel: "data.ny.gov →",
                },
                {
                  name: "San Francisco, CA",
                  desc: "San Francisco Open Data — Restaurant Scores (LIVES Standard)",
                  detail: "Real-time health inspection scores for SF restaurants published by the SF Dept. of Public Health using the LIVES open standard.",
                  url: "https://data.sfgov.org/Health-and-Social-Services/Restaurant-Scores-LIVES-Standard/pyih-qa8i",
                  urlLabel: "data.sfgov.org →",
                },
                {
                  name: "Wake County (Raleigh), NC",
                  desc: "Wake County Open Data — Food Inspections",
                  detail: "Real-time food inspection records from the Wake County Health Dept., covering all permitted food service facilities across the county.",
                  url: "https://data-wake.opendata.arcgis.com/datasets/Wake::food-inspections",
                  urlLabel: "data-wake.opendata.arcgis.com →",
                },
              ].map((api) => (
                <div key={api.name} className="bg-slate-900 rounded-xl p-5 text-white">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">LIVE API</span>
                      </div>
                      <p className="font-extrabold text-base">{api.name}</p>
                      <p className="text-slate-300 text-sm mt-0.5">{api.desc}</p>
                      <p className="text-slate-400 text-xs mt-1">{api.detail}</p>
                    </div>
                    <a href={api.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-300 hover:text-white underline underline-offset-2 flex-shrink-0">
                      {api.urlLabel}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* All other states */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { state: "Alabama (AL)", counties: "Jefferson, Mobile, Madison, Montgomery" },
                { state: "Alaska (AK)", counties: "Anchorage, Fairbanks, Juneau" },
                { state: "Arizona (AZ)", counties: "Maricopa, Pima, Pinal, Yavapai, Coconino" },
                { state: "Arkansas (AR)", counties: "Pulaski, Benton, Washington" },
                { state: "California (CA)", counties: "Los Angeles, San Francisco, San Diego, Sacramento, Alameda, Orange, Riverside, San Bernardino, Santa Clara, Fresno, Kern, Ventura" },
                { state: "Colorado (CO)", counties: "Denver, El Paso, Boulder, Arapahoe, Adams, Larimer, Jefferson" },
                { state: "Connecticut (CT)", counties: "Hartford, New Haven, Fairfield" },
                { state: "Delaware (DE)", counties: "New Castle, Kent, Sussex" },
                { state: "Washington D.C.", counties: "District of Columbia" },
                { state: "Florida (FL)", counties: "Miami-Dade, Broward, Orange, Hillsborough, Palm Beach, Pinellas, Duval, Polk, Lee" },
                { state: "Georgia (GA)", counties: "Fulton, DeKalb, Gwinnett, Cobb, Chatham, Bibb" },
                { state: "Hawaii (HI)", counties: "Honolulu, Maui, Hawaii (Big Island), Kauai" },
                { state: "Idaho (ID)", counties: "Ada, Canyon, Kootenai" },
                { state: "Illinois (IL)", counties: "Cook County (Chicago) — LIVE API, DuPage, Lake, Will, Kane, Sangamon" },
                { state: "Indiana (IN)", counties: "Marion, Lake, Allen, Hamilton" },
                { state: "Iowa (IA)", counties: "Polk, Linn, Scott, Johnson" },
                { state: "Kansas (KS)", counties: "Johnson, Sedgwick, Wyandotte, Shawnee" },
                { state: "Kentucky (KY)", counties: "Jefferson, Fayette, Boone" },
                { state: "Louisiana (LA)", counties: "Orleans, East Baton Rouge, Jefferson, Caddo" },
                { state: "Maine (ME)", counties: "Cumberland, Penobscot, York" },
                { state: "Maryland (MD)", counties: "Baltimore City, Baltimore County, Montgomery County — LIVE API, Prince George's, Anne Arundel, Howard" },
                { state: "Massachusetts (MA)", counties: "Suffolk, Middlesex, Worcester, Hampden, Norfolk, Essex" },
                { state: "Michigan (MI)", counties: "Wayne, Kent, Oakland, Macomb, Ingham, Washtenaw" },
                { state: "Minnesota (MN)", counties: "Hennepin, Ramsey, Dakota, Anoka, St. Louis" },
                { state: "Mississippi (MS)", counties: "Hinds, Harrison, DeSoto" },
                { state: "Missouri (MO)", counties: "St. Louis City, St. Louis County, Jackson, Greene, Boone" },
                { state: "Montana (MT)", counties: "Yellowstone, Cascade, Missoula, Gallatin" },
                { state: "Nebraska (NE)", counties: "Douglas, Lancaster, Sarpy" },
                { state: "Nevada (NV)", counties: "Clark, Washoe, Carson City" },
                { state: "New Hampshire (NH)", counties: "Hillsborough, Rockingham, Merrimack" },
                { state: "New Jersey (NJ)", counties: "Essex, Bergen, Hudson, Middlesex, Monmouth, Ocean, Union, Camden" },
                { state: "New Mexico (NM)", counties: "Bernalillo, Doña Ana, Santa Fe" },
                { state: "New York (NY)", counties: "NYC (5 Boroughs) — LIVE API, Nassau, Suffolk, Westchester, Erie, Monroe, Albany, Onondaga" },
                { state: "North Carolina (NC)", counties: "Mecklenburg, Wake, Guilford, Forsyth, Durham, Cumberland, Buncombe" },
                { state: "North Dakota (ND)", counties: "Cass, Burleigh, Grand Forks" },
                { state: "Ohio (OH)", counties: "Cuyahoga, Franklin, Hamilton, Summit, Montgomery, Lucas, Stark" },
                { state: "Oklahoma (OK)", counties: "Oklahoma, Tulsa, Cleveland" },
                { state: "Oregon (OR)", counties: "Multnomah, Lane, Marion, Washington, Clackamas, Jackson, Deschutes" },
                { state: "Pennsylvania (PA)", counties: "Philadelphia, Allegheny, Montgomery, Bucks, Chester, Lancaster, York, Berks" },
                { state: "Rhode Island (RI)", counties: "Providence, Kent, Washington" },
                { state: "South Carolina (SC)", counties: "Greenville, Richland, Charleston, Spartanburg" },
                { state: "South Dakota (SD)", counties: "Minnehaha, Pennington" },
                { state: "Tennessee (TN)", counties: "Shelby, Davidson, Knox, Hamilton, Rutherford" },
                { state: "Texas (TX)", counties: "Harris, Dallas, Travis, Bexar, Tarrant, Collin, Hidalgo, Denton, El Paso, Nueces, Williamson, Lubbock" },
                { state: "Utah (UT)", counties: "Salt Lake, Utah, Davis, Weber, Washington" },
                { state: "Vermont (VT)", counties: "Chittenden, Rutland, Washington" },
                { state: "Virginia (VA)", counties: "Fairfax, Virginia Beach, Richmond, Arlington, Chesapeake, Norfolk, Chesterfield, Loudoun" },
                { state: "Washington (WA)", counties: "King County — LIVE API, Snohomish, Pierce, Clark, Spokane, Thurston, Kitsap, Whatcom, Benton, Yakima" },
                { state: "West Virginia (WV)", counties: "Kanawha, Cabell, Monongalia" },
                { state: "Wisconsin (WI)", counties: "Milwaukee, Dane, Waukesha, Brown, Racine" },
                { state: "Wyoming (WY)", counties: "Laramie, Natrona, Teton" },
              ].map((row) => (
                <div key={row.state} className="bg-slate-50 rounded-lg p-3">
                  <p className="font-bold text-slate-800 text-sm">{row.state}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{row.counties}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Data method:</strong> <strong>12 jurisdictions</strong> use live real-time public APIs — Austin TX, Baton Rouge LA, Boston MA, Chicago IL, Iowa (statewide), King County WA, Los Angeles CA, Montgomery County MD, New York City NY, New York State (statewide), San Francisco CA, and Wake County (Raleigh) NC. Data is current as of the moment you search. All other jurisdictions use <strong>AI-assisted lookup</strong> that searches publicly available official health department records — results depend entirely on whether that jurisdiction publishes inspection data online. Many smaller counties do not digitize or publicly post their records, in which case results may be incomplete, outdated, or unavailable. SafeEats lists all 50 states and hundreds of counties in the selector, but that reflects <em>potential</em> coverage, not a guaranteed direct database connection for every jurisdiction.
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Geographic precision:</strong> Live API routing is matched on <strong>both state abbreviation and county name together</strong> — never on county name alone. This prevents counties that share names across states from being routed to the wrong data source. For example, <em>King County, WA</em> correctly hits the King County Public Health API, while <em>King County, TX</em> falls back to AI-assisted lookup. The same logic applies to <em>Montgomery County</em> (MD has a live API; OH, PA, and others do not), <em>Cook County</em> (IL has a live API; others do not), and all five New York City boroughs (NY). Only the four specifically integrated county/city combinations receive live API data — all same-named counties in other states use AI-assisted lookup.
              </p>
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
                King County, WA · New York City, NY · Cook County (Chicago), IL · and Montgomery County, MD use live real-time APIs. All other regions use AI-assisted lookups from official health department records — same UI, no third-party redirects.
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

          {/* ESRI Credit */}
          <Card className="p-8 border-slate-200 bg-white">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center">
                  <Globe className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-slate-900">Powered by Esri Technology</h2>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Map Data Partner</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">
                  SafeEats uses <strong className="text-slate-900">Esri's industry-leading GIS color ramp standards</strong> — specifically the ESRI-standard diverging health-risk color scale (green-to-red) — to communicate food safety risk in a way that's immediately intuitive to anyone familiar with professional geospatial analysis. This is the same visual language used by public health agencies, emergency management teams, and environmental scientists worldwide.
                </p>
                <p className="text-slate-600 leading-relaxed mb-4">
                  What makes Esri's approach so powerful — and why SafeEats adopted it — is that their color science isn't arbitrary. The diverging ramp is perceptually calibrated so that severity differences are immediately legible at a glance, even for users with color vision deficiencies. Applying that cartographic rigor to restaurant safety data transforms what could be a dry table of numbers into a genuinely actionable risk map.
                </p>
                <p className="text-slate-600 leading-relaxed mb-4">
                  SafeEats also draws on Esri's publicly available GeoJSON boundary datasets for state-level mapping, enabling smooth, high-fidelity geographic visualizations without requiring proprietary software. This is a testament to Esri's commitment to making professional-grade geospatial infrastructure accessible to developers building civic technology.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Esri has been the gold standard in GIS for over five decades. Their innovation in spatial analysis, data visualization, and open geospatial standards directly enables platforms like SafeEats to deliver meaningful, data-driven public health tools. We're proud to build on that foundation.
                </p>
                <a
                  href="https://www.esri.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                  Learn more about Esri →
                </a>
              </div>
            </div>
          </Card>

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
                <strong className="text-slate-900">1. Data Pull:</strong> We fetch the most current data from each city/county health department — live API for King County, NYC, Chicago, and Montgomery County MD; AI-assisted lookup from official public records for all other jurisdictions.
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
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <p className="text-xl font-extrabold text-slate-900">Daniel Landeck</p>
                <p className="text-slate-500 text-xs mt-0.5">Seattle Metro Area · University of Washington Graduate</p>
              </div>
              <p className="leading-relaxed">
                Daniel Landeck is the rare kind of creative professional who operates at the intersection of storytelling, technology, and physical discipline. By day he's a veteran game developer and film producer with credits spanning two industries. By night — or, let's be honest, also by day — he's the guy who built SafeEats as a <span className="font-semibold text-slate-800">genuine public service</span>: transparent food safety data, free, for everyone, because the public deserves better than a wall of government PDFs.
              </p>
              <p className="leading-relaxed">
                A <span className="font-semibold text-slate-800">black belt in traditional Okinawan Karate (Shudokan)</span> and a <span className="font-semibold text-slate-800">blue belt in Brazilian Jiu-Jitsu</span>, Daniel approaches every project — whether it's a game, a film, or a civic tech platform — with the same philosophy: discipline, craft, and finishing what you start. He is actively seeking new collaborations in games, film, and technology.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="https://www.linkedin.com/in/danlandeck/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  LinkedIn →
                </a>
                <a
                  href="https://www.mobygames.com/person/277275/daniel-landeck/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  MobyGames (Game Dev) →
                </a>
                <a
                  href="https://www.imdb.com/name/nm6015660/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  IMDb (Film Producer) →
                </a>
              </div>
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