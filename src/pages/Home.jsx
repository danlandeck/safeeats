import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense } from "react";
import { FixedSizeList as VirtualList } from "react-window";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCompareArrows, LocateFixed, Loader2, ShieldCheck } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { REGIONS } from "../utils/regions";
import { getTranslations } from "../utils/i18n";
import { useLanguage } from "../lib/LanguageContext";
import { llmToDetailRows, geocodeAddress, reverseGeocode } from "../utils/inspectionProcessors";
import { search as engineSearch, fetchDetail as engineFetchDetail } from "../utils/searchEngine";
import RestaurantCard from "../components/RestaurantCard";
import SearchLoadingIndicator from "../components/SearchLoadingIndicator";
import SmartSearchPanel from "../components/SmartSearchPanel";
import FuzzySearchBar from "../components/FuzzySearchBar";
import ConsentBanner, { useConsent } from "../components/ConsentBanner";
import HeroViolations from "../components/HeroViolations";
import RestaurantDetail from "../components/RestaurantDetail";

// Lazy-load heavy components so initial bundle is smaller
const CameraScanner = React.lazy(() => import("../components/CameraScanner"));
const MapView       = React.lazy(() => import("../components/MapView"));
const ScoreLegend   = React.lazy(() => import("../components/ScoreLegend"));
const ComparePanel  = React.lazy(() => import("../components/ComparePanel"));

export { getGrade } from "../utils/grading";
export { getGradeColor } from "../utils/grading";

