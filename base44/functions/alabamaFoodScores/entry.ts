import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Alabama Department of Public Health — State-wide Food Establishment Scores
// Portal: foodscores.state.al.us (ASP.NET WebForms, cookieless sessions)
// Covers ALL 67 Alabama counties via county health departments.
// Scoring: 100-point scale, 85+=satisfactory, 70-84=follow-up, 60-69=reinspection, <60=closed.

const PORTAL_BASE = "https://foodscores.state.al.us";
const PORTAL_NAME = "ADPH Food Establishment Scores";

// County name → numeric ID (from the portal's dropdown)
const COUNTY_IDS: Record<string, string> = {
  AUTAUGA: "1", BALDWIN: "2", BARBOUR: "3", BIBB: "4", BLOUNT: "5",
  BULLOCK: "6", BUTLER: "7", CALHOUN: "8", CHAMBERS: "9", CHEROKEE: "10",
  CHILTON: "11", CHOCTAW: "12", CLARKE: "13", CLAY: "14", CLEBURNE: "15",
  COFFEE: "16", COLBERT: "17", CONECUH: "18", COOSA: "19", COVINGTON: "20",
  CRENSHAW: "21", CULLMAN: "22", DALE: "23", DALLAS: "24", DEKALB: "25",
  ELMORE: "26", ESCAMBIA: "27", ETOWAH: "28", FAYETTE: "29", FRANKLIN: "30",
  GENEVA: "31", GREENE: "32", HALE: "33", HENRY: "34", HOUSTON: "35",
  JACKSON: "36", JEFFERSON: "37", LAMAR: "38", LAUDERDALE: "39", LAWRENCE: "40",
  LEE: "41", LIMESTONE: "42", LOWNDES: "43", MACON: "44", MADISON: "45",
  MARENGO: "46", MARION: "47", MARSHALL: "48", MOBILE: "49", MONROE: "50",
  MONTGOMERY: "51", MORGAN: "52", PERRY: "53", PICKENS: "54", PIKE: "55",
  RANDOLPH: "56", RUSSELL: "57", "ST.CLAIR": "58", SHELBY: "59", SUMTER: "60",
  TALLADEGA: "61", TALLAPOOSA: "62", TUSCALOOSA: "63", WALKER: "64",
  WASHINGTON: "65", WILCOX: "66", WINSTON: "67",
};

