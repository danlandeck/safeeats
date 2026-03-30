import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SearchBar from "../components/SearchBar";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantDetail from "../components/RestaurantDetail";
import ScoreLegend from "../components/ScoreLegend";
import MapView from "../components/MapView";
import FilterSortControls from "../components/FilterSortControls";
import DataVisualizations from "../components/DataVisualizations";
import NationalHeatMap from "../components/NationalHeatMap";

const KING_API = "https://data.kingcounty.gov/resource/f29f-zza5.json";
const NYC_API = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHICAGO_API = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
const MONTGOMERY_API = "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json";

const REGIONS = {
  alabama: { name: "Alabama", abbr: "AL", counties: [
    { id: "jefferson", name: "Jefferson County (Birmingham)", city: "Birmingham", hasPublicApi: false },
    { id: "mobile", name: "Mobile County", city: "Mobile", hasPublicApi: false },
    { id: "madison", name: "Madison County (Huntsville)", city: "Huntsville", hasPublicApi: false },
    { id: "montgomery", name: "Montgomery County", city: "Montgomery", hasPublicApi: false },
  ]},
  alaska: { name: "Alaska", abbr: "AK", counties: [
    { id: "anchorage", name: "Municipality of Anchorage", city: "Anchorage", hasPublicApi: false },
    { id: "fairbanks", name: "Fairbanks North Star Borough", city: "Fairbanks", hasPublicApi: false },
    { id: "juneau", name: "City & Borough of Juneau", city: "Juneau", hasPublicApi: false },
  ]},
  arizona: { name: "Arizona", abbr: "AZ", counties: [
    { id: "maricopa", name: "Maricopa County (Phoenix)", city: "Phoenix", hasPublicApi: false },
    { id: "pima", name: "Pima County (Tucson)", city: "Tucson", hasPublicApi: false },
    { id: "pinal", name: "Pinal County (Mesa/Gilbert)", city: "Florence", hasPublicApi: false },
    { id: "yavapai", name: "Yavapai County (Prescott)", city: "Prescott", hasPublicApi: false },
    { id: "coconino", name: "Coconino County (Flagstaff)", city: "Flagstaff", hasPublicApi: false },
  ]},
  arkansas: { name: "Arkansas", abbr: "AR", counties: [
    { id: "pulaski", name: "Pulaski County (Little Rock)", city: "Little Rock", hasPublicApi: false },
    { id: "benton", name: "Benton County (Bentonville)", city: "Bentonville", hasPublicApi: false },
    { id: "washington_ar", name: "Washington County (Fayetteville)", city: "Fayetteville", hasPublicApi: false },
  ]},
  california: { name: "California", abbr: "CA", counties: [
    { id: "la", name: "Los Angeles County", city: "Los Angeles", hasPublicApi: false },
    { id: "sf", name: "San Francisco County", city: "San Francisco", hasPublicApi: false },
    { id: "sandiego", name: "San Diego County", city: "San Diego", hasPublicApi: false },
    { id: "sacramento", name: "Sacramento County", city: "Sacramento", hasPublicApi: false },
    { id: "alameda", name: "Alameda County (Oakland)", city: "Oakland", hasPublicApi: false },
    { id: "orange_ca", name: "Orange County (Anaheim)", city: "Santa Ana", hasPublicApi: false },
    { id: "riverside", name: "Riverside County", city: "Riverside", hasPublicApi: false },
    { id: "sanbernardino", name: "San Bernardino County", city: "San Bernardino", hasPublicApi: false },
    { id: "santaclara", name: "Santa Clara County (San Jose)", city: "San Jose", hasPublicApi: false },
    { id: "fresno", name: "Fresno County", city: "Fresno", hasPublicApi: false },
    { id: "kern", name: "Kern County (Bakersfield)", city: "Bakersfield", hasPublicApi: false },
    { id: "ventura", name: "Ventura County", city: "Ventura", hasPublicApi: false },
  ]},
  colorado: { name: "Colorado", abbr: "CO", counties: [
    { id: "denver", name: "Denver County", city: "Denver", hasPublicApi: false },
    { id: "el_paso", name: "El Paso County (Colorado Springs)", city: "Colorado Springs", hasPublicApi: false },
    { id: "boulder", name: "Boulder County", city: "Boulder", hasPublicApi: false },
    { id: "arapahoe", name: "Arapahoe County (Aurora)", city: "Centennial", hasPublicApi: false },
    { id: "adams", name: "Adams County", city: "Brighton", hasPublicApi: false },
    { id: "larimer", name: "Larimer County (Fort Collins)", city: "Fort Collins", hasPublicApi: false },
    { id: "jefferson_co", name: "Jefferson County (Lakewood)", city: "Golden", hasPublicApi: false },
  ]},
  connecticut: { name: "Connecticut", abbr: "CT", counties: [
    { id: "hartford", name: "Hartford County", city: "Hartford", hasPublicApi: false },
    { id: "new_haven", name: "New Haven County", city: "New Haven", hasPublicApi: false },
    { id: "fairfield", name: "Fairfield County (Bridgeport)", city: "Bridgeport", hasPublicApi: false },
  ]},
  delaware: { name: "Delaware", abbr: "DE", counties: [
    { id: "new_castle", name: "New Castle County (Wilmington)", city: "Wilmington", hasPublicApi: false },
    { id: "kent", name: "Kent County (Dover)", city: "Dover", hasPublicApi: false },
    { id: "sussex", name: "Sussex County", city: "Georgetown", hasPublicApi: false },
  ]},
  dc: { name: "Washington D.C.", abbr: "DC", counties: [
    { id: "dc", name: "District of Columbia", city: "Washington D.C.", hasPublicApi: false },
  ]},
  florida: { name: "Florida", abbr: "FL", counties: [
    { id: "miami_dade", name: "Miami-Dade County", city: "Miami", hasPublicApi: false },
    { id: "broward", name: "Broward County (Fort Lauderdale)", city: "Fort Lauderdale", hasPublicApi: false },
    { id: "orange_fl", name: "Orange County (Orlando)", city: "Orlando", hasPublicApi: false },
    { id: "hillsborough", name: "Hillsborough County (Tampa)", city: "Tampa", hasPublicApi: false },
    { id: "palm_beach", name: "Palm Beach County", city: "West Palm Beach", hasPublicApi: false },
    { id: "pinellas", name: "Pinellas County (St. Petersburg)", city: "Clearwater", hasPublicApi: false },
    { id: "duval", name: "Duval County (Jacksonville)", city: "Jacksonville", hasPublicApi: false },
    { id: "polk", name: "Polk County (Lakeland)", city: "Bartow", hasPublicApi: false },
    { id: "lee", name: "Lee County (Fort Myers)", city: "Fort Myers", hasPublicApi: false },
  ]},
  georgia: { name: "Georgia", abbr: "GA", counties: [
    { id: "fulton", name: "Fulton County (Atlanta)", city: "Atlanta", hasPublicApi: false },
    { id: "dekalb", name: "DeKalb County", city: "Decatur", hasPublicApi: false },
    { id: "gwinnett", name: "Gwinnett County", city: "Lawrenceville", hasPublicApi: false },
    { id: "cobb", name: "Cobb County (Marietta)", city: "Marietta", hasPublicApi: false },
    { id: "chatham", name: "Chatham County (Savannah)", city: "Savannah", hasPublicApi: false },
    { id: "bibb", name: "Bibb County (Macon)", city: "Macon", hasPublicApi: false },
  ]},
  hawaii: { name: "Hawaii", abbr: "HI", counties: [
    { id: "honolulu", name: "City & County of Honolulu", city: "Honolulu", hasPublicApi: false },
    { id: "maui", name: "Maui County", city: "Wailuku", hasPublicApi: false },
    { id: "hawaii_county", name: "Hawaii County (Big Island)", city: "Hilo", hasPublicApi: false },
    { id: "kauai", name: "Kauai County", city: "Lihue", hasPublicApi: false },
  ]},
  idaho: { name: "Idaho", abbr: "ID", counties: [
    { id: "ada", name: "Ada County (Boise)", city: "Boise", hasPublicApi: false },
    { id: "canyon", name: "Canyon County (Nampa)", city: "Caldwell", hasPublicApi: false },
    { id: "kootenai", name: "Kootenai County (Coeur d'Alene)", city: "Coeur d'Alene", hasPublicApi: false },
  ]},
  illinois: { name: "Illinois", abbr: "IL", counties: [
    { id: "cook", name: "Cook County (Chicago)", city: "Chicago", hasPublicApi: true },
    { id: "dupage", name: "DuPage County", city: "Wheaton", hasPublicApi: false },
    { id: "lake_il", name: "Lake County", city: "Waukegan", hasPublicApi: false },
    { id: "will", name: "Will County (Joliet)", city: "Joliet", hasPublicApi: false },
    { id: "kane", name: "Kane County", city: "Geneva", hasPublicApi: false },
    { id: "sangamon", name: "Sangamon County (Springfield)", city: "Springfield", hasPublicApi: false },
  ]},
  indiana: { name: "Indiana", abbr: "IN", counties: [
    { id: "marion", name: "Marion County (Indianapolis)", city: "Indianapolis", hasPublicApi: false },
    { id: "lake_in", name: "Lake County (Gary)", city: "Gary", hasPublicApi: false },
    { id: "allen", name: "Allen County (Fort Wayne)", city: "Fort Wayne", hasPublicApi: false },
    { id: "hamilton_in", name: "Hamilton County (Carmel)", city: "Noblesville", hasPublicApi: false },
  ]},
  iowa: { name: "Iowa", abbr: "IA", counties: [
    { id: "polk_ia", name: "Polk County (Des Moines)", city: "Des Moines", hasPublicApi: false },
    { id: "linn", name: "Linn County (Cedar Rapids)", city: "Cedar Rapids", hasPublicApi: false },
    { id: "scott", name: "Scott County (Davenport)", city: "Davenport", hasPublicApi: false },
    { id: "johnson", name: "Johnson County (Iowa City)", city: "Iowa City", hasPublicApi: false },
  ]},
  kansas: { name: "Kansas", abbr: "KS", counties: [
    { id: "johnson_ks", name: "Johnson County (Overland Park)", city: "Olathe", hasPublicApi: false },
    { id: "sedgwick", name: "Sedgwick County (Wichita)", city: "Wichita", hasPublicApi: false },
    { id: "wyandotte", name: "Wyandotte County (Kansas City KS)", city: "Kansas City", hasPublicApi: false },
    { id: "shawnee", name: "Shawnee County (Topeka)", city: "Topeka", hasPublicApi: false },
  ]},
  kentucky: { name: "Kentucky", abbr: "KY", counties: [
    { id: "jefferson_ky", name: "Jefferson County (Louisville)", city: "Louisville", hasPublicApi: false },
    { id: "fayette", name: "Fayette County (Lexington)", city: "Lexington", hasPublicApi: false },
    { id: "boone", name: "Boone County", city: "Burlington", hasPublicApi: false },
  ]},
  louisiana: { name: "Louisiana", abbr: "LA", counties: [
    { id: "orleans", name: "Orleans Parish (New Orleans)", city: "New Orleans", hasPublicApi: false },
    { id: "east_baton_rouge", name: "East Baton Rouge Parish", city: "Baton Rouge", hasPublicApi: false },
    { id: "jefferson_la", name: "Jefferson Parish (Metairie)", city: "Gretna", hasPublicApi: false },
    { id: "caddo", name: "Caddo Parish (Shreveport)", city: "Shreveport", hasPublicApi: false },
  ]},
  maine: { name: "Maine", abbr: "ME", counties: [
    { id: "cumberland", name: "Cumberland County (Portland)", city: "Portland", hasPublicApi: false },
    { id: "penobscot", name: "Penobscot County (Bangor)", city: "Bangor", hasPublicApi: false },
    { id: "york", name: "York County", city: "Alfred", hasPublicApi: false },
  ]},
  maryland: { name: "Maryland", abbr: "MD", counties: [
    { id: "baltimore_city", name: "Baltimore City", city: "Baltimore", hasPublicApi: false },
    { id: "baltimore_county", name: "Baltimore County", city: "Towson", hasPublicApi: false },
    { id: "montgomery_md", name: "Montgomery County", city: "Rockville", hasPublicApi: true },
    { id: "prince_georges", name: "Prince George's County", city: "Upper Marlboro", hasPublicApi: false },
    { id: "anne_arundel", name: "Anne Arundel County (Annapolis)", city: "Annapolis", hasPublicApi: false },
    { id: "howard", name: "Howard County (Columbia)", city: "Ellicott City", hasPublicApi: false },
  ]},
  massachusetts: { name: "Massachusetts", abbr: "MA", counties: [
    { id: "suffolk", name: "Suffolk County (Boston)", city: "Boston", hasPublicApi: false },
    { id: "middlesex", name: "Middlesex County (Cambridge)", city: "Cambridge", hasPublicApi: false },
    { id: "worcester", name: "Worcester County", city: "Worcester", hasPublicApi: false },
    { id: "hampden", name: "Hampden County (Springfield)", city: "Springfield", hasPublicApi: false },
    { id: "norfolk", name: "Norfolk County (Quincy)", city: "Dedham", hasPublicApi: false },
    { id: "essex_ma", name: "Essex County (Salem/Lawrence)", city: "Salem", hasPublicApi: false },
  ]},
  michigan: { name: "Michigan", abbr: "MI", counties: [
    { id: "wayne", name: "Wayne County (Detroit)", city: "Detroit", hasPublicApi: false },
    { id: "kent", name: "Kent County (Grand Rapids)", city: "Grand Rapids", hasPublicApi: false },
    { id: "oakland", name: "Oakland County", city: "Pontiac", hasPublicApi: false },
    { id: "macomb", name: "Macomb County", city: "Mount Clemens", hasPublicApi: false },
    { id: "ingham", name: "Ingham County (Lansing)", city: "Lansing", hasPublicApi: false },
    { id: "washtenaw", name: "Washtenaw County (Ann Arbor)", city: "Ann Arbor", hasPublicApi: false },
  ]},
  minnesota: { name: "Minnesota", abbr: "MN", counties: [
    { id: "hennepin", name: "Hennepin County (Minneapolis)", city: "Minneapolis", hasPublicApi: false },
    { id: "ramsey", name: "Ramsey County (St. Paul)", city: "St. Paul", hasPublicApi: false },
    { id: "dakota", name: "Dakota County", city: "Hastings", hasPublicApi: false },
    { id: "anoka", name: "Anoka County", city: "Anoka", hasPublicApi: false },
    { id: "st_louis_mn", name: "St. Louis County (Duluth)", city: "Duluth", hasPublicApi: false },
  ]},
  mississippi: { name: "Mississippi", abbr: "MS", counties: [
    { id: "hinds", name: "Hinds County (Jackson)", city: "Jackson", hasPublicApi: false },
    { id: "harrison", name: "Harrison County (Biloxi)", city: "Gulfport", hasPublicApi: false },
    { id: "desoto", name: "DeSoto County (Southaven)", city: "Hernando", hasPublicApi: false },
  ]},
  missouri: { name: "Missouri", abbr: "MO", counties: [
    { id: "st_louis_city", name: "St. Louis City", city: "St. Louis", hasPublicApi: false },
    { id: "st_louis_county", name: "St. Louis County", city: "Clayton", hasPublicApi: false },
    { id: "jackson", name: "Jackson County (Kansas City)", city: "Kansas City", hasPublicApi: false },
    { id: "greene", name: "Greene County (Springfield)", city: "Springfield", hasPublicApi: false },
    { id: "boone_mo", name: "Boone County (Columbia)", city: "Columbia", hasPublicApi: false },
  ]},
  montana: { name: "Montana", abbr: "MT", counties: [
    { id: "yellowstone", name: "Yellowstone County (Billings)", city: "Billings", hasPublicApi: false },
    { id: "cascade", name: "Cascade County (Great Falls)", city: "Great Falls", hasPublicApi: false },
    { id: "missoula", name: "Missoula County", city: "Missoula", hasPublicApi: false },
    { id: "gallatin", name: "Gallatin County (Bozeman)", city: "Bozeman", hasPublicApi: false },
  ]},
  nebraska: { name: "Nebraska", abbr: "NE", counties: [
    { id: "douglas", name: "Douglas County (Omaha)", city: "Omaha", hasPublicApi: false },
    { id: "lancaster", name: "Lancaster County (Lincoln)", city: "Lincoln", hasPublicApi: false },
    { id: "sarpy", name: "Sarpy County (Bellevue)", city: "Papillion", hasPublicApi: false },
  ]},
  nevada: { name: "Nevada", abbr: "NV", counties: [
    { id: "clark", name: "Clark County (Las Vegas)", city: "Las Vegas", hasPublicApi: false },
    { id: "washoe", name: "Washoe County (Reno)", city: "Reno", hasPublicApi: false },
    { id: "carson", name: "Carson City", city: "Carson City", hasPublicApi: false },
  ]},
  new_hampshire: { name: "New Hampshire", abbr: "NH", counties: [
    { id: "hillsborough_nh", name: "Hillsborough County (Manchester)", city: "Manchester", hasPublicApi: false },
    { id: "rockingham", name: "Rockingham County (Nashua)", city: "Exeter", hasPublicApi: false },
    { id: "merrimack", name: "Merrimack County (Concord)", city: "Concord", hasPublicApi: false },
  ]},
  new_jersey: { name: "New Jersey", abbr: "NJ", counties: [
    { id: "essex", name: "Essex County (Newark)", city: "Newark", hasPublicApi: false },
    { id: "bergen", name: "Bergen County (Hackensack)", city: "Hackensack", hasPublicApi: false },
    { id: "hudson", name: "Hudson County (Jersey City)", city: "Jersey City", hasPublicApi: false },
    { id: "middlesex_nj", name: "Middlesex County (New Brunswick)", city: "New Brunswick", hasPublicApi: false },
    { id: "monmouth", name: "Monmouth County", city: "Freehold", hasPublicApi: false },
    { id: "ocean", name: "Ocean County (Toms River)", city: "Toms River", hasPublicApi: false },
    { id: "union_nj", name: "Union County (Elizabeth)", city: "Elizabeth", hasPublicApi: false },
    { id: "camden", name: "Camden County", city: "Camden", hasPublicApi: false },
  ]},
  new_mexico: { name: "New Mexico", abbr: "NM", counties: [
    { id: "bernalillo", name: "Bernalillo County (Albuquerque)", city: "Albuquerque", hasPublicApi: false },
    { id: "dona_ana", name: "Doña Ana County (Las Cruces)", city: "Las Cruces", hasPublicApi: false },
    { id: "santa_fe_nm", name: "Santa Fe County", city: "Santa Fe", hasPublicApi: false },
  ]},
  new_york: { name: "New York", abbr: "NY", counties: [
    { id: "nyc", name: "New York City (5 Boroughs)", city: "New York City", hasPublicApi: true },
    { id: "nassau", name: "Nassau County (Long Island)", city: "Mineola", hasPublicApi: false },
    { id: "suffolk_ny", name: "Suffolk County (Long Island)", city: "Riverhead", hasPublicApi: false },
    { id: "westchester", name: "Westchester County (White Plains)", city: "White Plains", hasPublicApi: false },
    { id: "erie", name: "Erie County (Buffalo)", city: "Buffalo", hasPublicApi: false },
    { id: "monroe_ny", name: "Monroe County (Rochester)", city: "Rochester", hasPublicApi: false },
    { id: "albany", name: "Albany County", city: "Albany", hasPublicApi: false },
    { id: "onondaga", name: "Onondaga County (Syracuse)", city: "Syracuse", hasPublicApi: false },
  ]},
  north_carolina: { name: "North Carolina", abbr: "NC", counties: [
    { id: "mecklenburg", name: "Mecklenburg County (Charlotte)", city: "Charlotte", hasPublicApi: false },
    { id: "wake", name: "Wake County (Raleigh)", city: "Raleigh", hasPublicApi: false },
    { id: "guilford", name: "Guilford County (Greensboro)", city: "Greensboro", hasPublicApi: false },
    { id: "forsyth", name: "Forsyth County (Winston-Salem)", city: "Winston-Salem", hasPublicApi: false },
    { id: "durham", name: "Durham County", city: "Durham", hasPublicApi: false },
    { id: "cumberland_nc", name: "Cumberland County (Fayetteville)", city: "Fayetteville", hasPublicApi: false },
    { id: "buncombe", name: "Buncombe County (Asheville)", city: "Asheville", hasPublicApi: false },
  ]},
  north_dakota: { name: "North Dakota", abbr: "ND", counties: [
    { id: "cass", name: "Cass County (Fargo)", city: "Fargo", hasPublicApi: false },
    { id: "burleigh", name: "Burleigh County (Bismarck)", city: "Bismarck", hasPublicApi: false },
    { id: "grand_forks", name: "Grand Forks County", city: "Grand Forks", hasPublicApi: false },
  ]},
  ohio: { name: "Ohio", abbr: "OH", counties: [
    { id: "cuyahoga", name: "Cuyahoga County (Cleveland)", city: "Cleveland", hasPublicApi: false },
    { id: "franklin", name: "Franklin County (Columbus)", city: "Columbus", hasPublicApi: false },
    { id: "hamilton_oh", name: "Hamilton County (Cincinnati)", city: "Cincinnati", hasPublicApi: false },
    { id: "summit", name: "Summit County (Akron)", city: "Akron", hasPublicApi: false },
    { id: "montgomery_oh", name: "Montgomery County (Dayton)", city: "Dayton", hasPublicApi: false },
    { id: "lucas", name: "Lucas County (Toledo)", city: "Toledo", hasPublicApi: false },
    { id: "stark", name: "Stark County (Canton)", city: "Canton", hasPublicApi: false },
  ]},
  oklahoma: { name: "Oklahoma", abbr: "OK", counties: [
    { id: "oklahoma_county", name: "Oklahoma County (Oklahoma City)", city: "Oklahoma City", hasPublicApi: false },
    { id: "tulsa", name: "Tulsa County", city: "Tulsa", hasPublicApi: false },
    { id: "cleveland_ok", name: "Cleveland County (Norman)", city: "Norman", hasPublicApi: false },
  ]},
  oregon: { name: "Oregon", abbr: "OR", counties: [
    { id: "multnomah", name: "Multnomah County (Portland)", city: "Portland", hasPublicApi: false },
    { id: "lane", name: "Lane County (Eugene)", city: "Eugene", hasPublicApi: false },
    { id: "marion_or", name: "Marion County (Salem)", city: "Salem", hasPublicApi: false },
    { id: "washington_or", name: "Washington County (Beaverton/Hillsboro)", city: "Hillsboro", hasPublicApi: false },
    { id: "clackamas", name: "Clackamas County", city: "Oregon City", hasPublicApi: false },
    { id: "jackson_or", name: "Jackson County (Medford)", city: "Medford", hasPublicApi: false },
    { id: "deschutes", name: "Deschutes County (Bend)", city: "Bend", hasPublicApi: false },
  ]},
  pennsylvania: { name: "Pennsylvania", abbr: "PA", counties: [
    { id: "philadelphia", name: "Philadelphia County", city: "Philadelphia", hasPublicApi: false },
    { id: "allegheny", name: "Allegheny County (Pittsburgh)", city: "Pittsburgh", hasPublicApi: false },
    { id: "montgomery_pa", name: "Montgomery County", city: "Norristown", hasPublicApi: false },
    { id: "bucks", name: "Bucks County", city: "Doylestown", hasPublicApi: false },
    { id: "chester_pa", name: "Chester County", city: "West Chester", hasPublicApi: false },
    { id: "lancaster_pa", name: "Lancaster County", city: "Lancaster", hasPublicApi: false },
    { id: "york_pa", name: "York County", city: "York", hasPublicApi: false },
    { id: "berks", name: "Berks County (Reading)", city: "Reading", hasPublicApi: false },
  ]},
  rhode_island: { name: "Rhode Island", abbr: "RI", counties: [
    { id: "providence", name: "Providence County", city: "Providence", hasPublicApi: false },
    { id: "kent_ri", name: "Kent County (Warwick)", city: "Warwick", hasPublicApi: false },
    { id: "washington_ri", name: "Washington County", city: "Wakefield", hasPublicApi: false },
  ]},
  south_carolina: { name: "South Carolina", abbr: "SC", counties: [
    { id: "greenville", name: "Greenville County", city: "Greenville", hasPublicApi: false },
    { id: "richland", name: "Richland County (Columbia)", city: "Columbia", hasPublicApi: false },
    { id: "charleston_sc", name: "Charleston County", city: "Charleston", hasPublicApi: false },
    { id: "spartanburg", name: "Spartanburg County", city: "Spartanburg", hasPublicApi: false },
  ]},
  south_dakota: { name: "South Dakota", abbr: "SD", counties: [
    { id: "minnehaha", name: "Minnehaha County (Sioux Falls)", city: "Sioux Falls", hasPublicApi: false },
    { id: "pennington", name: "Pennington County (Rapid City)", city: "Rapid City", hasPublicApi: false },
  ]},
  tennessee: { name: "Tennessee", abbr: "TN", counties: [
    { id: "shelby", name: "Shelby County (Memphis)", city: "Memphis", hasPublicApi: false },
    { id: "davidson", name: "Davidson County (Nashville)", city: "Nashville", hasPublicApi: false },
    { id: "knox", name: "Knox County (Knoxville)", city: "Knoxville", hasPublicApi: false },
    { id: "hamilton_tn", name: "Hamilton County (Chattanooga)", city: "Chattanooga", hasPublicApi: false },
    { id: "rutherford", name: "Rutherford County (Murfreesboro)", city: "Murfreesboro", hasPublicApi: false },
  ]},
  texas: { name: "Texas", abbr: "TX", counties: [
    { id: "harris", name: "Harris County (Houston)", city: "Houston", hasPublicApi: false },
    { id: "dallas", name: "Dallas County", city: "Dallas", hasPublicApi: false },
    { id: "travis", name: "Travis County (Austin)", city: "Austin", hasPublicApi: false },
    { id: "bexar", name: "Bexar County (San Antonio)", city: "San Antonio", hasPublicApi: false },
    { id: "tarrant", name: "Tarrant County (Fort Worth)", city: "Fort Worth", hasPublicApi: false },
    { id: "collin", name: "Collin County (Plano/Frisco)", city: "McKinney", hasPublicApi: false },
    { id: "hidalgo", name: "Hidalgo County (McAllen)", city: "Edinburg", hasPublicApi: false },
    { id: "denton", name: "Denton County", city: "Denton", hasPublicApi: false },
    { id: "el_paso_tx", name: "El Paso County", city: "El Paso", hasPublicApi: false },
    { id: "nueces", name: "Nueces County (Corpus Christi)", city: "Corpus Christi", hasPublicApi: false },
    { id: "williamson", name: "Williamson County (Round Rock)", city: "Georgetown", hasPublicApi: false },
    { id: "lubbock", name: "Lubbock County", city: "Lubbock", hasPublicApi: false },
  ]},
  utah: { name: "Utah", abbr: "UT", counties: [
    { id: "salt_lake", name: "Salt Lake County", city: "Salt Lake City", hasPublicApi: false },
    { id: "utah_county", name: "Utah County (Provo/Orem)", city: "Provo", hasPublicApi: false },
    { id: "davis", name: "Davis County (Layton)", city: "Farmington", hasPublicApi: false },
    { id: "weber", name: "Weber County (Ogden)", city: "Ogden", hasPublicApi: false },
    { id: "washington_ut", name: "Washington County (St. George)", city: "St. George", hasPublicApi: false },
  ]},
  vermont: { name: "Vermont", abbr: "VT", counties: [
    { id: "chittenden", name: "Chittenden County (Burlington)", city: "Burlington", hasPublicApi: false },
    { id: "rutland", name: "Rutland County", city: "Rutland", hasPublicApi: false },
    { id: "washington_vt", name: "Washington County (Montpelier)", city: "Montpelier", hasPublicApi: false },
  ]},
  virginia: { name: "Virginia", abbr: "VA", counties: [
    { id: "fairfax", name: "Fairfax County", city: "Fairfax", hasPublicApi: false },
    { id: "virginia_beach", name: "Virginia Beach City", city: "Virginia Beach", hasPublicApi: false },
    { id: "richmond", name: "Richmond City", city: "Richmond", hasPublicApi: false },
    { id: "arlington", name: "Arlington County", city: "Arlington", hasPublicApi: false },
    { id: "chesapeake", name: "Chesapeake City", city: "Chesapeake", hasPublicApi: false },
    { id: "norfolk", name: "Norfolk City", city: "Norfolk", hasPublicApi: false },
    { id: "chesterfield", name: "Chesterfield County", city: "Chesterfield", hasPublicApi: false },
    { id: "loudoun", name: "Loudoun County", city: "Leesburg", hasPublicApi: false },
  ]},
  washington: { name: "Washington", abbr: "WA", counties: [
    { id: "king", name: "King County (Seattle)", city: "Seattle", hasPublicApi: true },
    { id: "snohomish", name: "Snohomish County (Everett)", city: "Everett", hasPublicApi: false },
    { id: "pierce", name: "Pierce County (Tacoma)", city: "Tacoma", hasPublicApi: false },
    { id: "clark_wa", name: "Clark County (Vancouver)", city: "Vancouver", hasPublicApi: false },
    { id: "spokane", name: "Spokane County", city: "Spokane", hasPublicApi: false },
    { id: "thurston", name: "Thurston County (Olympia)", city: "Olympia", hasPublicApi: false },
    { id: "kitsap", name: "Kitsap County (Bremerton)", city: "Bremerton", hasPublicApi: false },
    { id: "whatcom", name: "Whatcom County (Bellingham)", city: "Bellingham", hasPublicApi: false },
    { id: "benton_wa", name: "Benton County (Kennewick/Richland)", city: "Kennewick", hasPublicApi: false },
    { id: "yakima", name: "Yakima County", city: "Yakima", hasPublicApi: false },
  ]},
  west_virginia: { name: "West Virginia", abbr: "WV", counties: [
    { id: "kanawha", name: "Kanawha County (Charleston)", city: "Charleston", hasPublicApi: false },
    { id: "cabell", name: "Cabell County (Huntington)", city: "Huntington", hasPublicApi: false },
    { id: "monongalia", name: "Monongalia County (Morgantown)", city: "Morgantown", hasPublicApi: false },
  ]},
  wisconsin: { name: "Wisconsin", abbr: "WI", counties: [
    { id: "milwaukee", name: "Milwaukee County", city: "Milwaukee", hasPublicApi: false },
    { id: "dane", name: "Dane County (Madison)", city: "Madison", hasPublicApi: false },
    { id: "waukesha", name: "Waukesha County", city: "Waukesha", hasPublicApi: false },
    { id: "brown", name: "Brown County (Green Bay)", city: "Green Bay", hasPublicApi: false },
    { id: "racine", name: "Racine County", city: "Racine", hasPublicApi: false },
  ]},
  wyoming: { name: "Wyoming", abbr: "WY", counties: [
    { id: "laramie", name: "Laramie County (Cheyenne)", city: "Cheyenne", hasPublicApi: false },
    { id: "natrona", name: "Natrona County (Casper)", city: "Casper", hasPublicApi: false },
    { id: "teton", name: "Teton County (Jackson)", city: "Jackson", hasPublicApi: false },
  ]},
};