// City aliases → { region, countyId } for all supported live API counties
const CITY_TO_COUNTY = {
  // King County, WA
  "seattle": { region: "washington", countyId: "king" },
  "bellevue": { region: "washington", countyId: "king" },
  "redmond": { region: "washington", countyId: "king" },
  "kirkland": { region: "washington", countyId: "king" },
  "renton": { region: "washington", countyId: "king" },
  "kent": { region: "washington", countyId: "king" },
  "burien": { region: "washington", countyId: "king" },
  "federal way": { region: "washington", countyId: "king" },
  "auburn": { region: "washington", countyId: "king" },
  "shoreline": { region: "washington", countyId: "king" },
  "bothell": { region: "washington", countyId: "king" },
  "sammamish": { region: "washington", countyId: "king" },
  "issaquah": { region: "washington", countyId: "king" },
  "king county": { region: "washington", countyId: "king" },
  "mercer island": { region: "washington", countyId: "king" },
  "newcastle": { region: "washington", countyId: "king" },
  "covington": { region: "washington", countyId: "king" },
  "maple valley": { region: "washington", countyId: "king" },
  "black diamond": { region: "washington", countyId: "king" },
  "enumclaw": { region: "washington", countyId: "king" },
  "duvall": { region: "washington", countyId: "king" },
  "snoqualmie": { region: "washington", countyId: "king" },
  "north bend": { region: "washington", countyId: "king" },
  "carnation": { region: "washington", countyId: "king" },
  "skykomish": { region: "washington", countyId: "king" },
  "tukwila": { region: "washington", countyId: "king" },
  "seatac": { region: "washington", countyId: "king" },
  "sea-tac": { region: "washington", countyId: "king" },
  "des moines": { region: "washington", countyId: "king" },
  "normandy park": { region: "washington", countyId: "king" },
  "algona": { region: "washington", countyId: "king" },
  "pacific": { region: "washington", countyId: "king" },
  "milton": { region: "washington", countyId: "king" },
  // Pierce County, WA (Tacoma-Pierce County Health Department via Accela)
  "tacoma": { region: "washington", countyId: "pierce", locationLabel: "Tacoma, WA" },
  "pierce county": { region: "washington", countyId: "pierce", locationLabel: "Pierce County, WA" },
  "puyallup": { region: "washington", countyId: "pierce", locationLabel: "Puyallup, WA" },
  "lakewood wa": { region: "washington", countyId: "pierce", locationLabel: "Lakewood, WA" },
  "university place": { region: "washington", countyId: "pierce", locationLabel: "University Place, WA" },
  "fircrest": { region: "washington", countyId: "pierce", locationLabel: "Fircrest, WA" },
  "parkland wa": { region: "washington", countyId: "pierce", locationLabel: "Parkland, WA" },
  "spanaway": { region: "washington", countyId: "pierce", locationLabel: "Spanaway, WA" },
  "sumner": { region: "washington", countyId: "pierce", locationLabel: "Sumner, WA" },
  "bonney lake": { region: "washington", countyId: "pierce", locationLabel: "Bonney Lake, WA" },
  "gig harbor": { region: "washington", countyId: "pierce", locationLabel: "Gig Harbor, WA" },
  "dupont wa": { region: "washington", countyId: "pierce", locationLabel: "DuPont, WA" },
  "steilacoom": { region: "washington", countyId: "pierce", locationLabel: "Steilacoom, WA" },
  "edgewood wa": { region: "washington", countyId: "pierce", locationLabel: "Edgewood, WA" },
  "orting": { region: "washington", countyId: "pierce", locationLabel: "Orting, WA" },
  "eatonville": { region: "washington", countyId: "pierce", locationLabel: "Eatonville, WA" },
  "roy wa": { region: "washington", countyId: "pierce", locationLabel: "Roy, WA" },
  "medina": { region: "washington", countyId: "king" },
  "clyde hill": { region: "washington", countyId: "king" },
  "yarrow point": { region: "washington", countyId: "king" },
  "hunts point": { region: "washington", countyId: "king" },
  "beaux arts": { region: "washington", countyId: "king" },
  "lake forest park": { region: "washington", countyId: "king" },
  "kenmore": { region: "washington", countyId: "king" },
  "woodinville": { region: "washington", countyId: "king" },
  "capitol hill": { region: "washington", countyId: "king" },
  "ballard": { region: "washington", countyId: "king" },
  "fremont": { region: "washington", countyId: "king" },
  "queen anne": { region: "washington", countyId: "king" },
  "south lake union": { region: "washington", countyId: "king" },
  "pioneer square": { region: "washington", countyId: "king" },
  "chinatown": { region: "washington", countyId: "king" },
  "international district": { region: "washington", countyId: "king" },
  "belltown": { region: "washington", countyId: "king" },
  "west seattle": { region: "washington", countyId: "king" },
  "columbia city": { region: "washington", countyId: "king" },
  "rainier valley": { region: "washington", countyId: "king" },
  "u district": { region: "washington", countyId: "king" },
  "university district": { region: "washington", countyId: "king" },
  "greenwood": { region: "washington", countyId: "king" },
  "phinney ridge": { region: "washington", countyId: "king" },
  "wallingford": { region: "washington", countyId: "king" },
  "eastlake": { region: "washington", countyId: "king" },
  "madison park": { region: "washington", countyId: "king" },
  "montlake": { region: "washington", countyId: "king" },
  "madrona": { region: "washington", countyId: "king" },
  "beacon hill": { region: "washington", countyId: "king" },
  "georgetown": { region: "washington", countyId: "king" },
  "sodo": { region: "washington", countyId: "king" },
  "interbay": { region: "washington", countyId: "king" },
  "magnolia": { region: "washington", countyId: "king" },
  "crown hill": { region: "washington", countyId: "king" },
  "bitter lake": { region: "washington", countyId: "king" },
  "northgate": { region: "washington", countyId: "king" },
  "lake city": { region: "washington", countyId: "king" },
  "wedgwood": { region: "washington", countyId: "king" },
  "ravenna": { region: "washington", countyId: "king" },
  "bryant": { region: "washington", countyId: "king" },
  "sand point": { region: "washington", countyId: "king" },
  "maple leaf": { region: "washington", countyId: "king" },
  "victory heights": { region: "washington", countyId: "king" },
  "pinehurst": { region: "washington", countyId: "king" },
  "cedar park": { region: "washington", countyId: "king" },
  "olympic hills": { region: "washington", countyId: "king" },
  "haller lake": { region: "washington", countyId: "king" },
  "licton springs": { region: "washington", countyId: "king" },
  "green lake": { region: "washington", countyId: "king" },
  "tangletown": { region: "washington", countyId: "king" },
  "phinney": { region: "washington", countyId: "king" },
  "hawthorne hills": { region: "washington", countyId: "king" },
  "laurelhurst": { region: "washington", countyId: "king" },
  "leschi": { region: "washington", countyId: "king" },
  "mt baker": { region: "washington", countyId: "king" },
  "mount baker": { region: "washington", countyId: "king" },
  "seward park": { region: "washington", countyId: "king" },
  "hillman city": { region: "washington", countyId: "king" },
  "brighton": { region: "washington", countyId: "king" },
  "dunlap": { region: "washington", countyId: "king" },
  "skyway": { region: "washington", countyId: "king" },
  "delridge": { region: "washington", countyId: "king" },
  "highland park": { region: "washington", countyId: "king" },
  "riverview": { region: "washington", countyId: "king" },
  "south park": { region: "washington", countyId: "king" },
  "fauntleroy": { region: "washington", countyId: "king" },
  "admiral": { region: "washington", countyId: "king" },
  "alki": { region: "washington", countyId: "king" },
  "junction": { region: "washington", countyId: "king" },
  "white center": { region: "washington", countyId: "king" },
  "arbor heights": { region: "washington", countyId: "king" },
  // NYC
  "new york": { region: "new_york", countyId: "nyc" },
  "new york city": { region: "new_york", countyId: "nyc" },
  "nyc": { region: "new_york", countyId: "nyc" },
  "manhattan": { region: "new_york", countyId: "nyc" },
  "brooklyn": { region: "new_york", countyId: "nyc" },
  "queens": { region: "new_york", countyId: "nyc" },
  "bronx": { region: "new_york", countyId: "nyc" },
  "the bronx": { region: "new_york", countyId: "nyc" },
  "staten island": { region: "new_york", countyId: "nyc" },
  "harlem": { region: "new_york", countyId: "nyc" },
  "upper east side": { region: "new_york", countyId: "nyc" },
  "upper west side": { region: "new_york", countyId: "nyc" },
  "midtown": { region: "new_york", countyId: "nyc" },
  "chelsea": { region: "new_york", countyId: "nyc" },
  "hell's kitchen": { region: "new_york", countyId: "nyc" },
  "hells kitchen": { region: "new_york", countyId: "nyc" },
  "lower east side": { region: "new_york", countyId: "nyc" },
  "east village": { region: "new_york", countyId: "nyc" },
  "west village": { region: "new_york", countyId: "nyc" },
  "greenwich village": { region: "new_york", countyId: "nyc" },
  "soho": { region: "new_york", countyId: "nyc" },
  "tribeca": { region: "new_york", countyId: "nyc" },
  "financial district": { region: "new_york", countyId: "nyc" },
  "little italy": { region: "new_york", countyId: "nyc" },
  "nolita": { region: "new_york", countyId: "nyc" },
  "noho": { region: "new_york", countyId: "nyc" },
  "gramercy": { region: "new_york", countyId: "nyc" },
  "flatiron": { region: "new_york", countyId: "nyc" },
  "murray hill": { region: "new_york", countyId: "nyc" },
  "kips bay": { region: "new_york", countyId: "nyc" },
  "inwood": { region: "new_york", countyId: "nyc" },
  "washington heights": { region: "new_york", countyId: "nyc" },
  "morningside heights": { region: "new_york", countyId: "nyc" },
  "hamilton heights": { region: "new_york", countyId: "nyc" },
  "williamsburg": { region: "new_york", countyId: "nyc" },
  "bushwick": { region: "new_york", countyId: "nyc" },
  "bed stuy": { region: "new_york", countyId: "nyc" },
  "bedford stuyvesant": { region: "new_york", countyId: "nyc" },
  "park slope": { region: "new_york", countyId: "nyc" },
  "crown heights": { region: "new_york", countyId: "nyc" },
  "flatbush": { region: "new_york", countyId: "nyc" },
  "borough park": { region: "new_york", countyId: "nyc" },
  "sunset park": { region: "new_york", countyId: "nyc" },
  "bay ridge": { region: "new_york", countyId: "nyc" },
  "bensonhurst": { region: "new_york", countyId: "nyc" },
  "coney island": { region: "new_york", countyId: "nyc" },
  "brighton beach": { region: "new_york", countyId: "nyc" },
  "dumbo": { region: "new_york", countyId: "nyc" },
  "boerum hill": { region: "new_york", countyId: "nyc" },
  "cobble hill": { region: "new_york", countyId: "nyc" },
  "carroll gardens": { region: "new_york", countyId: "nyc" },
  "red hook": { region: "new_york", countyId: "nyc" },
  "greenpoint": { region: "new_york", countyId: "nyc" },
  "astoria": { region: "new_york", countyId: "nyc" },
  "flushing": { region: "new_york", countyId: "nyc" },
  "jackson heights": { region: "new_york", countyId: "nyc" },
  "jamaica": { region: "new_york", countyId: "nyc" },
  "long island city": { region: "new_york", countyId: "nyc" },
  "forest hills": { region: "new_york", countyId: "nyc" },
  "ridgewood": { region: "new_york", countyId: "nyc" },
  "bayside": { region: "new_york", countyId: "nyc" },
  "howard beach": { region: "new_york", countyId: "nyc" },
  "rego park": { region: "new_york", countyId: "nyc" },
  // Chicago / Cook County
  "chicago": { region: "illinois", countyId: "cook" },
  "cook county": { region: "illinois", countyId: "cook" },
  "evanston": { region: "illinois", countyId: "cook" },
  "skokie": { region: "illinois", countyId: "cook" },
  "oak park": { region: "illinois", countyId: "cook" },
  "berwyn": { region: "illinois", countyId: "cook" },
  "cicero": { region: "illinois", countyId: "cook" },
  "des plaines": { region: "illinois", countyId: "cook" },
  "elk grove village": { region: "illinois", countyId: "cook" },
  "schaumburg": { region: "illinois", countyId: "cook" },
  "palatine": { region: "illinois", countyId: "cook" },
  "arlington heights": { region: "illinois", countyId: "cook" },
  "mount prospect": { region: "illinois", countyId: "cook" },
  "niles": { region: "illinois", countyId: "cook" },
  "park ridge": { region: "illinois", countyId: "cook" },
  "rosemont": { region: "illinois", countyId: "cook" },
  "northbrook": { region: "illinois", countyId: "cook" },
  "glenview": { region: "illinois", countyId: "cook" },
  "wilmette": { region: "illinois", countyId: "cook" },
  "harvey": { region: "illinois", countyId: "cook" },
  "oak lawn": { region: "illinois", countyId: "cook" },
  "evergreen park": { region: "illinois", countyId: "cook" },
  "blue island": { region: "illinois", countyId: "cook" },
  "orland park": { region: "illinois", countyId: "cook" },
  "tinley park": { region: "illinois", countyId: "cook" },
  "maywood il": { region: "illinois", countyId: "cook" },
  "melrose park": { region: "illinois", countyId: "cook" },
  "forest park": { region: "illinois", countyId: "cook" },
  "river forest": { region: "illinois", countyId: "cook" },
  "calumet city": { region: "illinois", countyId: "cook" },
  "wicker park": { region: "illinois", countyId: "cook" },
  "logan square": { region: "illinois", countyId: "cook" },
  "bucktown": { region: "illinois", countyId: "cook" },
  "pilsen": { region: "illinois", countyId: "cook" },
  "wrigleyville": { region: "illinois", countyId: "cook" },
  "lincoln park": { region: "illinois", countyId: "cook" },
  "lakeview": { region: "illinois", countyId: "cook" },
  "andersonville": { region: "illinois", countyId: "cook" },
  "rogers park": { region: "illinois", countyId: "cook" },
  "hyde park": { region: "illinois", countyId: "cook" },
  "bronzeville": { region: "illinois", countyId: "cook" },
  "bridgeport": { region: "illinois", countyId: "cook" },
  "river north": { region: "illinois", countyId: "cook" },
  "gold coast": { region: "illinois", countyId: "cook" },
  "streeterville": { region: "illinois", countyId: "cook" },
  "south loop": { region: "illinois", countyId: "cook" },
  "west loop": { region: "illinois", countyId: "cook" },
  "greektown": { region: "illinois", countyId: "cook" },
  "avondale": { region: "illinois", countyId: "cook" },
  "portage park": { region: "illinois", countyId: "cook" },
  "irving park": { region: "illinois", countyId: "cook" },
  "jefferson park": { region: "illinois", countyId: "cook" },
  "edgewater": { region: "illinois", countyId: "cook" },
  "uptown": { region: "illinois", countyId: "cook" },
  "ravenswood": { region: "illinois", countyId: "cook" },
  "lincoln square": { region: "illinois", countyId: "cook" },
  // Austin / Travis County
  "austin": { region: "texas", countyId: "travis" },
  "travis county": { region: "texas", countyId: "travis" },
  "pflugerville": { region: "texas", countyId: "travis" },
  "manor": { region: "texas", countyId: "travis" },
  "lago vista": { region: "texas", countyId: "travis" },
  "rollingwood": { region: "texas", countyId: "travis" },
  "west lake hills": { region: "texas", countyId: "travis" },
  "bee cave": { region: "texas", countyId: "travis" },
  "lakeway": { region: "texas", countyId: "travis" },
  "spicewood": { region: "texas", countyId: "travis" },
  "south congress": { region: "texas", countyId: "travis" },
  "east austin": { region: "texas", countyId: "travis" },
  "zilker": { region: "texas", countyId: "travis" },
  "bouldin creek": { region: "texas", countyId: "travis" },
  "travis heights": { region: "texas", countyId: "travis" },
  "clarksville": { region: "texas", countyId: "travis" },
  "mueller": { region: "texas", countyId: "travis" },
  "cherrywood": { region: "texas", countyId: "travis" },
  "crestview": { region: "texas", countyId: "travis" },
  "allandale": { region: "texas", countyId: "travis" },
  "rosedale": { region: "texas", countyId: "travis" },
  "tarrytown": { region: "texas", countyId: "travis" },
  "north loop austin": { region: "texas", countyId: "travis" },
  // Houston
  "houston": { region: "texas", countyId: "houston" },
  "downtown houston": { region: "texas", countyId: "houston" },
  "montrose": { region: "texas", countyId: "houston" },
  "the heights": { region: "texas", countyId: "houston" },
  "midtown houston": { region: "texas", countyId: "houston" },
  "galleria houston": { region: "texas", countyId: "houston" },
  "river oaks": { region: "texas", countyId: "houston" },
  "medical center houston": { region: "texas", countyId: "houston" },
  "memorial houston": { region: "texas", countyId: "houston" },
  "katy": { region: "texas", countyId: "houston" },
  "pearland": { region: "texas", countyId: "houston" },
  "sugar land": { region: "texas", countyId: "houston" },
  "pasadena tx": { region: "texas", countyId: "houston" },
  "baytown": { region: "texas", countyId: "houston" },
  // San Francisco
  "san francisco": { region: "california", countyId: "sf" },
  "sf": { region: "california", countyId: "sf" },
  "mission district": { region: "california", countyId: "sf" },
  "the mission": { region: "california", countyId: "sf" },
  "castro": { region: "california", countyId: "sf" },
  "haight ashbury": { region: "california", countyId: "sf" },
  "haight-ashbury": { region: "california", countyId: "sf" },
  "tenderloin": { region: "california", countyId: "sf" },
  "soma": { region: "california", countyId: "sf" },
  "south of market": { region: "california", countyId: "sf" },
  "north beach": { region: "california", countyId: "sf" },
  "fishermans wharf": { region: "california", countyId: "sf" },
  "nob hill": { region: "california", countyId: "sf" },
  "russian hill": { region: "california", countyId: "sf" },
  "pacific heights": { region: "california", countyId: "sf" },
  "marina district": { region: "california", countyId: "sf" },
  "cow hollow": { region: "california", countyId: "sf" },
  "richmond district": { region: "california", countyId: "sf" },
  "inner richmond": { region: "california", countyId: "sf" },
  "outer richmond": { region: "california", countyId: "sf" },
  "sunset district": { region: "california", countyId: "sf" },
  "inner sunset": { region: "california", countyId: "sf" },
  "outer sunset": { region: "california", countyId: "sf" },
  "excelsior": { region: "california", countyId: "sf" },
  "bernal heights": { region: "california", countyId: "sf" },
  "potrero hill": { region: "california", countyId: "sf" },
  "dogpatch": { region: "california", countyId: "sf" },
  "bayview": { region: "california", countyId: "sf" },
  "hunters point": { region: "california", countyId: "sf" },
  "visitacion valley": { region: "california", countyId: "sf" },
  "glen park": { region: "california", countyId: "sf" },
  "noe valley": { region: "california", countyId: "sf" },
  "hayes valley": { region: "california", countyId: "sf" },
  "western addition": { region: "california", countyId: "sf" },
  "fillmore": { region: "california", countyId: "sf" },
  "japantown": { region: "california", countyId: "sf" },
  "lower haight": { region: "california", countyId: "sf" },
  "upper haight": { region: "california", countyId: "sf" },
  "alamo square": { region: "california", countyId: "sf" },
  "twin peaks": { region: "california", countyId: "sf" },
  "west portal": { region: "california", countyId: "sf" },
  "miraloma park": { region: "california", countyId: "sf" },
  "duboce triangle": { region: "california", countyId: "sf" },
  "forest hill sf": { region: "california", countyId: "sf" },
  // Los Angeles County
  "los angeles": { region: "california", countyId: "la" },
  "la": { region: "california", countyId: "la" },
  "hollywood": { region: "california", countyId: "la" },
  "santa monica": { region: "california", countyId: "la" },
  "long beach": { region: "california", countyId: "la" },
  "pasadena": { region: "california", countyId: "la" },
  "burbank": { region: "california", countyId: "la" },
  "glendale": { region: "california", countyId: "la" },
  "compton": { region: "california", countyId: "la" },
  "inglewood": { region: "california", countyId: "la" },
  "torrance": { region: "california", countyId: "la" },
  "hawthorne": { region: "california", countyId: "la" },
  "el monte": { region: "california", countyId: "la" },
  "pomona": { region: "california", countyId: "la" },
  "west covina": { region: "california", countyId: "la" },
  "downey": { region: "california", countyId: "la" },
  "norwalk": { region: "california", countyId: "la" },
  "whittier": { region: "california", countyId: "la" },
  "carson": { region: "california", countyId: "la" },
  "lakewood": { region: "california", countyId: "la" },
  "west hollywood": { region: "california", countyId: "la" },
  "beverly hills": { region: "california", countyId: "la" },
  "culver city": { region: "california", countyId: "la" },
  "el segundo": { region: "california", countyId: "la" },
  "manhattan beach": { region: "california", countyId: "la" },
  "hermosa beach": { region: "california", countyId: "la" },
  "redondo beach": { region: "california", countyId: "la" },
  "gardena": { region: "california", countyId: "la" },
  "lawndale": { region: "california", countyId: "la" },
  "lynwood": { region: "california", countyId: "la" },
  "south gate": { region: "california", countyId: "la" },
  "bell": { region: "california", countyId: "la" },
  "huntington park": { region: "california", countyId: "la" },
  "maywood": { region: "california", countyId: "la" },
  "bell gardens": { region: "california", countyId: "la" },
  "cudahy": { region: "california", countyId: "la" },
  "pico rivera": { region: "california", countyId: "la" },
  "montebello": { region: "california", countyId: "la" },
  "commerce": { region: "california", countyId: "la" },
  "vernon": { region: "california", countyId: "la" },
  "san gabriel": { region: "california", countyId: "la" },
  "alhambra": { region: "california", countyId: "la" },
  "temple city": { region: "california", countyId: "la" },
  "rosemead": { region: "california", countyId: "la" },
  "monterey park": { region: "california", countyId: "la" },
  "san marino": { region: "california", countyId: "la" },
  "arcadia": { region: "california", countyId: "la" },
  "monrovia": { region: "california", countyId: "la" },
  "duarte": { region: "california", countyId: "la" },
  "azusa": { region: "california", countyId: "la" },
  "covina": { region: "california", countyId: "la" },
  "glendora": { region: "california", countyId: "la" },
  "san dimas": { region: "california", countyId: "la" },
  "la verne": { region: "california", countyId: "la" },
  "claremont": { region: "california", countyId: "la" },
  "montclair": { region: "california", countyId: "la" },
  "diamond bar": { region: "california", countyId: "la" },
  "walnut": { region: "california", countyId: "la" },
  "rowland heights": { region: "california", countyId: "la" },
  "hacienda heights": { region: "california", countyId: "la" },
  "la puente": { region: "california", countyId: "la" },
  "industry": { region: "california", countyId: "la" },
  "baldwin park": { region: "california", countyId: "la" },
  "irwindale": { region: "california", countyId: "la" },
  "southgate": { region: "california", countyId: "la" },
  "cerritos": { region: "california", countyId: "la" },
  "artesia": { region: "california", countyId: "la" },
  "bellflower": { region: "california", countyId: "la" },
  "paramount": { region: "california", countyId: "la" },
  "signal hill": { region: "california", countyId: "la" },
  "los alamitos": { region: "california", countyId: "la" },
  "calabasas": { region: "california", countyId: "la" },
  "hidden hills": { region: "california", countyId: "la" },
  "agoura hills": { region: "california", countyId: "la" },
  "westlake village": { region: "california", countyId: "la" },
  "thousand oaks": { region: "california", countyId: "la" },
  "malibu": { region: "california", countyId: "la" },
  "san fernando": { region: "california", countyId: "la" },
  "sylmar": { region: "california", countyId: "la" },
  "pacoima": { region: "california", countyId: "la" },
  "sun valley": { region: "california", countyId: "la" },
  "north hollywood": { region: "california", countyId: "la" },
  "studio city": { region: "california", countyId: "la" },
  "sherman oaks": { region: "california", countyId: "la" },
  "van nuys": { region: "california", countyId: "la" },
  "reseda": { region: "california", countyId: "la" },
  "canoga park": { region: "california", countyId: "la" },
  "chatsworth": { region: "california", countyId: "la" },
  "northridge": { region: "california", countyId: "la" },
  "granada hills": { region: "california", countyId: "la" },
  "porter ranch": { region: "california", countyId: "la" },
  "encino": { region: "california", countyId: "la" },
  "tarzana": { region: "california", countyId: "la" },
  "woodland hills": { region: "california", countyId: "la" },
  "west hills": { region: "california", countyId: "la" },
  "winnetka": { region: "california", countyId: "la" },
  "east los angeles": { region: "california", countyId: "la" },
  "east la": { region: "california", countyId: "la" },
  "koreatown": { region: "california", countyId: "la" },
  "silver lake": { region: "california", countyId: "la" },
  "echo park": { region: "california", countyId: "la" },
  "los feliz": { region: "california", countyId: "la" },
  "atwater village": { region: "california", countyId: "la" },
  "glassell park": { region: "california", countyId: "la" },
  "highland park la": { region: "california", countyId: "la" },
  "eagle rock": { region: "california", countyId: "la" },
  "boyle heights": { region: "california", countyId: "la" },
  "downtown la": { region: "california", countyId: "la" },
  "dtla": { region: "california", countyId: "la" },
  "little tokyo": { region: "california", countyId: "la" },
  "chinatown la": { region: "california", countyId: "la" },
  "arts district": { region: "california", countyId: "la" },
  "venice": { region: "california", countyId: "la" },
  "mar vista": { region: "california", countyId: "la" },
  "westwood": { region: "california", countyId: "la" },
  "brentwood": { region: "california", countyId: "la" },
  "pacific palisades": { region: "california", countyId: "la" },
  "playa del rey": { region: "california", countyId: "la" },
  "westchester": { region: "california", countyId: "la" },
  "ladera heights": { region: "california", countyId: "la" },
  "view park": { region: "california", countyId: "la" },
  "leimert park": { region: "california", countyId: "la" },
  "crenshaw": { region: "california", countyId: "la" },
  "mid city": { region: "california", countyId: "la" },
  "palms": { region: "california", countyId: "la" },
  "sawtelle": { region: "california", countyId: "la" },
  "century city": { region: "california", countyId: "la" },
  // Boston
  "boston": { region: "massachusetts", countyId: "boston" },
  "allston": { region: "massachusetts", countyId: "boston" },
  "back bay": { region: "massachusetts", countyId: "boston" },
  "fenway boston": { region: "massachusetts", countyId: "boston" },
  "jamaica plain": { region: "massachusetts", countyId: "boston" },
  "dorchester": { region: "massachusetts", countyId: "boston" },
  "roxbury": { region: "massachusetts", countyId: "boston" },
  "south boston": { region: "massachusetts", countyId: "boston" },
  "east boston": { region: "massachusetts", countyId: "boston" },
  "north end boston": { region: "massachusetts", countyId: "boston" },
  "beacon hill": { region: "massachusetts", countyId: "boston" },
  // Canada
  "canada": { region: "canada", countyId: "toronto", locationLabel: "Canada" },
  "canadian": { region: "canada", countyId: "toronto", locationLabel: "Canada" },
  "ontario": { region: "canada", countyId: "toronto", locationLabel: "Ontario, Canada" },
  "toronto": { region: "canada", countyId: "toronto", locationLabel: "Toronto, Ontario, Canada" },
  "ottawa": { region: "canada", countyId: "ottawa", locationLabel: "Ottawa, Ontario, Canada" },
  "hamilton ontario": { region: "canada", countyId: "hamilton_on", locationLabel: "Hamilton, Ontario, Canada" },
  "mississauga": { region: "canada", countyId: "mississauga", locationLabel: "Mississauga, Ontario, Canada" },
  "brampton": { region: "canada", countyId: "brampton", locationLabel: "Brampton, Ontario, Canada" },
  "london ontario": { region: "canada", countyId: "london_on", locationLabel: "London, Ontario, Canada" },
  "kitchener": { region: "canada", countyId: "kitchener", locationLabel: "Kitchener, Ontario, Canada" },
  "waterloo ontario": { region: "canada", countyId: "kitchener", locationLabel: "Waterloo, Ontario, Canada" },
  "guelph": { region: "canada", countyId: "kitchener", locationLabel: "Guelph, Ontario, Canada" },
  "windsor ontario": { region: "canada", countyId: "toronto", locationLabel: "Windsor, Ontario, Canada" },
  "barrie": { region: "canada", countyId: "toronto", locationLabel: "Barrie, Ontario, Canada" },
  "british columbia": { region: "canada", countyId: "vancouver", locationLabel: "British Columbia, Canada" },
  "bc": { region: "canada", countyId: "vancouver", locationLabel: "British Columbia, Canada" },
  "vancouver": { region: "canada", countyId: "vancouver", locationLabel: "Vancouver, British Columbia, Canada" },
  "surrey bc": { region: "canada", countyId: "surrey", locationLabel: "Surrey, British Columbia, Canada" },
  "burnaby": { region: "canada", countyId: "burnaby", locationLabel: "Burnaby, British Columbia, Canada" },
  "richmond bc": { region: "canada", countyId: "richmond_bc", locationLabel: "Richmond, British Columbia, Canada" },
  "victoria bc": { region: "canada", countyId: "victoria_bc", locationLabel: "Victoria, British Columbia, Canada" },
  "victoria british columbia": { region: "canada", countyId: "victoria_bc", locationLabel: "Victoria, British Columbia, Canada" },
  "kelowna": { region: "canada", countyId: "kelowna", locationLabel: "Kelowna, British Columbia, Canada" },
  "abbotsford": { region: "canada", countyId: "vancouver", locationLabel: "Abbotsford, British Columbia, Canada" },
  "langley": { region: "canada", countyId: "vancouver", locationLabel: "Langley, British Columbia, Canada" },
  "north vancouver": { region: "canada", countyId: "vancouver", locationLabel: "North Vancouver, British Columbia, Canada" },
  "west vancouver": { region: "canada", countyId: "vancouver", locationLabel: "West Vancouver, British Columbia, Canada" },
  "coquitlam": { region: "canada", countyId: "burnaby", locationLabel: "Coquitlam, British Columbia, Canada" },
  "delta bc": { region: "canada", countyId: "surrey", locationLabel: "Delta, British Columbia, Canada" },
  "new westminster": { region: "canada", countyId: "burnaby", locationLabel: "New Westminster, British Columbia, Canada" },
  "nanaimo": { region: "canada", countyId: "victoria_bc", locationLabel: "Nanaimo, British Columbia, Canada" },
  "kamloops": { region: "canada", countyId: "kelowna", locationLabel: "Kamloops, British Columbia, Canada" },
  "prince george bc": { region: "canada", countyId: "kelowna", locationLabel: "Prince George, British Columbia, Canada" },
  "quebec": { region: "canada", countyId: "montreal", locationLabel: "Québec, Canada" },
  "québec": { region: "canada", countyId: "montreal", locationLabel: "Québec, Canada" },
  "montreal": { region: "canada", countyId: "montreal", locationLabel: "Montréal, Québec, Canada" },
  "montréal": { region: "canada", countyId: "montreal", locationLabel: "Montréal, Québec, Canada" },
  "quebec city": { region: "canada", countyId: "quebec_city", locationLabel: "Québec City, Québec, Canada" },
  "québec city": { region: "canada", countyId: "quebec_city", locationLabel: "Québec City, Québec, Canada" },
  "laval": { region: "canada", countyId: "laval", locationLabel: "Laval, Québec, Canada" },
  "gatineau": { region: "canada", countyId: "gatineau", locationLabel: "Gatineau, Québec, Canada" },
  "longueuil": { region: "canada", countyId: "montreal", locationLabel: "Longueuil, Québec, Canada" },
  "sherbrooke": { region: "canada", countyId: "quebec_city", locationLabel: "Sherbrooke, Québec, Canada" },
  "saguenay": { region: "canada", countyId: "quebec_city", locationLabel: "Saguenay, Québec, Canada" },
  "trois-rivieres": { region: "canada", countyId: "quebec_city", locationLabel: "Trois-Rivières, Québec, Canada" },
  "alberta": { region: "canada", countyId: "calgary", locationLabel: "Alberta, Canada" },
  "calgary": { region: "canada", countyId: "calgary", locationLabel: "Calgary, Alberta, Canada" },
  "edmonton": { region: "canada", countyId: "edmonton", locationLabel: "Edmonton, Alberta, Canada" },
  "red deer": { region: "canada", countyId: "red_deer", locationLabel: "Red Deer, Alberta, Canada" },
  "lethbridge": { region: "canada", countyId: "lethbridge", locationLabel: "Lethbridge, Alberta, Canada" },
  "medicine hat": { region: "canada", countyId: "lethbridge", locationLabel: "Medicine Hat, Alberta, Canada" },
  "fort mcmurray": { region: "canada", countyId: "edmonton", locationLabel: "Fort McMurray, Alberta, Canada" },
  "airdrie": { region: "canada", countyId: "calgary", locationLabel: "Airdrie, Alberta, Canada" },
  "grande prairie": { region: "canada", countyId: "edmonton", locationLabel: "Grande Prairie, Alberta, Canada" },
  "manitoba": { region: "canada", countyId: "winnipeg", locationLabel: "Manitoba, Canada" },
  "winnipeg": { region: "canada", countyId: "winnipeg", locationLabel: "Winnipeg, Manitoba, Canada" },
  "brandon mb": { region: "canada", countyId: "winnipeg", locationLabel: "Brandon, Manitoba, Canada" },
  "nova scotia": { region: "canada", countyId: "halifax", locationLabel: "Nova Scotia, Canada" },
  "halifax": { region: "canada", countyId: "halifax", locationLabel: "Halifax, Nova Scotia, Canada" },
  "saskatchewan": { region: "canada", countyId: "saskatoon", locationLabel: "Saskatchewan, Canada" },
  "saskatoon": { region: "canada", countyId: "saskatoon", locationLabel: "Saskatoon, Saskatchewan, Canada" },
  "regina": { region: "canada", countyId: "regina", locationLabel: "Regina, Saskatchewan, Canada" },
  "newfoundland": { region: "canada", countyId: "st_johns_nl", locationLabel: "Newfoundland, Canada" },
  "st. john's": { region: "canada", countyId: "st_johns_nl", locationLabel: "St. John's, Newfoundland, Canada" },
  "st johns": { region: "canada", countyId: "st_johns_nl", locationLabel: "St. John's, Newfoundland, Canada" },
  "new brunswick": { region: "canada", countyId: "moncton", locationLabel: "New Brunswick, Canada" },
  "moncton": { region: "canada", countyId: "moncton", locationLabel: "Moncton, New Brunswick, Canada" },
  "fredericton": { region: "canada", countyId: "moncton", locationLabel: "Fredericton, New Brunswick, Canada" },
  "saint john nb": { region: "canada", countyId: "moncton", locationLabel: "Saint John, New Brunswick, Canada" },
  "prince edward island": { region: "canada", countyId: "moncton", locationLabel: "Prince Edward Island, Canada" },
  "pei": { region: "canada", countyId: "moncton", locationLabel: "Prince Edward Island, Canada" },
  "charlottetown": { region: "canada", countyId: "moncton", locationLabel: "Charlottetown, Prince Edward Island, Canada" },
  // UAE / Dubai
  "dubai": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "uae": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "united arab emirates": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "abu dhabi": { region: "uae", countyId: "dubai", locationLabel: "Abu Dhabi, UAE" },
  "sharjah": { region: "uae", countyId: "dubai", locationLabel: "Sharjah, UAE" },
  "jbr": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "difc": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "downtown dubai": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "palm jumeirah": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "marina dubai": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "deira": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "bur dubai": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  "jumeirah": { region: "uae", countyId: "dubai", locationLabel: "Dubai, UAE" },
  // UK
  "uk": { region: "uk", countyId: "uk_fsa", locationLabel: "United Kingdom" },
  "united kingdom": { region: "uk", countyId: "uk_fsa", locationLabel: "United Kingdom" },
  "great britain": { region: "uk", countyId: "uk_fsa", locationLabel: "United Kingdom" },
  "britain": { region: "uk", countyId: "uk_fsa", locationLabel: "United Kingdom" },
  "england": { region: "uk", countyId: "uk_fsa", locationLabel: "England, UK" },
  "scotland": { region: "uk", countyId: "uk_fsa", locationLabel: "Scotland, UK" },
  "wales": { region: "uk", countyId: "uk_fsa", locationLabel: "Wales, UK" },
  "northern ireland": { region: "uk", countyId: "uk_fsa", locationLabel: "Northern Ireland, UK" },
  "london": { region: "uk", countyId: "uk_fsa", locationLabel: "London, England, UK" },
  "birmingham": { region: "uk", countyId: "uk_fsa", locationLabel: "Birmingham, England, UK" },
  "manchester": { region: "uk", countyId: "uk_fsa", locationLabel: "Manchester, England, UK" },
  "leeds": { region: "uk", countyId: "uk_fsa", locationLabel: "Leeds, England, UK" },
  "liverpool": { region: "uk", countyId: "uk_fsa", locationLabel: "Liverpool, England, UK" },
  "sheffield": { region: "uk", countyId: "uk_fsa", locationLabel: "Sheffield, England, UK" },
  "bristol": { region: "uk", countyId: "uk_fsa", locationLabel: "Bristol, England, UK" },
  "newcastle": { region: "uk", countyId: "uk_fsa", locationLabel: "Newcastle, England, UK" },
  "nottingham": { region: "uk", countyId: "uk_fsa", locationLabel: "Nottingham, England, UK" },
  "leicester": { region: "uk", countyId: "uk_fsa", locationLabel: "Leicester, England, UK" },
  "coventry": { region: "uk", countyId: "uk_fsa", locationLabel: "Coventry, England, UK" },
  "bradford": { region: "uk", countyId: "uk_fsa", locationLabel: "Bradford, England, UK" },
  "southampton": { region: "uk", countyId: "uk_fsa", locationLabel: "Southampton, England, UK" },
  "portsmouth": { region: "uk", countyId: "uk_fsa", locationLabel: "Portsmouth, England, UK" },
  "oxford": { region: "uk", countyId: "uk_fsa", locationLabel: "Oxford, England, UK" },
  "cambridge": { region: "uk", countyId: "uk_fsa", locationLabel: "Cambridge, England, UK" },
  "york": { region: "uk", countyId: "uk_fsa", locationLabel: "York, England, UK" },
  "bath": { region: "uk", countyId: "uk_fsa", locationLabel: "Bath, England, UK" },
  "exeter": { region: "uk", countyId: "uk_fsa", locationLabel: "Exeter, England, UK" },
  "norwich": { region: "uk", countyId: "uk_fsa", locationLabel: "Norwich, England, UK" },
  "derby": { region: "uk", countyId: "uk_fsa", locationLabel: "Derby, England, UK" },
  "stoke": { region: "uk", countyId: "uk_fsa", locationLabel: "Stoke-on-Trent, England, UK" },
  "stoke-on-trent": { region: "uk", countyId: "uk_fsa", locationLabel: "Stoke-on-Trent, England, UK" },
  "wolverhampton": { region: "uk", countyId: "uk_fsa", locationLabel: "Wolverhampton, England, UK" },
  "hull": { region: "uk", countyId: "uk_fsa", locationLabel: "Hull, England, UK" },
  "kingston upon hull": { region: "uk", countyId: "uk_fsa", locationLabel: "Hull, England, UK" },
  "middlesbrough": { region: "uk", countyId: "uk_fsa", locationLabel: "Middlesbrough, England, UK" },
  "sunderland": { region: "uk", countyId: "uk_fsa", locationLabel: "Sunderland, England, UK" },
  "reading": { region: "uk", countyId: "uk_fsa", locationLabel: "Reading, England, UK" },
  "blackpool": { region: "uk", countyId: "uk_fsa", locationLabel: "Blackpool, England, UK" },
  "bolton": { region: "uk", countyId: "uk_fsa", locationLabel: "Bolton, England, UK" },
  "salford": { region: "uk", countyId: "uk_fsa", locationLabel: "Salford, England, UK" },
  "wigan": { region: "uk", countyId: "uk_fsa", locationLabel: "Wigan, England, UK" },
  "stockport": { region: "uk", countyId: "uk_fsa", locationLabel: "Stockport, England, UK" },
  "oldham": { region: "uk", countyId: "uk_fsa", locationLabel: "Oldham, England, UK" },
  "ipswich": { region: "uk", countyId: "uk_fsa", locationLabel: "Ipswich, England, UK" },
  "peterborough": { region: "uk", countyId: "uk_fsa", locationLabel: "Peterborough, England, UK" },
  "luton": { region: "uk", countyId: "uk_fsa", locationLabel: "Luton, England, UK" },
  "milton keynes": { region: "uk", countyId: "uk_fsa", locationLabel: "Milton Keynes, England, UK" },
  "watford": { region: "uk", countyId: "uk_fsa", locationLabel: "Watford, England, UK" },
  "gloucester": { region: "uk", countyId: "uk_fsa", locationLabel: "Gloucester, England, UK" },
  "cheltenham": { region: "uk", countyId: "uk_fsa", locationLabel: "Cheltenham, England, UK" },
  "worcester": { region: "uk", countyId: "uk_fsa", locationLabel: "Worcester, England, UK" },
  "lincoln": { region: "uk", countyId: "uk_fsa", locationLabel: "Lincoln, England, UK" },
  "chester": { region: "uk", countyId: "uk_fsa", locationLabel: "Chester, England, UK" },
  "canterbury": { region: "uk", countyId: "uk_fsa", locationLabel: "Canterbury, England, UK" },
  "winchester": { region: "uk", countyId: "uk_fsa", locationLabel: "Winchester, England, UK" },
  "salisbury": { region: "uk", countyId: "uk_fsa", locationLabel: "Salisbury, England, UK" },
  "guildford": { region: "uk", countyId: "uk_fsa", locationLabel: "Guildford, England, UK" },
  "surrey": { region: "uk", countyId: "uk_fsa", locationLabel: "Surrey, England, UK" },
  "kent england": { region: "uk", countyId: "uk_fsa", locationLabel: "Kent, England, UK" },
  "kent uk": { region: "uk", countyId: "uk_fsa", locationLabel: "Kent, England, UK" },
  "essex": { region: "uk", countyId: "uk_fsa", locationLabel: "Essex, England, UK" },
  "hertfordshire": { region: "uk", countyId: "uk_fsa", locationLabel: "Hertfordshire, England, UK" },
  "west yorkshire": { region: "uk", countyId: "uk_fsa", locationLabel: "West Yorkshire, England, UK" },
  "south yorkshire": { region: "uk", countyId: "uk_fsa", locationLabel: "South Yorkshire, England, UK" },
  "lancashire": { region: "uk", countyId: "uk_fsa", locationLabel: "Lancashire, England, UK" },
  "cornwall": { region: "uk", countyId: "uk_fsa", locationLabel: "Cornwall, England, UK" },
  "devon": { region: "uk", countyId: "uk_fsa", locationLabel: "Devon, England, UK" },
  "suffolk": { region: "uk", countyId: "uk_fsa", locationLabel: "Suffolk, England, UK" },
  "norfolk": { region: "uk", countyId: "uk_fsa", locationLabel: "Norfolk, England, UK" },
  "westminster": { region: "uk", countyId: "uk_fsa", locationLabel: "Westminster, London, UK" },
  "shoreditch": { region: "uk", countyId: "uk_fsa", locationLabel: "Shoreditch, London, UK" },
  "soho london": { region: "uk", countyId: "uk_fsa", locationLabel: "Soho, London, UK" },
  "canary wharf": { region: "uk", countyId: "uk_fsa", locationLabel: "Canary Wharf, London, UK" },
  "covent garden": { region: "uk", countyId: "uk_fsa", locationLabel: "Covent Garden, London, UK" },
  "notting hill": { region: "uk", countyId: "uk_fsa", locationLabel: "Notting Hill, London, UK" },
  "camden": { region: "uk", countyId: "uk_fsa", locationLabel: "Camden, London, UK" },
  "islington": { region: "uk", countyId: "uk_fsa", locationLabel: "Islington, London, UK" },
  "hackney": { region: "uk", countyId: "uk_fsa", locationLabel: "Hackney, London, UK" },
  "brixton": { region: "uk", countyId: "uk_fsa", locationLabel: "Brixton, London, UK" },
  "peckham": { region: "uk", countyId: "uk_fsa", locationLabel: "Peckham, London, UK" },
  "greenwich": { region: "uk", countyId: "uk_fsa", locationLabel: "Greenwich, London, UK" },
  "croydon": { region: "uk", countyId: "uk_fsa", locationLabel: "Croydon, London, UK" },
  "wimbledon": { region: "uk", countyId: "uk_fsa", locationLabel: "Wimbledon, London, UK" },
  "richmond london": { region: "uk", countyId: "uk_fsa", locationLabel: "Richmond, London, UK" },
  "chelsea london": { region: "uk", countyId: "uk_fsa", locationLabel: "Chelsea, London, UK" },
  "kensington": { region: "uk", countyId: "uk_fsa", locationLabel: "Kensington, London, UK" },
  "hammersmith": { region: "uk", countyId: "uk_fsa", locationLabel: "Hammersmith, London, UK" },
  "ealing": { region: "uk", countyId: "uk_fsa", locationLabel: "Ealing, London, UK" },
  "stratford": { region: "uk", countyId: "uk_fsa", locationLabel: "Stratford, London, UK" },
  "edinburgh": { region: "uk", countyId: "uk_fsa", locationLabel: "Edinburgh, Scotland, UK" },
  "glasgow": { region: "uk", countyId: "uk_fsa", locationLabel: "Glasgow, Scotland, UK" },
  "aberdeen": { region: "uk", countyId: "uk_fsa", locationLabel: "Aberdeen, Scotland, UK" },
  "dundee": { region: "uk", countyId: "uk_fsa", locationLabel: "Dundee, Scotland, UK" },
  "inverness": { region: "uk", countyId: "uk_fsa", locationLabel: "Inverness, Scotland, UK" },
  "stirling": { region: "uk", countyId: "uk_fsa", locationLabel: "Stirling, Scotland, UK" },
  "st andrews": { region: "uk", countyId: "uk_fsa", locationLabel: "St Andrews, Scotland, UK" },
  "highlands": { region: "uk", countyId: "uk_fsa", locationLabel: "Highlands, Scotland, UK" },
  "cardiff": { region: "uk", countyId: "uk_fsa", locationLabel: "Cardiff, Wales, UK" },
  "swansea": { region: "uk", countyId: "uk_fsa", locationLabel: "Swansea, Wales, UK" },
  "newport wales": { region: "uk", countyId: "uk_fsa", locationLabel: "Newport, Wales, UK" },
  "wrexham": { region: "uk", countyId: "uk_fsa", locationLabel: "Wrexham, Wales, UK" },
  "belfast": { region: "uk", countyId: "uk_fsa", locationLabel: "Belfast, Northern Ireland, UK" },
  "derry": { region: "uk", countyId: "uk_fsa", locationLabel: "Derry, Northern Ireland, UK" },
  "londonderry": { region: "uk", countyId: "uk_fsa", locationLabel: "Derry, Northern Ireland, UK" },
  // Stanislaus County, CA
  "modesto": { region: "california", countyId: "stanislaus", locationLabel: "Modesto, CA" },
  "turlock": { region: "california", countyId: "stanislaus", locationLabel: "Turlock, CA" },
  "ceres": { region: "california", countyId: "stanislaus", locationLabel: "Ceres, CA" },
  "riverbank": { region: "california", countyId: "stanislaus", locationLabel: "Riverbank, CA" },
  "oakdale": { region: "california", countyId: "stanislaus", locationLabel: "Oakdale, CA" },
  "patterson ca": { region: "california", countyId: "stanislaus", locationLabel: "Patterson, CA" },
  "newman ca": { region: "california", countyId: "stanislaus", locationLabel: "Newman, CA" },
  "stanislaus county": { region: "california", countyId: "stanislaus", locationLabel: "Stanislaus County, CA" },
  // Montgomery County MD
  "rockville": { region: "maryland", countyId: "montgomery_md" },
  "bethesda": { region: "maryland", countyId: "montgomery_md" },
  "silver spring": { region: "maryland", countyId: "montgomery_md" },
  "gaithersburg": { region: "maryland", countyId: "montgomery_md" },
  "germantown": { region: "maryland", countyId: "montgomery_md" },
  "chevy chase": { region: "maryland", countyId: "montgomery_md" },
  "potomac": { region: "maryland", countyId: "montgomery_md" },
  "montgomery county": { region: "maryland", countyId: "montgomery_md" },
  "montgomery county md": { region: "maryland", countyId: "montgomery_md" },
  // Delaware
  "delaware": { region: "delaware", countyId: "delaware", locationLabel: "Delaware" },
  "wilmington": { region: "delaware", countyId: "delaware", locationLabel: "Wilmington, Delaware" },
  "dover": { region: "delaware", countyId: "delaware", locationLabel: "Dover, Delaware" },
  "newark de": { region: "delaware", countyId: "delaware", locationLabel: "Newark, Delaware" },
  "middletown de": { region: "delaware", countyId: "delaware", locationLabel: "Middletown, Delaware" },
  "rehoboth beach": { region: "delaware", countyId: "delaware", locationLabel: "Rehoboth Beach, Delaware" },
  "lewes": { region: "delaware", countyId: "delaware", locationLabel: "Lewes, Delaware" },
  "hockessin": { region: "delaware", countyId: "delaware", locationLabel: "Hockessin, Delaware" },
  "claymont": { region: "delaware", countyId: "delaware", locationLabel: "Claymont, Delaware" },
  // New York State (outside NYC)
  "buffalo": { region: "new_york", countyId: "ny_state", locationLabel: "Buffalo, New York" },
  "rochester ny": { region: "new_york", countyId: "ny_state", locationLabel: "Rochester, New York" },
  "rochester new york": { region: "new_york", countyId: "ny_state", locationLabel: "Rochester, New York" },
  "syracuse": { region: "new_york", countyId: "ny_state", locationLabel: "Syracuse, New York" },
  "albany": { region: "new_york", countyId: "ny_state", locationLabel: "Albany, New York" },
  "yonkers": { region: "new_york", countyId: "ny_state", locationLabel: "Yonkers, New York" },
  "new rochelle": { region: "new_york", countyId: "ny_state", locationLabel: "New Rochelle, New York" },
  "white plains": { region: "new_york", countyId: "ny_state", locationLabel: "White Plains, New York" },
  "utica": { region: "new_york", countyId: "ny_state", locationLabel: "Utica, New York" },
  "schenectady": { region: "new_york", countyId: "ny_state", locationLabel: "Schenectady, New York" },
  "binghamton": { region: "new_york", countyId: "ny_state", locationLabel: "Binghamton, New York" },
  "long island": { region: "new_york", countyId: "ny_state", locationLabel: "Long Island, New York" },
  "nassau county": { region: "new_york", countyId: "ny_state", locationLabel: "Nassau County, New York" },
  "westchester county": { region: "new_york", countyId: "ny_state", locationLabel: "Westchester County, New York" },
  "ithaca": { region: "new_york", countyId: "ny_state", locationLabel: "Ithaca, New York" },
  "saratoga springs": { region: "new_york", countyId: "ny_state", locationLabel: "Saratoga Springs, New York" },
  "poughkeepsie": { region: "new_york", countyId: "ny_state", locationLabel: "Poughkeepsie, New York" },
  "endwell": { region: "new_york", countyId: "ny_state", locationLabel: "Endwell, New York" },
  // Connecticut — Manchester CT Health Department (AI web search)
  "manchester ct": { region: "connecticut", countyId: "manchester_ct", locationLabel: "Manchester, CT" },
  // Pennsylvania — AI search with proper location label
  "philadelphia": { region: "pennsylvania", countyId: "philly", locationLabel: "Philadelphia, Pennsylvania" },
  "philly": { region: "pennsylvania", countyId: "philly", locationLabel: "Philadelphia, Pennsylvania" },
  "pittsburgh": { region: "pennsylvania", countyId: "philly", locationLabel: "Pittsburgh, Pennsylvania" },
  "pennsylvania": { region: "pennsylvania", countyId: "philly", locationLabel: "Pennsylvania" },
};