// City → county name (for cities the user might search)
const CITY_TO_COUNTY: Record<string, string> = {
  "montgomery": "MONTGOMERY", "prattville": "AUTAUGA", "wetumpka": "ELMORE",
  "tallassee": "TALLAPOOSA", "millbrook": "AUTAUGA", "pike road": "MONTGOMERY",
  "selma": "DALLAS", "tuskegee": "MACON",
  "birmingham": "JEFFERSON", "hoover": "JEFFERSON", "vestavia hills": "JEFFERSON",
  "homewood": "JEFFERSON", "mountain brook": "JEFFERSON", "trussville": "JEFFERSON",
  "bessemer": "JEFFERSON", "hueytown": "JEFFERSON", "fairfield": "JEFFERSON",
  "forestdale": "JEFFERSON", "irondale": "JEFFERSON", "leeds": "JEFFERSON",
  "gardendale": "JEFFERSON", "fultondale": "JEFFERSON", "tarrant": "JEFFERSON",
  "center point": "JEFFERSON", "clay": "JEFFERSON", "pinson": "JEFFERSON",
  "alabaster": "SHELBY", "pelham": "SHELBY", "helena": "SHELBY",
  "calera": "SHELBY", "columbiana": "SHELBY", "montevallo": "SHELBY",
  "huntsville": "MADISON", "madison": "MADISON", "new hope": "MADISON",
  "owens cross roads": "MADISON", "trianna": "MADISON", "harvest": "MADISON",
  "mobile": "MOBILE", "prichard": "MOBILE", "saraland": "MOBILE",
  "chickasaw": "MOBILE", "satsuma": "MOBILE", "creola": "MOBILE",
  "bayou la batre": "MOBILE", "dauphin island": "MOBILE",
  "tuscaloosa": "TUSCALOOSA", "northport": "TUSCALOOSA", "brookwood": "TUSCALOOSA",
  "coaling": "TUSCALOOSA", "coker": "TUSCALOOSA", "vance": "TUSCALOOSA",
  "dothan": "HOUSTON", "ashford": "HOUSTON", "kinsey": "HOUSTON",
  "webb": "HOUSTON", "columbia": "HOUSTON", "madrid": "HOUSTON",
  "auburn": "LEE", "opelika": "LEE", "phenix city": "RUSSELL",
  "smiths station": "LEE", "loachapoka": "LEE", "waverly": "LEE",
  "decatur": "MORGAN", "hartselle": "MORGAN", "falkville": "MORGAN",
  "trinity": "MORGAN", "priceville": "MORGAN", "somerville": "MORGAN",
  "florence": "LAUDERDALE", "muscle shoals": "LAUDERDALE", "sheffield": "LAUDERDALE",
  "tuscumbia": "LAUDERDALE", "killen": "LAUDERDALE", "underwood": "LAUDERDALE",
  "gadsden": "ETOWAH", "attalla": "ETOWAH", "rainbow city": "ETOWAH",
  "southside": "ETOWAH", "glencoe": "ETOWAH", "hokes bluff": "ETOWAH",
  "anniston": "CALHOUN", "oxford": "CALHOUN", "jacksonville": "CALHOUN",
  "saks": "CALHOUN", "weaver": "CALHOUN", "pleasant valley": "CALHOUN",
  "troy": "PIKE", "brundidge": "PIKE", "banks": "PIKE",
  "enterprise": "COFFEE", "elba": "COFFEE", "new brockton": "COFFEE",
  "fort rucker": "DALE", "ozark": "DALE", "daleville": "DALE",
  "midland city": "DALE", "level plains": "DALE", "pinckard": "DALE",
  "daphne": "BALDWIN", "fairhope": "BALDWIN", "spanish fort": "BALDWIN",
  "foley": "BALDWIN", "gulf shores": "BALDWIN", "orange beach": "BALDWIN",
  "robertsdale": "BALDWIN", "bay minette": "BALDWIN", "loxley": "BALDWIN",
  "summerdale": "BALDWIN", "magnolia springs": "BALDWIN", "perdido beach": "BALDWIN",
  "athens": "LIMESTONE", "ardmore": "LIMESTONE", "elkmont": "LIMESTONE",
  "tanner": "LIMESTONE", "capshaw": "LIMESTONE",
  "scottsboro": "JACKSON", "stevenson": "JACKSON", "bridgeport": "JACKSON",
  "painted rock": "JACKSON", "section": "JACKSON", "woodville": "JACKSON",
  "cullman": "CULLMAN", "hanceville": "CULLMAN", "good hope": "CULLMAN",
  "vinemont": "CULLMAN", "west point": "CULLMAN", "garden city": "CULLMAN",
  "fort payne": "DEKALB", "rantz": "DEKALB", "collinsville": "DEKALB",
  "crossville": "DEKALB", "germantown": "DEKALB", "sande mountain": "DEKALB",
  "andalusia": "COVINGTON", "opp": "COVINGTON", "florala": "COVINGTON",
  "red level": "COVINGTON", "river falls": "COVINGTON", "babbie": "COVINGTON",
  "alexander city": "TALLAPOOSA", "dadeville": "TALLAPOOSA", "jacksons gap": "TALLAPOOSA",
  "camp hill": "TALLAPOOSA", "new site": "TALLAPOOSA", "daviston": "TALLAPOOSA",
  "sylacauga": "TALLADEGA", "talladega": "TALLADEGA", "lincoln": "TALLADEGA",
  "childersburg": "TALLADEGA", "munford": "TALLADEGA", "oxford al": "TALLADEGA",
  "oneonta": "BLOUNT", "blountsville": "BLOUNT", "cleveland": "BLOUNT",
  "locust fork": "BLOUNT", "nectar": "BLOUNT", "sussex": "BLOUNT",
  " russellville": "FRANKLIN", "red bay": "FRANKLIN", "phil campbell": "FRANKLIN",
  "vina": "FRANKLIN", "hoods": "FRANKLIN", "atwood": "FRANKLIN",
  "hamilton": "MARION", "winfield": "MARION", "guin": "MARION",
  "brilliant": "MARION", "hackleburg": "MARION", "twin": "MARION",
  "guntersville": "MARSHALL", "albertville": "MARSHALL", "boaz": "MARSHALL",
  "arab": "MARSHALL", "douglas": "MARSHALL", "grant": "MARSHALL",
  "eufaula": "BARBOUR", "clayton": "BARBOUR", "louisville": "BARBOUR",
  "clio": "BARBOUR", "bakerhill": "BARBOUR",
  "brewton": "ESCAMBIA", "atmore": "ESCAMBIA", "flomaton": "ESCAMBIA",
  "east brewton": "ESCAMBIA", "ritson": "ESCAMBIA",
  "evergreen": "CONECUH", "castleberry": "CONECUH", "repton": "CONECUH",
  "monroeville": "MONROE", "fruityt": "MONROE", "excel": "MONROE",
  "finchburg": "MONROE", "megargel": "MONROE", "nannie": "MONROE",
  "demopolis": "MARENGO", "linden": "MARENGO", "thomaston": "MARENGO",
  "myrtlewood": "MARENGO", "dayton": "MARENGO", "sawyerville": "MARENGO",
  "centreville": "BIBB", "brent": "BIBB", "woodstock": "BIBB",
  "west blocton": "BIBB", "lawley": "BIBB", "eoline": "BIBB",
  "union springs": "BULLOCK", "midway": "BULLOCK", "inverness": "BULLOCK",
  "fitzpatrick": "BULLOCK", "mitchell": "BULLOCK",
  "greenville": "BUTLER", "georgiana": "BUTLER", "mckenzie": "BUTLER",
  "bolling": "BUTLER", "chisholm": "BUTLER", "forest home": "BUTLER",
  "luverne": "CRENSHAW", "brantley": "CRENSHAW", "dozier": "CRENSHAW",
  "petrey": "CRENSHAW", "rutledge": "CRENSHAW",
  "abbeville": "HENRY", "headland": "HENRY", "newville": "HENRY",
  "haleburg": "HENRY", "barkers crossroads": "HENRY",
  "cedartown": "CLEBURNE", "heflin": "CLEBURNE", "fruithurst": "CLEBURNE",
  "edwardsville": "CLEBURNE", "riverside": "CLEBURNE",
  "ashland": "CLAY", "lineville": "CLAY", "delta": "CLAY",
  "mellow valley": "CLAY", "millerville": "CLAY",
  "grove hill": "CLARKE", "jackson": "CLARKE", "thomasville": "CLARKE",
  "coffeeville": "CLARKE", "gainesville": "CLARKE", "carlton": "CLARKE",
  "butler": "CHOCTAW", "lisman": "CHOCTAW", "penalosa": "CHOCTAW",
  "mount sterling": "CHOCTAW", "cuba": "CHOCTAW",
  "clanton": "CHILTON", "jemison": "CHILTON", "calera al": "CHILTON",
  "maplesville": "CHILTON", "thorsby": "CHILTON", "verbena": "CHILTON",
  "la fayette": "CHAMBERS", "valley": "CHAMBERS", "fairfax": "CHAMBERS",
  "lanett": "CHAMBERS", "cusseta": "CHAMBERS", "five points": "CHAMBERS",
  "centre": "CHEROKEE", "leesburg": "CHEROKEE", "cedar bluff": "CHEROKEE",
  "gaylesville": "CHEROKEE", "sandon": "CHEROKEE", "broomtown": "CHEROKEE",
  "roanoke": "RANDOLPH", "wedowee": "RANDOLPH", "waco": "RANDOLPH",
  "woodland": "RANDOLPH", "leveland": "RANDOLPH", "graham": "RANDOLPH",
  "wedowee al": "RANDOLPH",
  "tuscumbia al": "COLBERT", "sheffield al": "COLBERT", "muscle shoals al": "COLBERT",
  "florence al": "COLBERT", "cherokee al": "COLBERT", "leighton": "COLBERT",
  "littleville": "COLBERT", "russellville al": "FRANKLIN",
  "moulton": "LAWRENCE", "hillsboro": "LAWRENCE", "town creek": "LAWRENCE",
  "courtland": "LAWRENCE", "moulton al": "LAWRENCE", "landersville": "LAWRENCE",
  "hayneville": "LOWNDES", "fort deposit": "LOWNDES", "gordonville": "LOWNDES",
  "lowndesboro": "LOWNDES", "white hall": "LOWNDES", "moses": "LOWNDES",
  "tuskegee al": "MACON", "notasulga": "MACON", "shorter": "MACON",
  "franklin": "MACON", "loachapoka al": "MACON",
  "marion": "PERRY", "uniontown": "PERRY", "faunsdale": "PERRY",
  "sprott": "PERRY", "heiberger": "PERRY",
  "carrollton": "PICKENS", "aliceville": "PICKENS", "reform": "PICKENS",
  "gordo": "PICKENS", "macedonia": "PICKENS", "ephesus": "PICKENS",
  "livingston": "SUMTER", "york": "SUMTER", "epes": "SUMTER",
  "bellamy": "SUMTER", "gainesville al": "SUMTER", "panola": "SUMTER",
  "chatom": "WASHINGTON", "millo": "WASHINGTON", "lebanon": "WASHINGTON",
  "michell": "WASHINGTON", "st stephens": "WASHINGTON", "barton": "WASHINGTON",
  "abbeville al": "HENRY",
  "camden": "WILCOX", "pine apple": "WILCOX", "pine hill": "WILCOX",
  "yellow bluff": "WILCOX", "catherine": "WILCOX", "gees bend": "WILCOX",
  "double springs": "WINSTON", "addison": "WINSTON", "arley": "WINSTON",
  "delmar": "WINSTON", "haleyville": "WINSTON", "lynn": "WINSTON",
  "natural bridge": "WINSTON", "nauvoo": "WINSTON",
  "jasper": "WALKER", "dora": "WALKER", "sumiton": "WALKER",
  "carbon hill": "WALKER", "cordova": "WALKER", "nauvoo al": "WALKER",
  "parrish": "WALKER", "sipsey": "WALKER", "brilliant al": "WALKER",
  "pine springs": "LAMAR", "vernon": "LAMAR", "sulligent": "LAMAR",
  "millport": "LAMAR", "kennedy": "LAMAR", "belk": "LAMAR",
  "eutaw": "GREENE", "boligee": "GREENE", "union": "GREENE",
  "knoxville": "GREENE", "mantua": "GREENE", "tishabee": "GREENE",
  "greensboro": "HALE", "moundville": "HALE", "akron": "HALE",
  "newbern": "HALE", "gallion": "HALE", "sawyerville al": "HALE",
  "ashford al": "HOUSTON", "webb al": "HOUSTON", "madrid al": "HOUSTON",
  "kinston": "COFFEE", "enterprise al": "COFFEE",
  "elba al": "COFFEE", "new brockton al": "COFFEE",
  "moultrie": "LAMAR",
  "ft payne": "DEKALB", "fort payne al": "DEKALB",
  "tarrant al": "JEFFERSON", "forestdale al": "JEFFERSON",
  "center point al": "JEFFERSON", "clay al": "JEFFERSON",
  "pinson al": "JEFFERSON", "irondale al": "JEFFERSON",
  "leeds al": "JEFFERSON", "gardendale al": "JEFFERSON",
  "fultondale al": "JEFFERSON", "hueytown al": "JEFFERSON",
  "fairfield al": "JEFFERSON", "pleasant grove": "JEFFERSON",
  "midfield": "JEFFERSON", "adamsville": "JEFFERSON",
  "grayson valley": "JEFFERSON", "morrow": "JEFFERSON",
  "rush springs": "JEFFERSON", "chulahoma": "JEFFERSON",
};