export function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getGradeColor(grade) {
  switch (grade) {
    case "A": return "bg-slate-900 text-white";
    case "B": return "bg-slate-600 text-white";
    case "C": return "bg-amber-500 text-white";
    case "D": return "bg-orange-500 text-white";
    case "F": return "bg-red-600 text-white";
    default: return "bg-slate-400 text-white";
  }
}

function processKingCountyResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.business_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.name || row.inspection_business_name,
        address: row.address,
        city: row.city,
        zip_code: row.zip_code,
        phone: row.phone,
        description: row.description,
        inspections: [],
        allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const serialNum = row.inspection_serial_num;
    if (!businesses[id].inspections.find((i) => i.serial === serialNum)) {
      businesses[id].inspections.push({
        serial: serialNum,
        date: row.inspection_date,
        score: parseInt(row.inspection_score) || 0,
        result: row.inspection_result,
      });
    }
  });

  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = Math.max(0, Math.min(100, 100 - (latest?.score || 0)));
    const rowWithCoords = biz.allRows.find((r) => r.latitude && r.longitude);
    return {
      ...biz,
      safetyScore,
      grade: getGrade(safetyScore),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: latest?.result,
      latitude: rowWithCoords?.latitude,
      longitude: rowWithCoords?.longitude,
      isLLMData: false,
      source: 'king',
    };
  });
}

function processNYCResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.camis;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.dba || row.aka_name,
        address: `${row.building || ''} ${row.street || ''}`.trim(),
        city: row.boro ? row.boro.charAt(0) + row.boro.slice(1).toLowerCase() : 'New York City',
        zip_code: row.zipcode,
        phone: row.phone,
        description: row.cuisine_description || '',
        inspections: [],
        allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const inspKey = `${row.inspection_date}-${row.inspection_type}`;
    if (!businesses[id].inspections.find((i) => i.serial === inspKey)) {
      businesses[id].inspections.push({
        serial: inspKey,
        date: row.inspection_date,
        score: parseInt(row.score) || 0,
        result: row.action || '',
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = Math.max(0, Math.min(100, 100 - (latest?.score || 0)));
    const rowWithCoords = biz.allRows.find((r) => r.latitude && r.longitude);
    return {
      ...biz,
      safetyScore,
      grade: getGrade(safetyScore),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: latest?.result,
      latitude: rowWithCoords?.latitude,
      longitude: rowWithCoords?.longitude,
      isLLMData: false,
      source: 'nyc',
    };
  });
}

function nycToDetailRows(data) {
  return data.map((row) => ({
    inspection_serial_num: `${row.inspection_date}-${row.inspection_type}-${row.violation_code || Math.random()}`,
    inspection_date: row.inspection_date,
    inspection_score: String(row.score || 0),
    inspection_result: row.action || '',
    inspection_type: row.inspection_type || '',
    violation_description: row.violation_description || '',
    violation_type: row.critical_flag === 'Critical' ? 'RED' : 'BLUE',
    violation_points: String(row.score || 0),
  }));
}

