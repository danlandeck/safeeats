import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, MapPin, Star, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ScoreGauge from "../components/ScoreGauge";

const KING_API = "https://data.kingcounty.gov/resource/f29f-zza5.json";
const NYC_API = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHICAGO_API = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
const MONTGOMERY_API = "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json";

function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getGradeColor(grade) {
  switch (grade) {
    case "A": return "bg-slate-900 text-white";
    case "B": return "bg-slate-600 text-white";
    case "C": return "bg-amber-500 text-white";
    case "D": return "bg-orange-500 text-white";
    case "F": return "bg-red-600 text-white";
    default: return "bg-slate-400 text-white";
  }
}

// Fetch + process King County top/worst
async function fetchKingCounty() {
  const url = `${KING_API}?$limit=2000&$order=inspection_date DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const businesses = {};
  data.forEach((row) => {
    const id = row.business_id;
    if (!id || !row.name) return;
    if (!businesses[id]) {
      businesses[id] = { id, name: row.name, address: row.address, city: row.city || "Seattle", scores: [] };
    }
    const score = parseInt(row.inspection_score);
    if (!isNaN(score)) businesses[id].scores.push(Math.max(0, Math.min(100, 100 - score)));
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchNYC() {
  const url = `${NYC_API}?$limit=2000&$order=inspection_date DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const businesses = {};
  data.forEach((row) => {
    const id = row.camis;
    if (!id || !row.dba) return;
    if (!businesses[id]) {
      businesses[id] = { id, name: row.dba, address: `${row.building || ""} ${row.street || ""}`.trim(), city: row.boro || "New York City", scores: [] };
    }
    const score = parseInt(row.score);
    if (!isNaN(score)) businesses[id].scores.push(Math.max(0, Math.min(100, 100 - score)));
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchChicago() {
  const url = `${CHICAGO_API}?$limit=2000&$order=inspection_date DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const businesses = {};
  data.forEach((row) => {
    const id = row.license_;
    const name = row.dba_name || row.aka_name;
    if (!id || !name) return;
    if (!businesses[id]) {
      businesses[id] = { id, name, address: row.address || "", city: "Chicago", scores: [] };
    }
    const result = row.results || "";
    const pts = result === "Pass" ? 92 : result === "Pass w/ Conditions" ? 76 : 45;
    businesses[id].scores.push(pts);
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchMontgomery() {
  const url = `${MONTGOMERY_API}?$limit=2000&$order=inspectiondate DESC`;
  const res = await fetch(url);
  const data = await res.json();
  const VKEYS = ["violation1","violation2","violation3","violation4","violation5","violation6a","violation6b","violation7a","violation7b","violation8","violation9"];
  const businesses = {};
  data.forEach((row) => {
    const id = row.establishment_id;
    const name = row.name;
    if (!id || !name) return;
    if (!businesses[id]) {
      businesses[id] = { id, name, address: row.address1 || "", city: "Rockville", scores: [] };
    }
    const out = VKEYS.filter((k) => row[k] === "Out of Compliance").length;
    const score = out === 0 ? 95 : out === 1 ? 82 : out === 2 ? 70 : 55;
    businesses[id].scores.push(score);
  });
  return Object.values(businesses)
    .filter((b) => b.scores.length > 0)
    .map((b) => {
      const avg = Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length);
      return { ...b, safetyScore: avg, grade: getGrade(avg), inspections: b.scores.length };
    });
}

async function fetchLLM(stateName, stateAbbr, countyName) {
  const countyLabel = countyName
    ? (countyName.toLowerCase().includes("county") ? countyName : `${countyName} County`)
    : null;
  const location = countyLabel
    ? `${countyLabel}, ${stateName}, ${stateAbbr}`
    : `${stateName}, ${stateAbbr}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a food safety data assistant. Search official health department records ONLY for restaurants physically located in ${location}. CRITICAL: Every single result MUST be located in ${location} — do NOT include restaurants from any other county, city, or state.

Return two separate lists:
1. top_rated: 10 restaurants with the BEST inspection records (few or no violations) in ${location}.
2. worst_rated: 10 restaurants with the WORST inspection records (many or serious violations) in ${location}.

The two lists must be completely DIFFERENT restaurants. All must be real establishments with real addresses in ${location}.

Scoring rules:
- total_violation_points = sum of penalty points from the most recent inspection (0 = perfect).
- safetyScore = 100 minus total_violation_points, clamped 0–100.
- If a place passed with 0 penalty points, total_violation_points must be 0 and safetyScore must be 100.
- If result says Pass/Satisfactory/Compliant, safetyScore must be 75 or higher.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        top_rated: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              safetyScore: { type: "number" },
              total_violation_points: { type: "number" },
            },
          },
        },
        worst_rated: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              safetyScore: { type: "number" },
              total_violation_points: { type: "number" },
            },
          },
        },
      },
    },
  });

  const mapItem = (r, prefix, i) => {
    let score;
    if (r.total_violation_points !== undefined && r.total_violation_points !== null) {
      score = Math.max(0, Math.min(100, 100 - Number(r.total_violation_points)));
    } else {
      score = Math.max(0, Math.min(100, Number(r.safetyScore) || 0));
      const isPassing = r.latest_result && /pass|satisf|complian|approved|ok/i.test(r.latest_result);
      if (isPassing && score < 75) score = 85;
    }
    return { id: `${prefix}-${i}`, name: r.name, address: r.address || "", city: r.city || stateName, safetyScore: score, grade: getGrade(score), inspections: null };
  };

  return {
    topRated: (result?.top_rated || []).map((r, i) => mapItem(r, "top", i)).sort((a, b) => b.safetyScore - a.safetyScore),
    worstRated: (result?.worst_rated || []).map((r, i) => mapItem(r, "worst", i)).sort((a, b) => a.safetyScore - b.safetyScore),
  };
}