function resolveCountyId(city: string | undefined, countyName: string | undefined): string | null {
  // Try city first, then county name
  if (city) {
    const cityUpper = city.toUpperCase().trim();
    if (COUNTY_IDS[cityUpper]) return COUNTY_IDS[cityUpper];
    const cityLower = city.toLowerCase().trim();
    if (CITY_TO_COUNTY[cityLower]) return COUNTY_IDS[CITY_TO_COUNTY[cityLower]];
  }
  if (countyName) {
    const countyUpper = countyName.toUpperCase().trim()
      .replace(/\s+COUNTY$/, "")
      .replace(/\s+/g, "");
    if (COUNTY_IDS[countyUpper]) return COUNTY_IDS[countyUpper];
  }
  return null;
}

function parseResults(html: string, countyName: string) {
  const facilities: any[] = [];
  const itemRegex = /ctl00_ContentPlaceHolder1_DtList_ctl(\d+)_LblEst/g;
  const indices = new Set<string>();
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    indices.add(match[1]);
  }

  for (const idx of indices) {
    const name = html.match(new RegExp(`ctl00_ContentPlaceHolder1_DtList_ctl${idx}_LblEst[^>]*>([^<]+)`))?.[1]?.trim();
    const address = html.match(new RegExp(`ctl00_ContentPlaceHolder1_DtList_ctl${idx}_LnkAdd[^>]*>([^<]+)`))?.[1]?.trim();
    const city = html.match(new RegExp(`ctl00_ContentPlaceHolder1_DtList_ctl${idx}_Label1[^>]*>([^<]+)`))?.[1]?.trim();
    const zip = html.match(new RegExp(`ctl00_ContentPlaceHolder1_DtList_ctl${idx}_Label2[^>]*>([^<]+)`))?.[1]?.trim();
    const score = html.match(new RegExp(`ctl00_ContentPlaceHolder1_DtList_ctl${idx}_LblScore[^>]*>([^<]+)`))?.[1]?.trim();
    const inspDate = html.match(new RegExp(`ctl00_ContentPlaceHolder1_DtList_ctl${idx}_LblInDt[^>]*>([^<]+)`))?.[1]?.trim();

    if (!name) continue;

    const numScore = score ? parseInt(score) : null;
    const business_id = `al_${countyName}_${idx}_${name.replace(/\s+/g, "_").substring(0, 30)}`;

    facilities.push({
      business_id,
      name,
      address: address || "",
      city: city || "",
      zip_code: zip ? zip.replace(/-$/, "") : "",
      county_id: "alabama",
      source: "alabama",
      safetyScore: numScore,
      grade: numScore !== null ? (numScore >= 90 ? "A" : numScore >= 80 ? "B" : numScore >= 70 ? "C" : numScore >= 60 ? "D" : "F") : "U",
      totalInspections: 1,
      latestDate: inspDate || null,
      latestResult: numScore !== null ? (numScore >= 85 ? "Satisfactory" : numScore >= 70 ? "Follow-up Required" : numScore >= 60 ? "Reinspection Required" : "Closed") : "Unknown",
      isLLMData: false,
      portal_url: `${PORTAL_BASE}/`,
      portal_name: PORTAL_NAME,
    });
  }

  return facilities;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, name, city, county } = body;

    if (action === "search") {
      const countyId = resolveCountyId(city, county);
      // If county can't be resolved from city name, search state-wide (county dropdown = "Select County")
      const countyValue = countyId || "Select County";

      const countyName = Object.entries(COUNTY_IDS).find(([_, id]) => id === countyId)?.[0] || "ALABAMA";

      // Step 1: Get session via 302 redirect
      const res1 = await fetch(PORTAL_BASE + "/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "manual",
      });
      const location = res1.headers.get("location") || "";
      const sessionId = location.match(/\(S\(([a-z0-9]+)\)\)/)?.[1];
      if (!sessionId) return Response.json({ facilities: [], error: "Failed to establish session with ADPH portal" });

      const sessionUrl = `${PORTAL_BASE}/(S(${sessionId}))/default.aspx`;

      // Step 2: Get ViewState and EventValidation
      const res2 = await fetch(sessionUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Referer": PORTAL_BASE + "/",
        },
      });
      const body2 = await res2.text();
      const viewstate = body2.match(/name="__VIEWSTATE"[^>]*value="([^"]*)"/)?.[1] || "";
      const eventval = body2.match(/name="__EVENTVALIDATION"[^>]*value="([^"]*)"/)?.[1] || "";
      if (!viewstate || !eventval) return Response.json({ facilities: [], error: "Failed to extract ASP.NET form state" });

      // Step 3: POST search
      const formData = new URLSearchParams();
      formData.append("__VIEWSTATE", viewstate);
      formData.append("__EVENTVALIDATION", eventval);
      formData.append("__LASTFOCUS", "");
      formData.append("__EVENTTARGET", "");
      formData.append("__EVENTARGUMENT", "");
      formData.append("ctl00$ContentPlaceHolder1$TxtEstdNm", name || "");
      formData.append("ctl00$ContentPlaceHolder1$DrpEstdType", "Food Service Establishment");
      formData.append("ctl00$ContentPlaceHolder1$txtCity", "");
      formData.append("ctl00$ContentPlaceHolder1$DrpCnty", countyId);
      formData.append("ctl00$ContentPlaceHolder1$BtnSearch.x", "10");
      formData.append("ctl00$ContentPlaceHolder1$BtnSearch.y", "10");

      const res3 = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": sessionUrl,
        },
        body: formData.toString(),
      });
      const body3 = await res3.text();

      const facilities = parseResults(body3, countyName);
      return Response.json({ facilities, county: countyName, source: PORTAL_NAME });
    }

    return Response.json({ error: "Unknown action. Use action: 'search' with name, city, or county." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});