function chicagoToDetailRows(data) {
  const rows = [];
  data.forEach((row) => {
    const result = row.results || '';
    const pts = result === 'Pass' ? 8 : result === 'Pass w/ Conditions' ? 24 : 55;
    const violationsStr = row.violations || '';
    const violationList = violationsStr.split('|').map((v) => v.trim()).filter(Boolean);
    const inspKey = row.inspection_id;
    if (violationList.length === 0) {
      rows.push({ inspection_serial_num: inspKey, inspection_date: row.inspection_date, inspection_score: String(pts), inspection_result: result, inspection_type: row.inspection_type || '', violation_description: '', violation_type: '', violation_points: '0' });
    } else {
      violationList.forEach((v) => {
        rows.push({ inspection_serial_num: inspKey, inspection_date: row.inspection_date, inspection_score: String(pts), inspection_result: result, inspection_type: row.inspection_type || '', violation_description: v, violation_type: 'BLUE', violation_points: '0' });
      });
    }
  });
  return rows;
}

function montgomeryToDetailRows(data) {
  const VKEYS = ['violation1','violation2','violation3','violation4','violation5','violation6a','violation6b','violation7a','violation7b','violation8','violation9'];
  const rows = [];
  data.forEach((row) => {
    const outViolations = VKEYS.filter((k) => row[k] === 'Out of Compliance');
    const pts = outViolations.length === 0 ? 5 : outViolations.length === 1 ? 18 : outViolations.length === 2 ? 30 : 45;
    const inspKey = `${row.inspectiondate}-${row.inspectiontype || 'inspection'}`;
    if (outViolations.length === 0) {
      rows.push({ inspection_serial_num: inspKey, inspection_date: row.inspectiondate, inspection_score: String(pts), inspection_result: row.inspectionresults || '', inspection_type: row.inspectiontype || '', violation_description: '', violation_type: '', violation_points: '0' });
    } else {
      outViolations.forEach((key) => {
        rows.push({ inspection_serial_num: inspKey, inspection_date: row.inspectiondate, inspection_score: String(pts), inspection_result: row.inspectionresults || '', inspection_type: row.inspectiontype || '', violation_description: `${key.replace('violation', 'Violation ').toUpperCase()}: Out of Compliance`, violation_type: 'RED', violation_points: '0' });
      });
    }
  });
  return rows;
}