const LIVE_API_CITIES = [
  { label: "Seattle Metro", region: "washington", countyId: "king", emoji: "🌲", example: "McDonald's" },
  { label: "New York City", region: "new_york", countyId: "nyc", emoji: "🗽", example: "Subway" },
  { label: "NY State (Buffalo, Albany…)", region: "new_york", countyId: "ny_state", emoji: "🏔️", example: "pizza", locationLabel: "New York State" },
  { label: "Chicago", region: "illinois", countyId: "cook", emoji: "🏙️", example: "pizza" },
  { label: "Montgomery County, MD", region: "maryland", countyId: "montgomery_md", emoji: "🏛️", example: "Chipotle" },
  { label: "Austin TX", region: "texas", countyId: "travis", emoji: "🤠", example: "tacos" },
  { label: "San Francisco", region: "california", countyId: "sf", emoji: "🌉", example: "sushi" },
  { label: "Los Angeles", region: "california", countyId: "la", emoji: "🌴", example: "burger" },
  { label: "Toronto 🇨🇦", region: "canada", countyId: "toronto", emoji: "🍁", example: "restaurant", locationLabel: "Toronto, Ontario, Canada" },
  { label: "Delaware", region: "delaware", countyId: "delaware", emoji: "🦅", example: "Subway", locationLabel: "Delaware" },
  { label: "Dubai 🇦🇪", region: "uae", countyId: "dubai", emoji: "🏙️", example: "restaurant", locationLabel: "Dubai, UAE" },
  { label: "United Kingdom 🇬🇧", region: "uk", countyId: "uk_fsa", emoji: "🇬🇧", example: "fish and chips", locationLabel: "United Kingdom" },
  { label: "Boston, MA", region: "massachusetts", countyId: "boston", emoji: "🦞", example: "restaurant" },
  { label: "Houston, TX", region: "texas", countyId: "houston", emoji: "🤠", example: "barbecue" },
  { label: "Modesto / Stanislaus Co., CA", region: "california", countyId: "stanislaus", emoji: "🌾", example: "restaurant", locationLabel: "Modesto, CA" },
  { label: "Tacoma / Pierce Co., WA", region: "washington", countyId: "pierce", emoji: "🏔️", example: "Sonic", locationLabel: "Tacoma, WA" },
];