function RestaurantRow({ restaurant, rank, isTop, onClick }) {
  const grade = restaurant.grade || getGrade(restaurant.safetyScore);
  return (
    <div
      className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="text-slate-400 font-bold text-sm w-5 text-center flex-shrink-0">#{rank}</div>
      <ScoreGauge score={restaurant.safetyScore} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 text-sm truncate">{restaurant.name}</p>
        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {restaurant.city}{restaurant.address ? ` · ${restaurant.address}` : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${getGradeColor(grade)}`}>
          {grade}
        </span>
        <span className="text-xs text-slate-400">{restaurant.safetyScore}/100</span>
      </div>
    </div>
  );
}

// Keyed by "STATE:CountyGeoJSONName" for precise matching
const LIVE_API_COUNTIES = {
  "WA:King":         { label: "King County (Seattle), WA",      fetch: fetchKingCounty, region: "washington", county: "king" },
  "NY:New York":     { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Kings":        { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Queens":       { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Bronx":        { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "NY:Richmond":     { label: "New York City (5 Boroughs), NY", fetch: fetchNYC,         region: "new_york",   county: "nyc" },
  "IL:Cook":         { label: "Cook County (Chicago), IL",      fetch: fetchChicago,    region: "illinois",   county: "cook" },
  "MD:Montgomery":   { label: "Montgomery County, MD",          fetch: fetchMontgomery, region: "maryland",   county: "montgomery_md" },
};

function getLiveConfig(stateAbbr, countyName) {
  return LIVE_API_COUNTIES[`${stateAbbr}:${countyName}`] || null;
}

// Map state abbr → REGIONS key for LLM states
const ABBR_TO_REGION_KEY = {
  AL:"alabama",AK:"alaska",AZ:"arizona",AR:"arkansas",CA:"california",CO:"colorado",
  CT:"connecticut",DE:"delaware",DC:"dc",FL:"florida",GA:"georgia",HI:"hawaii",
  ID:"idaho",IN:"indiana",IA:"iowa",KS:"kansas",KY:"kentucky",LA:"louisiana",
  ME:"maine",MA:"massachusetts",MI:"michigan",MN:"minnesota",MS:"mississippi",
  MO:"missouri",MT:"montana",NE:"nebraska",NV:"nevada",NH:"new_hampshire",
  NJ:"new_jersey",NM:"new_mexico",NY:"new_york",NC:"north_carolina",ND:"north_dakota",
  OH:"ohio",OK:"oklahoma",OR:"oregon",PA:"pennsylvania",RI:"rhode_island",
  SC:"south_carolina",SD:"south_dakota",TN:"tennessee",TX:"texas",UT:"utah",
  VT:"vermont",VA:"virginia",WA:"washington",WV:"west_virginia",WI:"wisconsin",WY:"wyoming",
};

// Inline REGIONS county list (id + name only) for lookup — mirrors Home.jsx REGIONS
const REGION_COUNTIES = {
  alabama: [{id:"jefferson",name:"Jefferson County (Birmingham)"},{id:"mobile",name:"Mobile County"},{id:"madison",name:"Madison County (Huntsville)"},{id:"montgomery",name:"Montgomery County"}],
  alaska: [{id:"anchorage",name:"Municipality of Anchorage"},{id:"fairbanks",name:"Fairbanks North Star Borough"},{id:"juneau",name:"City & Borough of Juneau"}],
  arizona: [{id:"maricopa",name:"Maricopa County (Phoenix)"},{id:"pima",name:"Pima County (Tucson)"},{id:"pinal",name:"Pinal County (Mesa/Gilbert)"},{id:"yavapai",name:"Yavapai County (Prescott)"},{id:"coconino",name:"Coconino County (Flagstaff)"}],
  arkansas: [{id:"pulaski",name:"Pulaski County (Little Rock)"},{id:"benton",name:"Benton County (Bentonville)"},{id:"washington_ar",name:"Washington County (Fayetteville)"}],
  california: [{id:"la",name:"Los Angeles County"},{id:"sf",name:"San Francisco County"},{id:"sandiego",name:"San Diego County"},{id:"sacramento",name:"Sacramento County"},{id:"alameda",name:"Alameda County (Oakland)"},{id:"orange_ca",name:"Orange County (Anaheim)"},{id:"riverside",name:"Riverside County"},{id:"sanbernardino",name:"San Bernardino County"},{id:"santaclara",name:"Santa Clara County (San Jose)"},{id:"fresno",name:"Fresno County"},{id:"kern",name:"Kern County (Bakersfield)"},{id:"ventura",name:"Ventura County"}],
  colorado: [{id:"denver",name:"Denver County"},{id:"el_paso",name:"El Paso County (Colorado Springs)"},{id:"boulder",name:"Boulder County"},{id:"arapahoe",name:"Arapahoe County (Aurora)"},{id:"adams",name:"Adams County"},{id:"larimer",name:"Larimer County (Fort Collins)"},{id:"jefferson_co",name:"Jefferson County (Lakewood)"}],
  connecticut: [{id:"hartford",name:"Hartford County"},{id:"new_haven",name:"New Haven County"},{id:"fairfield",name:"Fairfield County (Bridgeport)"}],
  delaware: [{id:"new_castle",name:"New Castle County (Wilmington)"},{id:"kent",name:"Kent County (Dover)"},{id:"sussex",name:"Sussex County"}],
  dc: [{id:"dc",name:"District of Columbia"}],
  florida: [{id:"miami_dade",name:"Miami-Dade County"},{id:"broward",name:"Broward County (Fort Lauderdale)"},{id:"orange_fl",name:"Orange County (Orlando)"},{id:"hillsborough",name:"Hillsborough County (Tampa)"},{id:"palm_beach",name:"Palm Beach County"},{id:"pinellas",name:"Pinellas County (St. Petersburg)"},{id:"duval",name:"Duval County (Jacksonville)"},{id:"polk",name:"Polk County (Lakeland)"},{id:"lee",name:"Lee County (Fort Myers)"}],
  georgia: [{id:"fulton",name:"Fulton County (Atlanta)"},{id:"dekalb",name:"DeKalb County"},{id:"gwinnett",name:"Gwinnett County"},{id:"cobb",name:"Cobb County (Marietta)"},{id:"chatham",name:"Chatham County (Savannah)"},{id:"bibb",name:"Bibb County (Macon)"}],
  hawaii: [{id:"honolulu",name:"City & County of Honolulu"},{id:"maui",name:"Maui County"},{id:"hawaii_county",name:"Hawaii County (Big Island)"},{id:"kauai",name:"Kauai County"}],
  idaho: [{id:"ada",name:"Ada County (Boise)"},{id:"canyon",name:"Canyon County (Nampa)"},{id:"kootenai",name:"Kootenai County (Coeur d'Alene)"}],
  illinois: [{id:"cook",name:"Cook County (Chicago)"},{id:"dupage",name:"DuPage County"},{id:"lake_il",name:"Lake County"},{id:"will",name:"Will County (Joliet)"},{id:"kane",name:"Kane County"},{id:"sangamon",name:"Sangamon County (Springfield)"}],
  indiana: [{id:"marion",name:"Marion County (Indianapolis)"},{id:"lake_in",name:"Lake County (Gary)"},{id:"allen",name:"Allen County (Fort Wayne)"},{id:"hamilton_in",name:"Hamilton County (Carmel)"}],
  iowa: [{id:"polk_ia",name:"Polk County (Des Moines)"},{id:"linn",name:"Linn County (Cedar Rapids)"},{id:"scott",name:"Scott County (Davenport)"},{id:"johnson",name:"Johnson County (Iowa City)"}],
  kansas: [{id:"johnson_ks",name:"Johnson County (Overland Park)"},{id:"sedgwick",name:"Sedgwick County (Wichita)"},{id:"wyandotte",name:"Wyandotte County (Kansas City KS)"},{id:"shawnee",name:"Shawnee County (Topeka)"}],
  kentucky: [{id:"jefferson_ky",name:"Jefferson County (Louisville)"},{id:"fayette",name:"Fayette County (Lexington)"},{id:"boone",name:"Boone County"}],
  louisiana: [{id:"orleans",name:"Orleans Parish (New Orleans)"},{id:"east_baton_rouge",name:"East Baton Rouge Parish"},{id:"jefferson_la",name:"Jefferson Parish (Metairie)"},{id:"caddo",name:"Caddo Parish (Shreveport)"}],
  maine: [{id:"cumberland",name:"Cumberland County (Portland)"},{id:"penobscot",name:"Penobscot County (Bangor)"},{id:"york",name:"York County"}],
  maryland: [{id:"baltimore_city",name:"Baltimore City"},{id:"baltimore_county",name:"Baltimore County"},{id:"montgomery_md",name:"Montgomery County"},{id:"prince_georges",name:"Prince George's County"},{id:"anne_arundel",name:"Anne Arundel County (Annapolis)"},{id:"howard",name:"Howard County (Columbia)"}],
  massachusetts: [{id:"suffolk",name:"Suffolk County (Boston)"},{id:"middlesex",name:"Middlesex County (Cambridge)"},{id:"worcester",name:"Worcester County"},{id:"hampden",name:"Hampden County (Springfield)"},{id:"norfolk",name:"Norfolk County (Quincy)"},{id:"essex_ma",name:"Essex County (Salem/Lawrence)"}],
  michigan: [{id:"wayne",name:"Wayne County (Detroit)"},{id:"kent",name:"Kent County (Grand Rapids)"},{id:"oakland",name:"Oakland County"},{id:"macomb",name:"Macomb County"},{id:"ingham",name:"Ingham County (Lansing)"},{id:"washtenaw",name:"Washtenaw County (Ann Arbor)"}],
  minnesota: [{id:"hennepin",name:"Hennepin County (Minneapolis)"},{id:"ramsey",name:"Ramsey County (St. Paul)"},{id:"dakota",name:"Dakota County"},{id:"anoka",name:"Anoka County"},{id:"st_louis_mn",name:"St. Louis County (Duluth)"}],
  mississippi: [{id:"hinds",name:"Hinds County (Jackson)"},{id:"harrison",name:"Harrison County (Biloxi)"},{id:"desoto",name:"DeSoto County (Southaven)"}],
  missouri: [{id:"st_louis_city",name:"St. Louis City"},{id:"st_louis_county",name:"St. Louis County"},{id:"jackson",name:"Jackson County (Kansas City)"},{id:"greene",name:"Greene County (Springfield)"},{id:"boone_mo",name:"Boone County (Columbia)"}],
  montana: [{id:"yellowstone",name:"Yellowstone County (Billings)"},{id:"cascade",name:"Cascade County (Great Falls)"},{id:"missoula",name:"Missoula County"},{id:"gallatin",name:"Gallatin County (Bozeman)"}],
  nebraska: [{id:"douglas",name:"Douglas County (Omaha)"},{id:"lancaster",name:"Lancaster County (Lincoln)"},{id:"sarpy",name:"Sarpy County (Bellevue)"}],
  nevada: [{id:"clark",name:"Clark County (Las Vegas)"},{id:"washoe",name:"Washoe County (Reno)"},{id:"carson",name:"Carson City"}],
  new_hampshire: [{id:"hillsborough_nh",name:"Hillsborough County (Manchester)"},{id:"rockingham",name:"Rockingham County (Nashua)"},{id:"merrimack",name:"Merrimack County (Concord)"}],
  new_jersey: [{id:"essex",name:"Essex County (Newark)"},{id:"bergen",name:"Bergen County (Hackensack)"},{id:"hudson",name:"Hudson County (Jersey City)"},{id:"middlesex_nj",name:"Middlesex County (New Brunswick)"},{id:"monmouth",name:"Monmouth County"},{id:"ocean",name:"Ocean County (Toms River)"},{id:"union_nj",name:"Union County (Elizabeth)"},{id:"camden",name:"Camden County"}],
  new_mexico: [{id:"bernalillo",name:"Bernalillo County (Albuquerque)"},{id:"dona_ana",name:"Doña Ana County (Las Cruces)"},{id:"santa_fe_nm",name:"Santa Fe County"}],
  new_york: [{id:"nyc",name:"New York City (5 Boroughs)"},{id:"nassau",name:"Nassau County (Long Island)"},{id:"suffolk_ny",name:"Suffolk County (Long Island)"},{id:"westchester",name:"Westchester County (White Plains)"},{id:"erie",name:"Erie County (Buffalo)"},{id:"monroe_ny",name:"Monroe County (Rochester)"},{id:"albany",name:"Albany County"},{id:"onondaga",name:"Onondaga County (Syracuse)"}],
  north_carolina: [{id:"mecklenburg",name:"Mecklenburg County (Charlotte)"},{id:"wake",name:"Wake County (Raleigh)"},{id:"guilford",name:"Guilford County (Greensboro)"},{id:"forsyth",name:"Forsyth County (Winston-Salem)"},{id:"durham",name:"Durham County"},{id:"cumberland_nc",name:"Cumberland County (Fayetteville)"},{id:"buncombe",name:"Buncombe County (Asheville)"}],
  north_dakota: [{id:"cass",name:"Cass County (Fargo)"},{id:"burleigh",name:"Burleigh County (Bismarck)"},{id:"grand_forks",name:"Grand Forks County"}],
  ohio: [{id:"cuyahoga",name:"Cuyahoga County (Cleveland)"},{id:"franklin",name:"Franklin County (Columbus)"},{id:"hamilton_oh",name:"Hamilton County (Cincinnati)"},{id:"summit",name:"Summit County (Akron)"},{id:"montgomery_oh",name:"Montgomery County (Dayton)"},{id:"lucas",name:"Lucas County (Toledo)"},{id:"stark",name:"Stark County (Canton)"}],
  oklahoma: [{id:"oklahoma_county",name:"Oklahoma County (Oklahoma City)"},{id:"tulsa",name:"Tulsa County"},{id:"cleveland_ok",name:"Cleveland County (Norman)"}],
  oregon: [{id:"multnomah",name:"Multnomah County (Portland)"},{id:"lane",name:"Lane County (Eugene)"},{id:"marion_or",name:"Marion County (Salem)"},{id:"washington_or",name:"Washington County (Beaverton/Hillsboro)"},{id:"clackamas",name:"Clackamas County"},{id:"jackson_or",name:"Jackson County (Medford)"},{id:"deschutes",name:"Deschutes County (Bend)"}],
  pennsylvania: [{id:"philadelphia",name:"Philadelphia County"},{id:"allegheny",name:"Allegheny County (Pittsburgh)"},{id:"montgomery_pa",name:"Montgomery County"},{id:"bucks",name:"Bucks County"},{id:"chester_pa",name:"Chester County"},{id:"lancaster_pa",name:"Lancaster County"},{id:"york_pa",name:"York County"},{id:"berks",name:"Berks County (Reading)"}],
  rhode_island: [{id:"providence",name:"Providence County"},{id:"kent_ri",name:"Kent County (Warwick)"},{id:"washington_ri",name:"Washington County"}],
  south_carolina: [{id:"greenville",name:"Greenville County"},{id:"richland",name:"Richland County (Columbia)"},{id:"charleston_sc",name:"Charleston County"},{id:"spartanburg",name:"Spartanburg County"}],
  south_dakota: [{id:"minnehaha",name:"Minnehaha County (Sioux Falls)"},{id:"pennington",name:"Pennington County (Rapid City)"}],
  tennessee: [{id:"shelby",name:"Shelby County (Memphis)"},{id:"davidson",name:"Davidson County (Nashville)"},{id:"knox",name:"Knox County (Knoxville)"},{id:"hamilton_tn",name:"Hamilton County (Chattanooga)"},{id:"rutherford",name:"Rutherford County (Murfreesboro)"}],
  texas: [{id:"harris",name:"Harris County (Houston)"},{id:"dallas",name:"Dallas County"},{id:"travis",name:"Travis County (Austin)"},{id:"bexar",name:"Bexar County (San Antonio)"},{id:"tarrant",name:"Tarrant County (Fort Worth)"},{id:"collin",name:"Collin County (Plano/Frisco)"},{id:"hidalgo",name:"Hidalgo County (McAllen)"},{id:"denton",name:"Denton County"},{id:"el_paso_tx",name:"El Paso County"},{id:"nueces",name:"Nueces County (Corpus Christi)"},{id:"williamson",name:"Williamson County (Round Rock)"},{id:"lubbock",name:"Lubbock County"}],
  utah: [{id:"salt_lake",name:"Salt Lake County"},{id:"utah_county",name:"Utah County (Provo/Orem)"},{id:"davis",name:"Davis County (Layton)"},{id:"weber",name:"Weber County (Ogden)"},{id:"washington_ut",name:"Washington County (St. George)"}],
  vermont: [{id:"chittenden",name:"Chittenden County (Burlington)"},{id:"rutland",name:"Rutland County"},{id:"washington_vt",name:"Washington County (Montpelier)"}],
  virginia: [{id:"fairfax",name:"Fairfax County"},{id:"virginia_beach",name:"Virginia Beach City"},{id:"richmond",name:"Richmond City"},{id:"arlington",name:"Arlington County"},{id:"chesapeake",name:"Chesapeake City"},{id:"norfolk",name:"Norfolk City"},{id:"chesterfield",name:"Chesterfield County"},{id:"loudoun",name:"Loudoun County"}],
  washington: [{id:"king",name:"King County (Seattle)"},{id:"snohomish",name:"Snohomish County (Everett)"},{id:"pierce",name:"Pierce County (Tacoma)"},{id:"clark_wa",name:"Clark County (Vancouver)"},{id:"spokane",name:"Spokane County"},{id:"thurston",name:"Thurston County (Olympia)"},{id:"kitsap",name:"Kitsap County (Bremerton)"},{id:"whatcom",name:"Whatcom County (Bellingham)"},{id:"benton_wa",name:"Benton County (Kennewick/Richland)"},{id:"yakima",name:"Yakima County"}],
  west_virginia: [{id:"kanawha",name:"Kanawha County (Charleston)"},{id:"cabell",name:"Cabell County (Huntington)"},{id:"monongalia",name:"Monongalia County (Morgantown)"}],
  wisconsin: [{id:"milwaukee",name:"Milwaukee County"},{id:"dane",name:"Dane County (Madison)"},{id:"waukesha",name:"Waukesha County"},{id:"brown",name:"Brown County (Green Bay)"},{id:"racine",name:"Racine County"}],
  wyoming: [{id:"laramie",name:"Laramie County (Cheyenne)"},{id:"natrona",name:"Natrona County (Casper)"},{id:"teton",name:"Teton County (Jackson)"}],
};

// Find the county ID by matching the GeoJSON county name within a state's county list
function findCountyId(stateAbbr, geoCountyName) {
  const regionKey = ABBR_TO_REGION_KEY[stateAbbr];
  if (!regionKey) return "";
  const counties = REGION_COUNTIES[regionKey] || [];
  const lower = geoCountyName.toLowerCase();
  // Try exact word match first (e.g. "Clark" matches "Clark County (Vancouver)")
  const match = counties.find((c) => c.name.toLowerCase().startsWith(lower));
  return match ? match.id : (counties[0]?.id || "");
}

export default function CountyDrillDown() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const stateAbbr = urlParams.get("state") || "WA";
  const stateName = urlParams.get("name") || "Washington";
  const countyName = urlParams.get("county") || "";

  const handleRestaurantClick = (restaurant) => {
    const liveConfig = getLiveConfig(stateAbbr, countyName);
    const region = liveConfig ? liveConfig.region : (ABBR_TO_REGION_KEY[stateAbbr] || "washington");
    const county = liveConfig ? liveConfig.county : findCountyId(stateAbbr, countyName);
    navigate(`/?q=${encodeURIComponent(restaurant.name)}&region=${region}&county=${county}`);
  };

  const [topRated, setTopRated] = useState([]);
  const [worstRated, setWorstRated] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [regionLabel, setRegionLabel] = useState("");

  useEffect(() => {
    setLoading(true);
    setAllRestaurants([]);
    setTopRated([]);
    setWorstRated([]);

    const liveConfig = getLiveConfig(stateAbbr, countyName);
    if (liveConfig) {
      setIsLive(true);
      setRegionLabel(liveConfig.label);
      liveConfig.fetch().then((data) => {
        setAllRestaurants(data);
        const sorted = [...data].sort((a, b) => Number(b.safetyScore) - Number(a.safetyScore));
        setTopRated(sorted.slice(0, 10));
        setWorstRated([...data].sort((a, b) => Number(a.safetyScore) - Number(b.safetyScore)).slice(0, 10));
        setLoading(false);
      });
    } else {
      setIsLive(false);
      setRegionLabel(countyName ? `${countyName}, ${stateName}` : stateName);
      fetchLLM(stateName, stateAbbr, countyName).then(({ topRated: t, worstRated: w }) => {
        setTopRated(t);
        setWorstRated(w);
        setAllRestaurants([...t, ...w]);
        setLoading(false);
      });
    }
  }, [stateAbbr, stateName, countyName]);

  // topRated and worstRated are set directly in useEffect
  const uniqueAll = allRestaurants.length > 0 ? allRestaurants : [...topRated, ...worstRated];
  const avgScore = uniqueAll.length > 0
    ? Math.round(uniqueAll.reduce((s, r) => s + Number(r.safetyScore), 0) / uniqueAll.length)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Map
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{stateName}</h1>
              <p className="text-slate-400 text-sm mt-1">{regionLabel}</p>
              {isLive && (
                <span className="mt-2 inline-block text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                  ● LIVE API DATA
                </span>
              )}
            </div>
            {avgScore !== null && !loading && (
              <div className="bg-slate-800 rounded-2xl px-6 py-4 text-center">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Avg Safety Score</p>
                <p className="text-4xl font-extrabold">{avgScore}</p>
                <p className="text-slate-400 text-sm mt-0.5">Grade {getGrade(avgScore)} · {allRestaurants.length.toLocaleString()} establishments</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">
              {isLive ? "Fetching live inspection data…" : "Searching official health records via AI…"}
            </p>
          </div>
        ) : allRestaurants.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No data found for this region.</div>
        ) : (
          <>
          <div className="mb-6 px-4 py-3 bg-slate-100 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700">Ranking note:</span> Ties in safety score are broken by number of inspections on record — establishments with a longer, more consistent history rank higher (or lower), regardless of cuisine type, price point, or establishment prestige. A fine dining restaurant with the same score as a food truck earns no advantage.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Rated */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Top Rated</h2>
                  <p className="text-xs text-slate-500">Highest average safety scores</p>
                </div>
              </div>
              <div className="space-y-2">
                {topRated.map((r, i) => (
                  <RestaurantRow key={r.id} restaurant={r} rank={i + 1} isTop onClick={() => handleRestaurantClick(r)} />
                ))}
              </div>
            </div>

            {/* Worst Rated */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Needs Attention</h2>
                  <p className="text-xs text-slate-500">Lowest average safety scores</p>
                </div>
              </div>
              <div className="space-y-2">
                {worstRated.map((r, i) => (
                  <RestaurantRow key={r.id} restaurant={r} rank={i + 1} onClick={() => handleRestaurantClick(r)} />
                ))}
              </div>
            </div>
          </div>
          {!isLive && (
            <div className="mt-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>AI-Assisted Data:</strong> {stateName} does not have a real-time public API. Results are sourced from official health department records via AI lookup and may not reflect the very latest inspections.
              </p>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}