function llmToDetailRows(restaurant) {
  const rows = [];
  (restaurant.allInspections || []).forEach((insp, inspIndex) => {
    const violations = insp.violations || [];
    if (violations.length === 0) {
      rows.push({
        inspection_serial_num: `llm-${inspIndex}`,
        inspection_date: insp.date,
        inspection_score: String(insp.violation_points || 0),
        inspection_result: insp.result || "Unknown",
        inspection_type: insp.type || "Routine",
        violation_description: "",
        violation_type: "",
        violation_points: "0",
      });
    } else {
      violations.forEach((v) => {
        rows.push({
          inspection_serial_num: `llm-${inspIndex}`,
          inspection_date: insp.date,
          inspection_score: String(insp.violation_points || 0),
          inspection_result: insp.result || "Unknown",
          inspection_type: insp.type || "Routine",
          violation_description: typeof v === "string" ? v : v.description || "",
          violation_type: typeof v === "object" && v.severity === "critical" ? "RED" : "BLUE",
          violation_points: typeof v === "object" ? String(v.points || 0) : "0",
        });
      });
    }
  });
  return rows;
}

async function geocodeAddress(address, city, stateAbbr) {
  const query = `${address}, ${city}, ${stateAbbr}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
  const data = await res.json();
  if (data.length > 0) return { latitude: data[0].lat, longitude: data[0].lon };
  return null;
}

export default function Home() {
  const [region, setRegion] = useState("washington");
  const [countyId, setCountyId] = useState("king");
  const [pendingSearch, setPendingSearch] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [filterResult, setFilterResult] = useState("all");
  const [sortBy, setSortBy] = useState("score-high");
  const [isGeocodingMap, setIsGeocodingMap] = useState(false);

  const currentRegion = REGIONS[region];
  const currentCounty = currentRegion.counties.find((c) => c.id === countyId) || currentRegion.counties[0];

  // Auto-search when navigated here from CountyDrillDown with ?q=&region=&county= params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const r = params.get("region");
    const c = params.get("county");
    if (q) {
      if (r && REGIONS[r]) setRegion(r);
      if (c) setCountyId(c);
      setPendingSearch(q);
    }
  }, []);

  // Fire the search once region/county have settled
  useEffect(() => {
    if (pendingSearch) {
      setPendingSearch(null);
      handleSearch(pendingSearch);
    }
  }, [countyId, pendingSearch]);

  const resetSearch = () => {
    setResults([]);
    setHasSearched(false);
    setSelectedBusiness(null);
    setViewMode("list");
  };

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
    setCountyId(REGIONS[newRegion].counties[0].id);
    resetSearch();
  };

  const handleSearch = useCallback(
    async (query) => {
      setIsLoading(true);
      setHasSearched(true);
      setSearchQuery(query);
      setSelectedBusiness(null);
      setViewMode("list");

      if (countyId === "nyc") {
        // NYC Open Data API (real-time)
        const normalized = query.replace(/['''\-]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
        const orig = encodeURIComponent(query.toUpperCase());
        const norm = encodeURIComponent(normalized);
        const url = `${NYC_API}?$where=upper(replace(replace(dba,chr(39),''),'-','')) like '%25${norm}%25' OR upper(dba) like '%25${orig}%25' OR upper(replace(replace(aka_name,chr(39),''),'-','')) like '%25${norm}%25' OR upper(building || ' ' || street) like '%25${orig}%25'&$limit=500&$order=inspection_date DESC`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch NYC data");
        const data = await response.json();
        setResults(processNYCResults(data));
      } else if (countyId === "cook") {
        // Chicago Open Data API (real-time)
        const encoded = encodeURIComponent(query.toUpperCase());
        const url = `${CHICAGO_API}?$where=upper(dba_name) like '%25${encoded}%25' OR upper(aka_name) like '%25${encoded}%25' OR upper(address) like '%25${encoded}%25'&$limit=500&$order=inspection_date DESC`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch Chicago data");
        const data = await response.json();
        setResults(processChicagoResults(data));
      } else if (countyId === "montgomery_md") {
        // Montgomery County MD Open Data API (real-time)
        const encoded = encodeURIComponent(query.toUpperCase());
        const url = `${MONTGOMERY_API}?$where=upper(name) like '%25${encoded}%25' OR upper(address1) like '%25${encoded}%25'&$limit=500&$order=inspectiondate DESC`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch Montgomery County data");
        const data = await response.json();
        setResults(processMontgomeryResults(data));
      } else if (currentCounty.hasPublicApi) {
        // King County API (real-time)
        const encodedOriginal = encodeURIComponent(query.toUpperCase());
        const cleanedQuery = query.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
        const encodedClean = encodeURIComponent(cleanedQuery.toUpperCase());
        const url = `${KING_API}?$where=upper(name) like '%25${encodedOriginal}%25' OR upper(address) like '%25${encodedOriginal}%25' OR upper(replace(name,chr(39),'')) like '%25${encodedClean}%25' OR upper(replace(name,'-','')) like '%25${encodedClean}%25'&$limit=500&$order=inspection_date DESC`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        setResults(processKingCountyResults(data));
      } else {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Search official health department records for food establishments matching "${query}" in ${currentCounty.name}, ${currentRegion.abbr}. Case-insensitive, apostrophe-agnostic, dash-agnostic. Return ALL matching establishments with their most recent inspection info only. IMPORTANT: latest_score must be a SAFETY score from 0 to 100, where 100 = perfect (no violations, passed cleanly) and 0 = critical failure. Do NOT return raw penalty points — convert them: if a place passed with 0 violations, return 100. If it had minor issues, return 70-90. If it failed, return below 60. Also return up to 3 violations. Keep each violation description under 80 characters.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              restaurants: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    address: { type: "string" },
                    city: { type: "string" },
                    zip_code: { type: "string" },
                    phone: { type: "string" },
                    latest_score: { type: "number" },
                    latest_date: { type: "string" },
                    latest_result: { type: "string" },
                    total_inspections: { type: "number" },
                    violations: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        });

        const rawRestaurants = (result?.restaurants || []).map((r, index) => {
          let safetyScore = Math.max(0, Math.min(100, Number(r.latest_score) || 0));
          // If score is 0 but result indicates a pass, the LLM returned penalty points (0 = perfect)
          if (safetyScore === 0 && r.latest_result && /pass|satisf|complian|approved|ok/i.test(r.latest_result)) {
            safetyScore = 95;
          }
          return {
            business_id: `${countyId}-${index}-${r.name}`,
            name: r.name,
            address: r.address || "",
            city: r.city || currentCounty.city,
            zip_code: r.zip_code || "",
            phone: r.phone || "",
            website: "",
            description: "",
            safetyScore,
            grade: getGrade(safetyScore),
            totalInspections: r.total_inspections || 1,
            latestDate: r.latest_date || "",
            latestResult: r.latest_result || "",
            latitude: null,
            longitude: null,
            isLLMData: true,
            source: 'llm',
            allInspections: [{
              date: r.latest_date || "",
              score: safetyScore,
              result: r.latest_result || "",
              type: "Routine",
              violation_points: Math.max(0, 100 - safetyScore),
              violations: (r.violations || []).map((v) => ({ description: v, severity: "minor", points: 0 })),
            }],
            allRows: [],
          };
        });

        // Deduplicate by normalized name+address — keep the entry with more inspections
        const seen = new Map();
        rawRestaurants.forEach((r) => {
          const key = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${r.address.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
          if (!seen.has(key) || r.totalInspections > seen.get(key).totalInspections) {
            seen.set(key, r);
          }
        });
        const restaurants = Array.from(seen.values());

        setResults(restaurants);
      }
      setIsLoading(false);
    },
    [currentCounty, currentRegion, countyId]
  );

  const handleSelectBusiness = useCallback(async (biz) => {
    setIsDetailLoading(true);
    setSelectedBusiness(biz);
    if (biz.source === 'nyc') {
      const url = `${NYC_API}?camis=${biz.business_id}&$limit=1000&$order=inspection_date DESC`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch NYC details");
      const data = await response.json();
      setDetailRows(nycToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === 'chicago') {
      const url = `${CHICAGO_API}?license_=${biz.business_id}&$limit=1000&$order=inspection_date DESC`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch Chicago details");
      const data = await response.json();
      setDetailRows(chicagoToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === 'montgomery') {
      const url = `${MONTGOMERY_API}?establishment_id=${biz.business_id}&$limit=1000&$order=inspectiondate DESC`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch Montgomery County details");
      const data = await response.json();
      setDetailRows(montgomeryToDetailRows(Array.isArray(data) ? data : []));
    } else if (!biz.isLLMData) {
      const url = `${KING_API}?business_id=${biz.business_id}&$limit=1000&$order=inspection_date DESC`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch details");
      const data = await response.json();
      setDetailRows(Array.isArray(data) ? data : []);
    } else {
      setDetailRows(llmToDetailRows(biz));
    }
    setIsDetailLoading(false);
  }, []);

  const handleSwitchToMap = useCallback(async () => {
    setViewMode("map");
    const needsGeocode = results.some((r) => !r.latitude);
    if (!needsGeocode) return;
    setIsGeocodingMap(true);
    const geocoded = await Promise.all(
      results.map(async (r) => {
        if (r.latitude && r.longitude) return r;
        const coords = await geocodeAddress(r.address, r.city, currentRegion.abbr);
        return coords ? { ...r, ...coords } : r;
      })
    );
    setResults(geocoded);
    setIsGeocodingMap(false);
  }, [results, currentRegion.abbr]);

  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];
    if (filterResult !== "all") filtered = filtered.filter((r) => r.latestResult === filterResult);
    switch (sortBy) {
      case "score-high": filtered.sort((a, b) => b.safetyScore - a.safetyScore || b.totalInspections - a.totalInspections); break;
      case "score-low": filtered.sort((a, b) => a.safetyScore - b.safetyScore || b.totalInspections - a.totalInspections); break;
      case "inspections": filtered.sort((a, b) => b.totalInspections - a.totalInspections || b.safetyScore - a.safetyScore); break;
      case "date-recent": filtered.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate) || b.totalInspections - a.totalInspections); break;
      case "date-oldest": filtered.sort((a, b) => new Date(a.latestDate) - new Date(b.latestDate) || b.totalInspections - a.totalInspections); break;
      default: filtered.sort((a, b) => b.safetyScore - a.safetyScore || b.totalInspections - a.totalInspections);
    }
    return filtered;
  }, [results, filterResult, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              Is your restaurant
              <br className="hidden sm:block" />
              <span className="text-slate-400"> safe to eat at?</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-400 font-medium">
              Real health inspection data — every county, one platform
            </p>
          </div>

          {/* State selector */}
          <div className="flex justify-center mb-4">
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer min-w-[220px]"
            >
              {Object.entries(REGIONS)
                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                .map(([key, reg]) => (
                  <option key={key} value={key}>{reg.name} ({reg.abbr})</option>
                ))}
            </select>
          </div>

          {/* County selector */}
          <div className="flex justify-center mb-6">
            <select
              value={countyId}
              onChange={(e) => { setCountyId(e.target.value); resetSearch(); }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer min-w-[260px]"
            >
              {currentRegion.counties.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {!currentCounty.hasPublicApi && (
            <p className="text-center text-xs text-slate-500 mt-3">
              AI-assisted lookup for {currentCounty.name} · searches publicly available official health department records · results may be incomplete if this jurisdiction does not publish data online
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-20 pt-8">
        {!hasSearched && (
          <div className="mb-10">
            <NationalHeatMap />
          </div>
        )}
        <AnimatePresence mode="wait">
          {selectedBusiness ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-400">Loading inspection details...</p>
                </div>
              ) : (
                <RestaurantDetail
                  restaurant={selectedBusiness}
                  inspections={detailRows}
                  onBack={() => setSelectedBusiness(null)}
                />
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {hasSearched && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-slate-400">Searching {currentCounty.name} records…</p>
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-slate-500">
                              <span className="font-semibold text-slate-800">{filteredAndSortedResults.length}</span> of {results.length} establishment{results.length !== 1 ? "s" : ""} for "{searchQuery}"
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Ties broken by inspection count — consistency over time ranks higher, regardless of establishment type.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewMode("list")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >List</button>
                            <button
                              onClick={viewMode !== "map" ? handleSwitchToMap : undefined}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "map" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >Map</button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <FilterSortControls
                            filterResult={filterResult}
                            onFilterChange={setFilterResult}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                          />
                        </div>

                        <div className="mb-6">
                          <DataVisualizations restaurants={filteredAndSortedResults} />
                        </div>

                        {viewMode === "map" ? (
                          isGeocodingMap ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
                              <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-3" />
                              <p className="text-sm text-slate-500">Geocoding map locations…</p>
                            </div>
                          ) : (
                            <MapView restaurants={filteredAndSortedResults} onSelectRestaurant={handleSelectBusiness} />
                          )
                        ) : (
                          <div className="space-y-3">
                            {filteredAndSortedResults.map((r) => (
                              <div key={r.business_id}>
                                <RestaurantCard restaurant={r} onClick={() => handleSelectBusiness(r)} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Utensils className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">No results found</h3>
                        <p className="text-sm text-slate-400 mt-1">Try a different restaurant name or address</p>
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <div className="sticky top-6">
                      <ScoreLegend />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}