export default function Home() {
  const location = useLocation();
  const { accept, decline } = useConsent();
  const [region, setRegion]                     = useState("global");
  const [countyId, setCountyId]                 = useState("global");
  const pendingSearchRef                        = useRef(null);
  const searchIdRef                             = useRef(0);
  const [results, setResults]                   = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows]             = useState([]);
  const [isLoading, setIsLoading]               = useState(false);
  const abortRef                                = useRef(null);
  const countyIdRef                             = useRef("global");
  const regionRef                               = useRef("global");
  const [isDetailLoading, setIsDetailLoading]   = useState(false);
  const [hasSearched, setHasSearched]           = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");
  const [searchBarQuery, setSearchBarQuery]     = useState("");
  const [viewMode, setViewMode]                 = useState("list");
  const [sortBy, setSortBy]                     = useState("score-high");
  const [gradeFilter, setGradeFilter]           = useState(null);
  const [compareList, setCompareList]           = useState([]);
  const [showCompare, setShowCompare]           = useState(false);
  const [nearMeActive, setNearMeActive]         = useState(false);
  const [userCoords, setUserCoords]             = useState(null);
  const [isGeolocating, setIsGeolocating]       = useState(false);
  const [nearMeError, setNearMeError]           = useState("");
  const [showScanner, setShowScanner]           = useState(false);
  const [locationQuery, setLocationQuery]       = useState("");
  const [isAISearch, setIsAISearch]             = useState(false);
  const [searchError, setSearchError]           = useState("");
  const [isRefining, setIsRefining]             = useState(false);
  const [fuzzyFilters, setFuzzyFilters]         = useState({ cuisine: "", city: "", minGrade: "" });
  const [fuzzySelected, setFuzzySelected]       = useState(null);

  const handleToggleCompare = (restaurant) => {
    setCompareList((prev) => {
      const exists = prev.find((r) => r.business_id === restaurant.business_id);
      if (exists) return prev.filter((r) => r.business_id !== restaurant.business_id);
      if (prev.length >= 3) return prev;
      return [...prev, restaurant];
    });
  };

  const currentRegion = REGIONS[region] || REGIONS["global"];
  const currentCounty = currentRegion.counties.find((c) => c.id === countyId) || currentRegion.counties[0];
  const { t: langT } = useLanguage();
  const t = langT || getTranslations(region);
  const { langMeta } = useLanguage();
  const isRTL = langMeta?.dir === "rtl" || ["uae"].includes(region);

  // Silently grab user coords if already permitted (no prompt)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        navigator.geolocation.getCurrentPosition((pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }, () => {});
      }
    }).catch(() => {});
  }, []);

  // Auto-search from URL params (e.g. navigated here from CountyDrillDown)
  useEffect(() => {
    if (location.state?.restaurant) {
      const { restaurant, region: r, county: c } = location.state;
      if (r && REGIONS[r]) { regionRef.current = r; setRegion(r); }
      if (c) { countyIdRef.current = c; setCountyId(c); }
      setHasSearched(true);
      setSelectedBusiness(restaurant);
      setDetailRows(llmToDetailRows(restaurant));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const r = params.get("region");
    const c = params.get("county");
    if (q) {
      if (r && REGIONS[r]) { regionRef.current = r; setRegion(r); }
      if (c) { countyIdRef.current = c; setCountyId(c); }
      pendingSearchRef.current = q;
    }
  }, []);

  useEffect(() => {
    if (pendingSearchRef.current) {
      const q = pendingSearchRef.current;
      pendingSearchRef.current = null;
      handleSearch(q);
    }
  }, [countyId]);

  const resetSearch = () => {
    setResults([]);
    setHasSearched(false);
    regionRef.current = "global"; setRegion("global");
    countyIdRef.current = "global"; setCountyId("global");
    setSelectedBusiness(null);
    window.history.pushState({}, '', window.location.pathname);
    setViewMode("list");
    setCompareList([]);
    setShowCompare(false);
    setGradeFilter(null);
    setIsRefining(false);
    setFuzzyFilters({ cuisine: "", city: "", minGrade: "" });
    setFuzzySelected(null);
  };

  const handleSearch = useCallback(async (rawQuery) => {
    let query = rawQuery;
    let searchRegion = regionRef.current;
    let searchCounty = countyIdRef.current;

    // Auto-detect location from explicit city name in query when on global
    const queryWords = rawQuery.toLowerCase().trim();

    // US state abbreviations — when present, force US interpretation of ambiguous city names
    const US_STATE_ABBR = new Set([
      'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
      'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
      'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
      'va','wa','wv','wi','wy','dc'
    ]);

    // Cities that exist in both the US and another country in CITY_TO_COUNTY.
    const AMBIGUOUS_CITY_NON_US = new Set([
      'manchester','birmingham','bristol','newcastle','cambridge','oxford',
      'reading','lincoln','york','chester','richmond','london','hamilton',
    ]);

    const queryTokens = queryWords.split(/[\s,]+/).filter(Boolean);
    const hasUSStateAbbr = queryTokens.some(tok => US_STATE_ABBR.has(tok));

    const sortedKeys = Object.keys(CITY_TO_COUNTY).sort((a, b) => b.length - a.length);
    // Word-boundary matcher: prevents short keys like "la" from matching inside
    // "portland" or "orlando". Matches the key only when surrounded by start-of-
    // string, whitespace, comma, or end-of-string.
    const matchesKey = (text, key) => {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[\\s,])${escaped}(?:[\\s,]|$)`, 'i').test(text);
    };
    // ── Location is determined SOLELY from the location field, never from the
    // restaurant name. The two prompts exist for a reason: location = where,
    // restaurant = what. This prevents city names like "Bell" (LA County) from
    // being stripped out of restaurant names like "Taco Bell". ──
    let cityMatched = false;
    {
      const locWords = (locationQuery || "").toLowerCase().trim();
      for (const key of sortedKeys) {
        if (!matchesKey(locWords, key)) continue;
        const matched = CITY_TO_COUNTY[key];
        if (hasUSStateAbbr && AMBIGUOUS_CITY_NON_US.has(key) && matched.region !== 'washington') {
          if (key !== 'newcastle') continue;
        }
        if (REGIONS[matched.region]) {
          searchRegion = matched.region;
          searchCounty = matched.countyId;
          regionRef.current = searchRegion; setRegion(searchRegion);
          countyIdRef.current = searchCounty; setCountyId(searchCounty);
          if (matched.locationLabel) setLocationQuery(matched.locationLabel);
          cityMatched = true;
        }
        break;
      }
    }

    // If no city matched from the location field, reset to global.
    // The Places-grounded fallback in aiSearchFallback handles any city worldwide.
    if (!cityMatched) {
      searchRegion = "global";
      searchCounty = "global";
      regionRef.current = "global"; setRegion("global");
      countyIdRef.current = "global"; setCountyId("global");
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    searchIdRef.current++;
    const currentSearchId = searchIdRef.current;

    const isAICounty = searchCounty !== "king" && !["nyc","cook","montgomery_md","travis","sf","la","uk_fsa","toronto","delaware","ny_state","boston","houston","stanislaus","singapore","sydney","brisbane","gold_coast","pierce"].includes(searchCounty);

    setIsLoading(true);
    setHasSearched(true);
    setSearchQuery(query);
    setSelectedBusiness(null);
    setViewMode("list");
    setSearchError("");
    setIsAISearch(isAICounty);
    setIsRefining(false);

    const resolvedCounty = (REGIONS[searchRegion]?.counties || []).find((c) => c.id === searchCounty) || { name: searchCounty };
    const locationCtx = locationQuery.trim() || resolvedCounty.name;

    try {
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const { results: fetchedResults, isAI } = await engineSearch({
        query,
        countyId: searchCounty,
        locationLabel: locationCtx,
        today,
        signal,
        onAccurateResults: (accurate) => {
          if (searchIdRef.current !== currentSearchId) return;
          setResults(accurate);
          setIsRefining(false);
          // If user is already viewing a restaurant detail, update it with
          // the enriched score/grade so the detail page refreshes live.
          setSelectedBusiness(prev => {
            if (!prev) return prev;
            const enriched = accurate.find(r => r.business_id === prev.business_id);
            if (!enriched) return prev;
            // Re-fetch detail rows with the enriched restaurant so the
            // inspection timeline and violation data also update.
            engineFetchDetail(enriched).then(rows => {
              if (searchIdRef.current !== currentSearchId) return;
              setDetailRows(rows);
              setSelectedBusiness(p => p ? { ...p, inspectionHistory: rows } : p);
            });
            return { ...prev, ...enriched, inspectionHistory: prev.inspectionHistory };
          });
        },
        onCountUpdate: (bizId, trueCount) => {
          if (searchIdRef.current !== currentSearchId) return;
          setResults(prev => prev.map(r =>
            r.business_id === bizId ? { ...r, totalInspections: trueCount } : r
          ));
        },
      });

      // If this is an AI search with results, the web search is still running in background
      if (isAI && fetchedResults.length > 0) setIsRefining(true);
      setIsAISearch(isAI);
      setResults(fetchedResults);
    } catch (e) {
      if (e.name === "AbortError") return;
      setIsLoading(false);
      setIsAISearch(false);
      setIsRefining(false);
      setSearchError("Search failed. Please try again in a moment.");
      return;
    }

    setIsLoading(false);
  }, [region, countyId, locationQuery, userCoords]);

  const handleSelectBusiness = useCallback(async (biz) => {
    setSelectedBusiness(biz);
    window.history.pushState({}, '', `?q=${encodeURIComponent(searchQuery)}&biz=${encodeURIComponent(biz.business_id)}`);

    setIsDetailLoading(true);

    const processRows = (rows) => {
      setDetailRows(rows);
      if (rows.length === 0) return;

      const uniqueMap = {};
      rows.forEach(row => {
        const key = row.inspection_serial_num || `${row.inspection_date}|${row.inspection_result}`;
        if (!uniqueMap[key]) uniqueMap[key] = row;
      });
      const uniqueRows = Object.values(uniqueMap);

      const actualCount = uniqueRows.length;
      const sortedDates = uniqueRows.map(r => r.inspection_date).filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
      const trueLatestDate = sortedDates[0] || biz.latestDate;
      const mostRecent = uniqueRows.find(r => r.inspection_date === trueLatestDate) || uniqueRows[0];
      const trueLatestResult = mostRecent?.inspection_result || biz.latestResult;

      let trueSafetyScore = biz.safetyScore;
      const scoresFromRows = uniqueRows
        .map(r => {
          const raw = r.inspection_score !== undefined ? r.inspection_score : r.score;
          return raw !== undefined ? Math.max(0, Math.min(100, 100 - parseInt(raw))) : null;
        })
        .filter(s => s !== null && !isNaN(s));
      if (scoresFromRows.length > 0) {
        const latestScoreRaw = mostRecent?.inspection_score !== undefined ? mostRecent.inspection_score : mostRecent?.score;
        if (latestScoreRaw !== undefined && latestScoreRaw !== null) {
          trueSafetyScore = Math.max(0, Math.min(100, 100 - parseInt(latestScoreRaw)));
        }
      }

      const enriched = {
        ...biz,
        totalInspections: actualCount,
        latestDate: trueLatestDate,
        latestResult: trueLatestResult,
        safetyScore: trueSafetyScore,
        inspectionHistory: uniqueRows,
      };
      setSelectedBusiness(enriched);
      setResults(prev => prev.map(r =>
        r.business_id === biz.business_id
          ? { ...r, totalInspections: actualCount, latestDate: trueLatestDate, latestResult: trueLatestResult, safetyScore: trueSafetyScore }
          : r
      ));
    };

    const rows = await engineFetchDetail(biz);
    processRows(rows);
    setIsDetailLoading(false);
  }, [searchQuery]);

  const handleSwitchToMap = useCallback(() => setViewMode("map"), []);

  // Haversine distance in miles
  const haversineMiles = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const handleFindNearMe = useCallback(async () => {
    if (nearMeActive) { setNearMeActive(false); setUserCoords(null); setNearMeError(""); return; }
    setNearMeError("");
    setIsGeolocating(true);
    const geoContext = locationQuery.trim() || REGIONS[region]?.abbr || "";
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        const missing = results.filter((r) => !r.latitude || !r.longitude);
        await Promise.all(missing.map(async (r) => {
          const gc = await geocodeAddress(r.address, r.city, geoContext).catch(() => null);
          if (gc) setResults((prev) => prev.map((p) => p.business_id === r.business_id ? { ...p, ...gc } : p));
        }));
        setNearMeActive(true);
        setIsGeolocating(false);
      },
      () => { setNearMeError("Location access denied."); setIsGeolocating(false); }
    );
  }, [nearMeActive, region, locationQuery, results]);

  const GRADE_MIN_SCORE = { A: 90, B: 80, C: 70 };

  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];

    // ScoreLegend grade filter
    if (gradeFilter) {
      const gradeRanges = { A: [90, 100], B: [80, 89], C: [70, 79], D: [60, 69], F: [0, 59] };
      if (gradeFilter === "U") {
        filtered = filtered.filter((r) => r.safetyScore === null || r.safetyScore === undefined || r.totalInspections === 0);
      } else {
        const [lo, hi] = gradeRanges[gradeFilter] || [0, 100];
        filtered = filtered.filter((r) => r.safetyScore !== null && r.safetyScore !== undefined && r.safetyScore >= lo && r.safetyScore <= hi);
      }
    }

    // FuzzySearchBar filters
    if (fuzzySelected) {
      filtered = filtered.filter(r => r.business_id === fuzzySelected.business_id);
    } else {
      if (fuzzyFilters.cuisine) filtered = filtered.filter(r => r.cuisine === fuzzyFilters.cuisine);
      if (fuzzyFilters.city)    filtered = filtered.filter(r => r.city === fuzzyFilters.city);
      if (fuzzyFilters.minGrade && GRADE_MIN_SCORE[fuzzyFilters.minGrade] !== undefined) {
        const minScore = GRADE_MIN_SCORE[fuzzyFilters.minGrade];
        filtered = filtered.filter(r => r.safetyScore !== null && r.safetyScore !== undefined && r.safetyScore >= minScore);
      }
    }
    const scoreOf = (r) => r.safetyScore !== null && r.safetyScore !== undefined ? r.safetyScore : -1;
    switch (sortBy) {
      case "score-high":  filtered.sort((a, b) => scoreOf(b) - scoreOf(a) || b.totalInspections - a.totalInspections); break;
      case "score-low":   filtered.sort((a, b) => scoreOf(a) - scoreOf(b) || b.totalInspections - a.totalInspections); break;
      case "inspections": filtered.sort((a, b) => b.totalInspections - a.totalInspections || scoreOf(b) - scoreOf(a)); break;
      case "date-recent": filtered.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate)); break;
      case "date-oldest": filtered.sort((a, b) => new Date(a.latestDate) - new Date(b.latestDate)); break;
      default:            filtered.sort((a, b) => scoreOf(b) - scoreOf(a));
    }
    if (nearMeActive && userCoords) {
      filtered = filtered.filter((r) => {
        if (!r.latitude || !r.longitude) return false;
        return haversineMiles(userCoords.lat, userCoords.lng, parseFloat(r.latitude), parseFloat(r.longitude)) <= 5;
      });
    }
    return filtered;
  }, [results, sortBy, nearMeActive, userCoords, gradeFilter]);

  const handleGeocodedMapSwitch = useCallback((sortedResults) => {
    const MAP_LIMIT = 10;
    const topResults = sortedResults.slice(0, MAP_LIMIT);
    if (!topResults.some((r) => !r.latitude)) return;
    const geoContext = locationQuery.trim() || REGIONS[region]?.abbr || "";
    topResults.forEach(async (r) => {
      if (r.latitude && r.longitude) return;
      const coords = await geocodeAddress(r.address, r.city, geoContext).catch(() => null);
      if (coords) {
        setResults((prev) => prev.map((p) => p.business_id === r.business_id ? { ...p, ...coords } : p));
      }
    });
  }, [region, locationQuery]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a2e1a] text-white" role="banner">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-10">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 bg-[#4CAF50]/20 border border-[#4CAF50]/40 text-[#81c784] text-xs font-bold px-3 py-1.5 rounded-full mb-4 tracking-wider uppercase">
              🛡️ #1 Global Food Safety Platform · 74 Countries Covered
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight" dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily: "Nunito, sans-serif" }}>
              Is your restaurant
              <span className="text-[#4CAF50]"> safe to eat at? 🍽️</span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-300 font-bold max-w-lg mx-auto" style={{ fontFamily: "Nunito, sans-serif" }}>
              Real health inspector reports — made easy to understand! Find out if your favorite restaurant is A+ or needs a time-out. 🛡️
            </p>

            {!hasSearched && (
              <div className="flex items-center justify-center gap-2 mt-5 flex-wrap" style={{ fontFamily: "Nunito, sans-serif" }}>
                {[
                  { g: "A", color: "bg-green-600 text-white", tip: "🌟 Amazing!" },
                  { g: "B", color: "bg-lime-500 text-white", tip: "😊 Great!" },
                  { g: "C", color: "bg-yellow-400 text-slate-800", tip: "🤔 Okay" },
                  { g: "D", color: "bg-orange-500 text-white", tip: "⚠️ Uh-oh" },
                  { g: "F", color: "bg-red-600 text-white", tip: "🚨 Yikes!" },
                  { g: "U", color: "bg-slate-400 text-white", tip: "❓ Unknown" },
                ].map(({ g, color, tip }) => (
                  <div key={g} className="flex flex-col items-center gap-1">
                    <span className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl shadow-md border-2 border-white/30 ${color}`}>{g}</span>
                    <span className="text-[10px] text-slate-300 font-extrabold">{tip}</span>
                  </div>
                ))}
                <Link to="/About#grading" className="text-slate-400 text-xs ml-1 hover:text-[#4CAF50] underline underline-offset-2 transition-colors font-bold">← how grades work</Link>
              </div>
            )}
          </div>

          <SmartSearchPanel
            query={searchBarQuery}
            onQueryChange={setSearchBarQuery}
            locationQuery={locationQuery}
            onLocationChange={(val) => {
              setLocationQuery(val);
            }}
            onRegionChange={({ region: r, countyId: c, label }) => {
              regionRef.current = r; setRegion(r);
              countyIdRef.current = c; setCountyId(c);
              setLocationQuery(label);
            }}
            onSearch={(q) => {
              if (hasSearched) {
                // Clear results but DO NOT reset region/countyId — preserve the selected city
                setResults([]);
                setHasSearched(false);
                setSelectedBusiness(null);
                setIsRefining(false);
                setGradeFilter(null);
                setFuzzyFilters({ cuisine: "", city: "", minGrade: "" });
                setFuzzySelected(null);
                window.history.pushState({}, '', window.location.pathname);
              }
              setTimeout(() => handleSearch(q), 0);
            }}
            isLoading={isLoading}
            activeRegion={region}
            activeCounty={countyId}
            onNearMe={(coords) => {
              setUserCoords(coords);
              setNearMeActive(true);
            }}
          />

          <div className="flex justify-center gap-2 mt-4">
            {hasSearched && (
              <button onClick={resetSearch} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold min-h-[48px] transition-colors">
                <X className="w-4 h-4" /> New Search
              </button>
            )}
            <button onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-bold min-h-[48px] transition-colors">
              📷 {hasSearched ? "Scan Sign" : "Scan a Restaurant Sign"}
            </button>
          </div>

          {!hasSearched && (
            <div className="w-full max-w-4xl mx-auto mt-4">
              <HeroViolations />
            </div>
          )}
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only" id="search-status">
        {isLoading ? `Querying health department database for ${locationQuery || countyId}. Please wait…` : hasSearched && !isLoading ? `Found ${filteredAndSortedResults.length} restaurants` : ""}
      </div>

      <main className="max-w-5xl mx-auto px-4 pb-20 pt-8" id="main-content" aria-label="Restaurant search results">
        {!hasSearched && (
          <div className="space-y-8 mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ fontFamily: "Nunito, sans-serif" }}>
              {[
                { emoji: "🔍", title: "Search any restaurant!", desc: "Type a name, like \"McDonald's\" or just \"pizza\". It works anywhere in the world!" },
                { emoji: "📋", title: "See the real grade", desc: "We grab actual health inspector reports — the same ones the inspectors write down." },
                { emoji: "🛡️", title: "Eat with confidence!", desc: "Get A–F grades in plain English, plus the full list of what inspectors found." },
              ].map(({ emoji, title, desc }) => (
                <div key={title} className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-sm flex gap-4 items-start hover:border-[#4CAF50] hover:shadow-md transition-all">
                  <span className="text-4xl flex-shrink-0">{emoji}</span>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm mb-1">{title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: "18", label: "Direct data sources", emoji: "🟢" },
                { value: "170+", label: "Health departments", emoji: "🌍" },
                { value: "A–F", label: "Universal grade", emoji: "📋" },
                { value: "100%", label: "Free, always", emoji: "✅" },
              ].map(({ value, label, emoji }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                  <p className="text-2xl font-extrabold text-slate-900">{emoji} {value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">🟢 Cities with live government data (instant results)</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["🌲 Seattle Metro, WA", "🗽 New York City, NY", "🏔️ NY State (Buffalo, Albany…)", "🏙️ Chicago, IL", "🏛️ Montgomery County, MD", "🤠 Austin, TX", "🌉 San Francisco, CA", "🌴 Los Angeles, CA", "🍁 Toronto, Canada (DineSafe)", "🦅 Delaware", "🦞 Boston, MA", "🤠 Houston, TX", "🇬🇧 United Kingdom (500K+ establishments)"].map(src => (
                  <span key={src} className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-700">{src}</span>
                ))}
              </div>
              <p className="text-center text-xs text-slate-500 mt-3">🌍 Plus 150+ more cities across 74 countries — covered by AI-powered search of public health records. Just type any city or country!</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/About" className="flex-1 max-w-md mx-auto sm:mx-0">
                <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-[#4CAF50] hover:shadow-md transition-all text-center sm:text-left">
                  <p className="font-extrabold text-slate-900 text-sm">📖 The Full Story</p>
                  <p className="text-xs text-slate-500 mt-0.5">How every grade is earned, our trust controls, and enterprise & API — all in one place.</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {selectedBusiness ? (
            <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-400">{t.loadingDetails}</p>
                </div>
              ) : (
                <RestaurantDetail restaurant={selectedBusiness} inspections={detailRows} onBack={() => setSelectedBusiness(null)} />
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {hasSearched && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    {isLoading ? (
                        <SearchLoadingIndicator
                          countyId={countyId}
                          locationCtx={locationQuery}
                          isAISearch={isAISearch}
                        />
                    ) : searchError ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Search Unavailable</h3>
                        <p className="text-sm text-slate-400 mt-1 mb-4">{searchError}</p>
                        <button onClick={() => handleSearch(searchQuery)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">Try Again</button>
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        {/* FuzzySearchBar — filters already-loaded results */}
                        <div className="mb-3">
                          <FuzzySearchBar
                            results={results}
                            onSelect={(r) => { setFuzzySelected(r); handleSelectBusiness(r); }}
                            onFilterChange={(f) => { setFuzzyFilters(f); setFuzzySelected(null); }}
                            placeholder={`Filter ${results.length} result${results.length !== 1 ? "s" : ""}…`}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                          <div>
                            <p className="text-sm font-extrabold text-slate-800">
                              Found {filteredAndSortedResults.length} restaurant{filteredAndSortedResults.length !== 1 ? "s" : ""}
                              {results.length !== filteredAndSortedResults.length ? ` (filtered from ${results.length})` : ""}
                              {searchQuery ? ` for "${searchQuery}"` : ""}
                              {nearMeActive && <span className="ml-1 text-blue-600"> · within 5 miles</span>}
                              {isRefining && <span className="ml-1 text-amber-600 animate-pulse"> · verifying with live web search…</span>}
                            </p>
                            {nearMeError && <p className="text-xs text-red-500 mt-0.5">{nearMeError}</p>}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {gradeFilter ? `Showing Grade ${gradeFilter} only · ` : ""}
                              Sorted by safety score — tap any restaurant to see its full history
                            </p>
                            {results.some(r => r.data_fetch_notes) && (
                              <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                                ⚠️ Some results have data source notes — tap a restaurant to see why a score may be missing or estimated.
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button
                              onClick={handleFindNearMe}
                              disabled={isGeolocating}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                nearMeActive ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {isGeolocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                              {nearMeActive ? "📍 Near Me ON" : "📍 Near Me"}
                            </button>
                            <button onClick={() => setViewMode("list")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${viewMode === "list" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}>
                              📋 List
                            </button>
                            <button onClick={viewMode !== "map" ? () => { handleSwitchToMap(); handleGeocodedMapSwitch(filteredAndSortedResults); } : undefined} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${viewMode === "map" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}>
                              🗺️ Map
                            </button>
                          </div>
                        </div>

                        {/* Data transparency banner */}
                        {(() => {
                          const hasLLM = filteredAndSortedResults.some(r => r.isLLMData);
                          const hasLive = filteredAndSortedResults.some(r => !r.isLLMData);
                          return (
                            <div className="flex items-start gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-600">
                              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                              <p className="leading-relaxed">
                                {hasLive && !hasLLM && "✅ All results below are live, real-time data from official government health department APIs — fully authoritative."}
                                {hasLLM && !hasLive && "🔍 Results below were verified via live web search of public health records by AI (Gemini 3 Flash). Each card shows its confidence level. Always verify with the official source before deciding."}
                                {hasLive && hasLLM && "📊 Results below combine live government API data (green badge) with AI web-search verified data (blue/amber badge). Tap any restaurant to see its full source of truth."}
                                {" "}
                                <Link to="/About" className="text-blue-600 hover:underline font-semibold">How does this work?</Link>
                              </p>
                            </div>
                          );
                        })()}

                        {viewMode === "map" ? (
                          <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /></div>}>
                            <MapView
                              restaurants={filteredAndSortedResults}
                              onSelectRestaurant={handleSelectBusiness}
                              onFilterByGrade={(grade) => setGradeFilter(grade)}
                              userCoords={userCoords}
                              selectedId={selectedBusiness?.business_id}
                            />
                          </Suspense>
                        ) : (
                          <div>
                            {filteredAndSortedResults.length > 20 ? (
                              <VirtualList
                                height={Math.min(filteredAndSortedResults.length * 130, 800)}
                                itemCount={filteredAndSortedResults.length}
                                itemSize={130}
                                width="100%"
                              >
                                {({ index, style }) => {
                                  const r = filteredAndSortedResults[index];
                                  return (
                                    <div style={{ ...style, paddingBottom: 12 }} key={r.business_id}>
                                      <RestaurantCard
                                        restaurant={r}
                                        onClick={() => handleSelectBusiness(r)}
                                        onToggleCompare={handleToggleCompare}
                                        isCompared={compareList.some((c) => c.business_id === r.business_id)}
                                        compareDisabled={compareList.length >= 3}
                                      />
                                    </div>
                                  );
                                }}
                              </VirtualList>
                            ) : (
                              <div className="space-y-3">
                                {filteredAndSortedResults.map((r) => (
                                  <RestaurantCard
                                    key={r.business_id}
                                    restaurant={r}
                                    onClick={() => handleSelectBusiness(r)}
                                    onToggleCompare={handleToggleCompare}
                                    isCompared={compareList.some((c) => c.business_id === r.business_id)}
                                    compareDisabled={compareList.length >= 3}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-14 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <span className="text-5xl">🤷</span>
                        <h3 className="text-lg font-extrabold text-slate-800 mt-4">Nothing found for "{searchQuery}"</h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                          Try a different spelling, a broader word (like "pizza" or "chicken"), or make sure your location is right.
                        </p>
                        {locationQuery && (
                          <p className="text-xs text-slate-400 mt-2">
                            📍 You searched in: <span className="font-bold text-slate-600">{locationQuery}</span>
                          </p>
                        )}
                        <div className="mt-6">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Try one of these cities with live data:</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {LIVE_API_CITIES.map(city => (
                              <button key={city.countyId}
                                onClick={() => { regionRef.current = city.region; setRegion(city.region); countyIdRef.current = city.countyId; setCountyId(city.countyId); setLocationQuery(city.locationLabel || city.label); resetSearch(); }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
                                {city.emoji} {city.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <div className="sticky top-6 space-y-3">
                      <Suspense fallback={null}>
                        <ScoreLegend
                          activeGrade={gradeFilter}
                          onGradeFilter={(g) => setGradeFilter(g)}
                        />
                      </Suspense>
                      {gradeFilter && (
                        <div className="bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-600 font-semibold flex items-center justify-between">
                          <span>Showing Grade {gradeFilter} only</span>
                          <button onClick={() => setGradeFilter(null)} className="text-blue-600 hover:underline ml-2">Clear</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {compareList.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 max-w-lg w-[90vw]">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <GitCompareArrows className="w-4 h-4 text-blue-400" />
              Compare Side-by-Side
            </div>
            <div className="flex items-center gap-1 mt-1">
              {compareList.map((r) => (
                <span key={r.business_id} className="text-[11px] bg-slate-700 px-2 py-0.5 rounded-lg truncate max-w-[100px]">{r.name}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowCompare(true)}
            className="ml-auto bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            ⚖️ Compare Now
          </button>
          <button onClick={() => setCompareList([])} title="Clear comparison" className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showScanner && (
        <Suspense fallback={null}>
          <CameraScanner
            onResult={(query) => { handleSearch(query); }}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}

      <ConsentBanner onAccept={accept} onDecline={decline} />

      {showCompare && (
        <Suspense fallback={null}>
          <ComparePanel
            restaurants={compareList}
            onClose={() => setShowCompare(false)}
            onViewDetail={(r) => { setShowCompare(false); handleSelectBusiness(r); }}
          />
        </Suspense>
      )}
    </div>
  );
}