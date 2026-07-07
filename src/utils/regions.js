export const REGIONS = {
  alabama: { name: "Alabama", abbr: "AL", counties: [
    { id: "jefferson", name: "Jefferson County (Birmingham)", city: "Birmingham", hasPublicApi: true },
    { id: "mobile", name: "Mobile County", city: "Mobile", hasPublicApi: true },
    { id: "madison", name: "Madison County (Huntsville)", city: "Huntsville", hasPublicApi: true },
    { id: "montgomery", name: "Montgomery County", city: "Montgomery", hasPublicApi: true },
  ]},
  alaska: { name: "Alaska", abbr: "AK", counties: [
    { id: "anchorage", name: "Municipality of Anchorage", city: "Anchorage", hasPublicApi: true },
    { id: "fairbanks", name: "Fairbanks North Star Borough", city: "Fairbanks", hasPublicApi: true },
    { id: "juneau", name: "City & Borough of Juneau", city: "Juneau", hasPublicApi: true },
  ]},
  arizona: { name: "Arizona", abbr: "AZ", counties: [
    { id: "maricopa", name: "Maricopa County (Phoenix)", city: "Phoenix", hasPublicApi: true },
    { id: "pima", name: "Pima County (Tucson)", city: "Tucson", hasPublicApi: true },
    { id: "pinal", name: "Pinal County (Mesa/Gilbert)", city: "Florence", hasPublicApi: true },
    { id: "yavapai", name: "Yavapai County (Prescott)", city: "Prescott", hasPublicApi: true },
    { id: "coconino", name: "Coconino County (Flagstaff)", city: "Flagstaff", hasPublicApi: true },
  ]},
  arkansas: { name: "Arkansas", abbr: "AR", counties: [
    { id: "pulaski", name: "Pulaski County (Little Rock)", city: "Little Rock", hasPublicApi: true },
    { id: "benton", name: "Benton County (Bentonville)", city: "Bentonville", hasPublicApi: true },
    { id: "washington_ar", name: "Washington County (Fayetteville)", city: "Fayetteville", hasPublicApi: true },
  ]},
  california: { name: "California", abbr: "CA", counties: [
    { id: "la", name: "Los Angeles County", city: "Los Angeles", hasPublicApi: true },
    { id: "sf", name: "San Francisco County", city: "San Francisco", hasPublicApi: true },
    { id: "sandiego", name: "San Diego County", city: "San Diego", hasPublicApi: true },
    { id: "sacramento", name: "Sacramento County", city: "Sacramento", hasPublicApi: true },
    { id: "alameda", name: "Alameda County (Oakland)", city: "Oakland", hasPublicApi: true },
    { id: "orange_ca", name: "Orange County (Anaheim)", city: "Santa Ana", hasPublicApi: true },
    { id: "riverside", name: "Riverside County", city: "Riverside", hasPublicApi: true },
    { id: "sanbernardino", name: "San Bernardino County", city: "San Bernardino", hasPublicApi: true },
    { id: "santaclara", name: "Santa Clara County (San Jose)", city: "San Jose", hasPublicApi: true },
    { id: "fresno", name: "Fresno County", city: "Fresno", hasPublicApi: true },
    { id: "kern", name: "Kern County (Bakersfield)", city: "Bakersfield", hasPublicApi: true },
    { id: "ventura", name: "Ventura County", city: "Ventura", hasPublicApi: true },
  ]},
  colorado: { name: "Colorado", abbr: "CO", counties: [
    { id: "denver", name: "Denver County", city: "Denver", hasPublicApi: true },
    { id: "el_paso", name: "El Paso County (Colorado Springs)", city: "Colorado Springs", hasPublicApi: true },
    { id: "boulder", name: "Boulder County", city: "Boulder", hasPublicApi: true },
    { id: "arapahoe", name: "Arapahoe County (Aurora)", city: "Centennial", hasPublicApi: true },
    { id: "adams", name: "Adams County", city: "Brighton", hasPublicApi: true },
    { id: "larimer", name: "Larimer County (Fort Collins)", city: "Fort Collins", hasPublicApi: true },
    { id: "jefferson_co", name: "Jefferson County (Lakewood)", city: "Golden", hasPublicApi: true },
  ]},
  connecticut: { name: "Connecticut", abbr: "CT", counties: [
    { id: "hartford", name: "Hartford County", city: "Hartford", hasPublicApi: true },
    { id: "new_haven", name: "New Haven County", city: "New Haven", hasPublicApi: true },
    { id: "fairfield", name: "Fairfield County (Bridgeport)", city: "Bridgeport", hasPublicApi: true },
  ]},
  delaware: { name: "Delaware", abbr: "DE", counties: [
    { id: "new_castle", name: "New Castle County (Wilmington)", city: "Wilmington", hasPublicApi: true },
    { id: "kent", name: "Kent County (Dover)", city: "Dover", hasPublicApi: true },
    { id: "sussex", name: "Sussex County", city: "Georgetown", hasPublicApi: true },
  ]},
  dc: { name: "Washington D.C.", abbr: "DC", counties: [
    { id: "dc", name: "District of Columbia", city: "Washington D.C.", hasPublicApi: true },
  ]},
  florida: { name: "Florida", abbr: "FL", counties: [
    { id: "miami_dade", name: "Miami-Dade County", city: "Miami", hasPublicApi: true },
    { id: "broward", name: "Broward County (Fort Lauderdale)", city: "Fort Lauderdale", hasPublicApi: true },
    { id: "orange_fl", name: "Orange County (Orlando)", city: "Orlando", hasPublicApi: true },
    { id: "hillsborough", name: "Hillsborough County (Tampa)", city: "Tampa", hasPublicApi: true },
    { id: "palm_beach", name: "Palm Beach County", city: "West Palm Beach", hasPublicApi: true },
    { id: "pinellas", name: "Pinellas County (St. Petersburg)", city: "Clearwater", hasPublicApi: true },
    { id: "duval", name: "Duval County (Jacksonville)", city: "Jacksonville", hasPublicApi: true },
    { id: "polk", name: "Polk County (Lakeland)", city: "Bartow", hasPublicApi: true },
    { id: "lee", name: "Lee County (Fort Myers)", city: "Fort Myers", hasPublicApi: true },
  ]},
  georgia: { name: "Georgia", abbr: "GA", counties: [
    { id: "fulton", name: "Fulton County (Atlanta)", city: "Atlanta", hasPublicApi: true },
    { id: "dekalb", name: "DeKalb County", city: "Decatur", hasPublicApi: true },
    { id: "gwinnett", name: "Gwinnett County", city: "Lawrenceville", hasPublicApi: true },
    { id: "cobb", name: "Cobb County (Marietta)", city: "Marietta", hasPublicApi: true },
    { id: "chatham", name: "Chatham County (Savannah)", city: "Savannah", hasPublicApi: true },
    { id: "bibb", name: "Bibb County (Macon)", city: "Macon", hasPublicApi: true },
  ]},
  hawaii: { name: "Hawaii", abbr: "HI", counties: [
    { id: "honolulu", name: "City & County of Honolulu", city: "Honolulu", hasPublicApi: true },
    { id: "maui", name: "Maui County", city: "Wailuku", hasPublicApi: true },
    { id: "hawaii_county", name: "Hawaii County (Big Island)", city: "Hilo", hasPublicApi: true },
    { id: "kauai", name: "Kauai County", city: "Lihue", hasPublicApi: true },
  ]},
  idaho: { name: "Idaho", abbr: "ID", counties: [
    { id: "ada", name: "Ada County (Boise)", city: "Boise", hasPublicApi: true },
    { id: "canyon", name: "Canyon County (Nampa)", city: "Caldwell", hasPublicApi: true },
    { id: "kootenai", name: "Kootenai County (Coeur d'Alene)", city: "Coeur d'Alene", hasPublicApi: true },
  ]},
  illinois: { name: "Illinois", abbr: "IL", counties: [
    { id: "cook", name: "Cook County (Chicago)", city: "Chicago", hasPublicApi: true },
    { id: "dupage", name: "DuPage County", city: "Wheaton", hasPublicApi: true },
    { id: "lake_il", name: "Lake County", city: "Waukegan", hasPublicApi: true },
    { id: "will", name: "Will County (Joliet)", city: "Joliet", hasPublicApi: true },
    { id: "kane", name: "Kane County", city: "Geneva", hasPublicApi: true },
    { id: "sangamon", name: "Sangamon County (Springfield)", city: "Springfield", hasPublicApi: true },
  ]},
  indiana: { name: "Indiana", abbr: "IN", counties: [
    { id: "marion", name: "Marion County (Indianapolis)", city: "Indianapolis", hasPublicApi: true },
    { id: "lake_in", name: "Lake County (Gary)", city: "Gary", hasPublicApi: true },
    { id: "allen", name: "Allen County (Fort Wayne)", city: "Fort Wayne", hasPublicApi: true },
    { id: "hamilton_in", name: "Hamilton County (Carmel)", city: "Noblesville", hasPublicApi: true },
  ]},
  iowa: { name: "Iowa", abbr: "IA", counties: [
    { id: "polk_ia", name: "Polk County (Des Moines)", city: "Des Moines", hasPublicApi: true },
    { id: "linn", name: "Linn County (Cedar Rapids)", city: "Cedar Rapids", hasPublicApi: true },
    { id: "scott", name: "Scott County (Davenport)", city: "Davenport", hasPublicApi: true },
    { id: "johnson", name: "Johnson County (Iowa City)", city: "Iowa City", hasPublicApi: true },
  ]},
  kansas: { name: "Kansas", abbr: "KS", counties: [
    { id: "johnson_ks", name: "Johnson County (Overland Park)", city: "Olathe", hasPublicApi: true },
    { id: "sedgwick", name: "Sedgwick County (Wichita)", city: "Wichita", hasPublicApi: true },
    { id: "wyandotte", name: "Wyandotte County (Kansas City KS)", city: "Kansas City", hasPublicApi: true },
    { id: "shawnee", name: "Shawnee County (Topeka)", city: "Topeka", hasPublicApi: true },
  ]},
  kentucky: { name: "Kentucky", abbr: "KY", counties: [
    { id: "jefferson_ky", name: "Jefferson County (Louisville)", city: "Louisville", hasPublicApi: true },
    { id: "fayette", name: "Fayette County (Lexington)", city: "Lexington", hasPublicApi: true },
    { id: "boone", name: "Boone County", city: "Burlington", hasPublicApi: true },
  ]},
  louisiana: { name: "Louisiana", abbr: "LA", counties: [
    { id: "orleans", name: "Orleans Parish (New Orleans)", city: "New Orleans", hasPublicApi: true },
    { id: "east_baton_rouge", name: "East Baton Rouge Parish", city: "Baton Rouge", hasPublicApi: true },
    { id: "jefferson_la", name: "Jefferson Parish (Metairie)", city: "Gretna", hasPublicApi: true },
    { id: "caddo", name: "Caddo Parish (Shreveport)", city: "Shreveport", hasPublicApi: true },
  ]},
  maine: { name: "Maine", abbr: "ME", counties: [
    { id: "cumberland", name: "Cumberland County (Portland)", city: "Portland", hasPublicApi: true },
    { id: "penobscot", name: "Penobscot County (Bangor)", city: "Bangor", hasPublicApi: true },
    { id: "york", name: "York County", city: "Alfred", hasPublicApi: true },
  ]},
  maryland: { name: "Maryland", abbr: "MD", counties: [
    { id: "baltimore_city", name: "Baltimore City", city: "Baltimore", hasPublicApi: true },
    { id: "baltimore_county", name: "Baltimore County", city: "Towson", hasPublicApi: true },
    { id: "montgomery_md", name: "Montgomery County", city: "Rockville", hasPublicApi: true },
    { id: "prince_georges", name: "Prince George's County", city: "Upper Marlboro", hasPublicApi: true },
    { id: "anne_arundel", name: "Anne Arundel County (Annapolis)", city: "Annapolis", hasPublicApi: true },
    { id: "howard", name: "Howard County (Columbia)", city: "Ellicott City", hasPublicApi: true },
  ]},
  massachusetts: { name: "Massachusetts", abbr: "MA", counties: [
    { id: "boston", name: "City of Boston", city: "Boston", hasPublicApi: true },
    { id: "suffolk", name: "Suffolk County (Boston)", city: "Boston", hasPublicApi: true },
    { id: "middlesex", name: "Middlesex County (Cambridge)", city: "Cambridge", hasPublicApi: true },
    { id: "worcester", name: "Worcester County", city: "Worcester", hasPublicApi: true },
    { id: "hampden", name: "Hampden County (Springfield)", city: "Springfield", hasPublicApi: true },
    { id: "norfolk", name: "Norfolk County (Quincy)", city: "Dedham", hasPublicApi: true },
    { id: "essex_ma", name: "Essex County (Salem/Lawrence)", city: "Salem", hasPublicApi: true },
  ]},
  michigan: { name: "Michigan", abbr: "MI", counties: [
    { id: "wayne", name: "Wayne County (Detroit)", city: "Detroit", hasPublicApi: true },
    { id: "kent", name: "Kent County (Grand Rapids)", city: "Grand Rapids", hasPublicApi: true },
    { id: "oakland", name: "Oakland County", city: "Pontiac", hasPublicApi: true },
    { id: "macomb", name: "Macomb County", city: "Mount Clemens", hasPublicApi: true },
    { id: "ingham", name: "Ingham County (Lansing)", city: "Lansing", hasPublicApi: true },
    { id: "washtenaw", name: "Washtenaw County (Ann Arbor)", city: "Ann Arbor", hasPublicApi: true },
  ]},
  minnesota: { name: "Minnesota", abbr: "MN", counties: [
    { id: "hennepin", name: "Hennepin County (Minneapolis)", city: "Minneapolis", hasPublicApi: true },
    { id: "ramsey", name: "Ramsey County (St. Paul)", city: "St. Paul", hasPublicApi: true },
    { id: "dakota", name: "Dakota County", city: "Hastings", hasPublicApi: true },
    { id: "anoka", name: "Anoka County", city: "Anoka", hasPublicApi: true },
    { id: "st_louis_mn", name: "St. Louis County (Duluth)", city: "Duluth", hasPublicApi: true },
  ]},
  mississippi: { name: "Mississippi", abbr: "MS", counties: [
    { id: "hinds", name: "Hinds County (Jackson)", city: "Jackson", hasPublicApi: true },
    { id: "harrison", name: "Harrison County (Biloxi)", city: "Gulfport", hasPublicApi: true },
    { id: "desoto", name: "DeSoto County (Southaven)", city: "Hernando", hasPublicApi: true },
  ]},
  missouri: { name: "Missouri", abbr: "MO", counties: [
    { id: "st_louis_city", name: "St. Louis City", city: "St. Louis", hasPublicApi: true },
    { id: "st_louis_county", name: "St. Louis County", city: "Clayton", hasPublicApi: true },
    { id: "jackson", name: "Jackson County (Kansas City)", city: "Kansas City", hasPublicApi: true },
    { id: "greene", name: "Greene County (Springfield)", city: "Springfield", hasPublicApi: true },
    { id: "boone_mo", name: "Boone County (Columbia)", city: "Columbia", hasPublicApi: true },
  ]},
  montana: { name: "Montana", abbr: "MT", counties: [
    { id: "yellowstone", name: "Yellowstone County (Billings)", city: "Billings", hasPublicApi: true },
    { id: "cascade", name: "Cascade County (Great Falls)", city: "Great Falls", hasPublicApi: true },
    { id: "missoula", name: "Missoula County", city: "Missoula", hasPublicApi: true },
    { id: "gallatin", name: "Gallatin County (Bozeman)", city: "Bozeman", hasPublicApi: true },
  ]},
  nebraska: { name: "Nebraska", abbr: "NE", counties: [
    { id: "douglas", name: "Douglas County (Omaha)", city: "Omaha", hasPublicApi: true },
    { id: "lancaster", name: "Lancaster County (Lincoln)", city: "Lincoln", hasPublicApi: true },
    { id: "sarpy", name: "Sarpy County (Bellevue)", city: "Papillion", hasPublicApi: true },
  ]},
  nevada: { name: "Nevada", abbr: "NV", counties: [
    { id: "clark", name: "Clark County (Las Vegas)", city: "Las Vegas", hasPublicApi: true },
    { id: "washoe", name: "Washoe County (Reno)", city: "Reno", hasPublicApi: true },
    { id: "carson", name: "Carson City", city: "Carson City", hasPublicApi: true },
  ]},
  new_hampshire: { name: "New Hampshire", abbr: "NH", counties: [
    { id: "hillsborough_nh", name: "Hillsborough County (Manchester)", city: "Manchester", hasPublicApi: true },
    { id: "rockingham", name: "Rockingham County (Nashua)", city: "Exeter", hasPublicApi: true },
    { id: "merrimack", name: "Merrimack County (Concord)", city: "Concord", hasPublicApi: true },
  ]},
  new_jersey: { name: "New Jersey", abbr: "NJ", counties: [
    { id: "essex", name: "Essex County (Newark)", city: "Newark", hasPublicApi: true },
    { id: "bergen", name: "Bergen County (Hackensack)", city: "Hackensack", hasPublicApi: true },
    { id: "hudson", name: "Hudson County (Jersey City)", city: "Jersey City", hasPublicApi: true },
    { id: "middlesex_nj", name: "Middlesex County (New Brunswick)", city: "New Brunswick", hasPublicApi: true },
    { id: "monmouth", name: "Monmouth County", city: "Freehold", hasPublicApi: true },
    { id: "ocean", name: "Ocean County (Toms River)", city: "Toms River", hasPublicApi: true },
    { id: "union_nj", name: "Union County (Elizabeth)", city: "Elizabeth", hasPublicApi: true },
    { id: "camden", name: "Camden County", city: "Camden", hasPublicApi: true },
  ]},
  new_mexico: { name: "New Mexico", abbr: "NM", counties: [
    { id: "bernalillo", name: "Bernalillo County (Albuquerque)", city: "Albuquerque", hasPublicApi: true },
    { id: "dona_ana", name: "Doña Ana County (Las Cruces)", city: "Las Cruces", hasPublicApi: true },
    { id: "santa_fe_nm", name: "Santa Fe County", city: "Santa Fe", hasPublicApi: true },
  ]},
  new_york: { name: "New York", abbr: "NY", counties: [
    { id: "nyc", name: "New York City (5 Boroughs)", city: "New York City", hasPublicApi: true },
    { id: "nassau", name: "Nassau County (Long Island)", city: "Mineola", hasPublicApi: true },
    { id: "suffolk_ny", name: "Suffolk County (Long Island)", city: "Riverhead", hasPublicApi: true },
    { id: "westchester", name: "Westchester County (White Plains)", city: "White Plains", hasPublicApi: true },
    { id: "erie", name: "Erie County (Buffalo)", city: "Buffalo", hasPublicApi: true },
    { id: "monroe_ny", name: "Monroe County (Rochester)", city: "Rochester", hasPublicApi: true },
    { id: "albany", name: "Albany County", city: "Albany", hasPublicApi: true },
    { id: "onondaga", name: "Onondaga County (Syracuse)", city: "Syracuse", hasPublicApi: true },
  ]},
  north_carolina: { name: "North Carolina", abbr: "NC", counties: [
    { id: "mecklenburg", name: "Mecklenburg County (Charlotte)", city: "Charlotte", hasPublicApi: true },
    { id: "wake", name: "Wake County (Raleigh)", city: "Raleigh", hasPublicApi: true },
    { id: "guilford", name: "Guilford County (Greensboro)", city: "Greensboro", hasPublicApi: true },
    { id: "forsyth", name: "Forsyth County (Winston-Salem)", city: "Winston-Salem", hasPublicApi: true },
    { id: "durham", name: "Durham County", city: "Durham", hasPublicApi: true },
    { id: "cumberland_nc", name: "Cumberland County (Fayetteville)", city: "Fayetteville", hasPublicApi: true },
    { id: "buncombe", name: "Buncombe County (Asheville)", city: "Asheville", hasPublicApi: true },
  ]},
  north_dakota: { name: "North Dakota", abbr: "ND", counties: [
    { id: "cass", name: "Cass County (Fargo)", city: "Fargo", hasPublicApi: true },
    { id: "burleigh", name: "Burleigh County (Bismarck)", city: "Bismarck", hasPublicApi: true },
    { id: "grand_forks", name: "Grand Forks County", city: "Grand Forks", hasPublicApi: true },
  ]},
  ohio: { name: "Ohio", abbr: "OH", counties: [
    { id: "cuyahoga", name: "Cuyahoga County (Cleveland)", city: "Cleveland", hasPublicApi: true },
    { id: "franklin", name: "Franklin County (Columbus)", city: "Columbus", hasPublicApi: true },
    { id: "hamilton_oh", name: "Hamilton County (Cincinnati)", city: "Cincinnati", hasPublicApi: true },
    { id: "summit", name: "Summit County (Akron)", city: "Akron", hasPublicApi: true },
    { id: "montgomery_oh", name: "Montgomery County (Dayton)", city: "Dayton", hasPublicApi: true },
    { id: "lucas", name: "Lucas County (Toledo)", city: "Toledo", hasPublicApi: true },
    { id: "stark", name: "Stark County (Canton)", city: "Canton", hasPublicApi: true },
  ]},
  oklahoma: { name: "Oklahoma", abbr: "OK", counties: [
    { id: "oklahoma_county", name: "Oklahoma County (Oklahoma City)", city: "Oklahoma City", hasPublicApi: true },
    { id: "tulsa", name: "Tulsa County", city: "Tulsa", hasPublicApi: true },
    { id: "cleveland_ok", name: "Cleveland County (Norman)", city: "Norman", hasPublicApi: true },
  ]},
  oregon: { name: "Oregon", abbr: "OR", counties: [
    { id: "multnomah", name: "Multnomah County (Portland)", city: "Portland", hasPublicApi: true },
    { id: "lane", name: "Lane County (Eugene)", city: "Eugene", hasPublicApi: true },
    { id: "marion_or", name: "Marion County (Salem)", city: "Salem", hasPublicApi: true },
    { id: "washington_or", name: "Washington County (Beaverton/Hillsboro)", city: "Hillsboro", hasPublicApi: true },
    { id: "clackamas", name: "Clackamas County", city: "Oregon City", hasPublicApi: true },
    { id: "jackson_or", name: "Jackson County (Medford)", city: "Medford", hasPublicApi: true },
    { id: "deschutes", name: "Deschutes County (Bend)", city: "Bend", hasPublicApi: true },
  ]},
  pennsylvania: { name: "Pennsylvania", abbr: "PA", counties: [
    { id: "philadelphia", name: "Philadelphia County", city: "Philadelphia", hasPublicApi: true },
    { id: "allegheny", name: "Allegheny County (Pittsburgh)", city: "Pittsburgh", hasPublicApi: true },
    { id: "montgomery_pa", name: "Montgomery County", city: "Norristown", hasPublicApi: true },
    { id: "bucks", name: "Bucks County", city: "Doylestown", hasPublicApi: true },
    { id: "chester_pa", name: "Chester County", city: "West Chester", hasPublicApi: true },
    { id: "lancaster_pa", name: "Lancaster County", city: "Lancaster", hasPublicApi: true },
    { id: "york_pa", name: "York County", city: "York", hasPublicApi: true },
    { id: "berks", name: "Berks County (Reading)", city: "Reading", hasPublicApi: true },
  ]},
  rhode_island: { name: "Rhode Island", abbr: "RI", counties: [
    { id: "providence", name: "Providence County", city: "Providence", hasPublicApi: true },
    { id: "kent_ri", name: "Kent County (Warwick)", city: "Warwick", hasPublicApi: true },
    { id: "washington_ri", name: "Washington County", city: "Wakefield", hasPublicApi: true },
  ]},
  south_carolina: { name: "South Carolina", abbr: "SC", counties: [
    { id: "greenville", name: "Greenville County", city: "Greenville", hasPublicApi: true },
    { id: "richland", name: "Richland County (Columbia)", city: "Columbia", hasPublicApi: true },
    { id: "charleston_sc", name: "Charleston County", city: "Charleston", hasPublicApi: true },
    { id: "spartanburg", name: "Spartanburg County", city: "Spartanburg", hasPublicApi: true },
  ]},
  south_dakota: { name: "South Dakota", abbr: "SD", counties: [
    { id: "minnehaha", name: "Minnehaha County (Sioux Falls)", city: "Sioux Falls", hasPublicApi: true },
    { id: "pennington", name: "Pennington County (Rapid City)", city: "Rapid City", hasPublicApi: true },
  ]},
  tennessee: { name: "Tennessee", abbr: "TN", counties: [
    { id: "shelby", name: "Shelby County (Memphis)", city: "Memphis", hasPublicApi: true },
    { id: "davidson", name: "Davidson County (Nashville)", city: "Nashville", hasPublicApi: true },
    { id: "knox", name: "Knox County (Knoxville)", city: "Knoxville", hasPublicApi: true },
    { id: "hamilton_tn", name: "Hamilton County (Chattanooga)", city: "Chattanooga", hasPublicApi: true },
    { id: "rutherford", name: "Rutherford County (Murfreesboro)", city: "Murfreesboro", hasPublicApi: true },
  ]},
  texas: { name: "Texas", abbr: "TX", counties: [
    { id: "houston", name: "City of Houston", city: "Houston", hasPublicApi: true },
    { id: "harris", name: "Harris County (Houston)", city: "Houston", hasPublicApi: true },
    { id: "dallas", name: "Dallas County", city: "Dallas", hasPublicApi: true },
    { id: "travis", name: "Travis County (Austin)", city: "Austin", hasPublicApi: true },
    { id: "bexar", name: "Bexar County (San Antonio)", city: "San Antonio", hasPublicApi: true },
    { id: "tarrant", name: "Tarrant County (Fort Worth)", city: "Fort Worth", hasPublicApi: true },
    { id: "collin", name: "Collin County (Plano/Frisco)", city: "McKinney", hasPublicApi: true },
    { id: "hidalgo", name: "Hidalgo County (McAllen)", city: "Edinburg", hasPublicApi: true },
    { id: "denton", name: "Denton County", city: "Denton", hasPublicApi: true },
    { id: "el_paso_tx", name: "El Paso County", city: "El Paso", hasPublicApi: true },
    { id: "nueces", name: "Nueces County (Corpus Christi)", city: "Corpus Christi", hasPublicApi: true },
    { id: "williamson", name: "Williamson County (Round Rock)", city: "Georgetown", hasPublicApi: true },
    { id: "lubbock", name: "Lubbock County", city: "Lubbock", hasPublicApi: true },
  ]},
  utah: { name: "Utah", abbr: "UT", counties: [
    { id: "salt_lake", name: "Salt Lake County", city: "Salt Lake City", hasPublicApi: true },
    { id: "utah_county", name: "Utah County (Provo/Orem)", city: "Provo", hasPublicApi: true },
    { id: "davis", name: "Davis County (Layton)", city: "Farmington", hasPublicApi: true },
    { id: "weber", name: "Weber County (Ogden)", city: "Ogden", hasPublicApi: true },
    { id: "washington_ut", name: "Washington County (St. George)", city: "St. George", hasPublicApi: true },
  ]},
  vermont: { name: "Vermont", abbr: "VT", counties: [
    { id: "chittenden", name: "Chittenden County (Burlington)", city: "Burlington", hasPublicApi: true },
    { id: "rutland", name: "Rutland County", city: "Rutland", hasPublicApi: true },
    { id: "washington_vt", name: "Washington County (Montpelier)", city: "Montpelier", hasPublicApi: true },
  ]},
  virginia: { name: "Virginia", abbr: "VA", counties: [
    { id: "fairfax", name: "Fairfax County", city: "Fairfax", hasPublicApi: true },
    { id: "virginia_beach", name: "Virginia Beach City", city: "Virginia Beach", hasPublicApi: true },
    { id: "richmond", name: "Richmond City", city: "Richmond", hasPublicApi: true },
    { id: "arlington", name: "Arlington County", city: "Arlington", hasPublicApi: true },
    { id: "chesapeake", name: "Chesapeake City", city: "Chesapeake", hasPublicApi: true },
    { id: "norfolk", name: "Norfolk City", city: "Norfolk", hasPublicApi: true },
    { id: "chesterfield", name: "Chesterfield County", city: "Chesterfield", hasPublicApi: true },
    { id: "loudoun", name: "Loudoun County", city: "Leesburg", hasPublicApi: true },
  ]},
  washington: { name: "Washington", abbr: "WA", counties: [
    { id: "king", name: "King County (Seattle)", city: "Seattle", hasPublicApi: true },
    { id: "snohomish", name: "Snohomish County (Everett)", city: "Everett", hasPublicApi: true },
    { id: "pierce", name: "Pierce County (Tacoma)", city: "Tacoma", hasPublicApi: true },
    { id: "clark_wa", name: "Clark County (Vancouver)", city: "Vancouver", hasPublicApi: true },
    { id: "spokane", name: "Spokane County", city: "Spokane", hasPublicApi: true },
    { id: "thurston", name: "Thurston County (Olympia)", city: "Olympia", hasPublicApi: true },
    { id: "kitsap", name: "Kitsap County (Bremerton)", city: "Bremerton", hasPublicApi: true },
    { id: "whatcom", name: "Whatcom County (Bellingham)", city: "Bellingham", hasPublicApi: true },
    { id: "benton_wa", name: "Benton County (Kennewick/Richland)", city: "Kennewick", hasPublicApi: true },
    { id: "yakima", name: "Yakima County", city: "Yakima", hasPublicApi: true },
  ]},
  west_virginia: { name: "West Virginia", abbr: "WV", counties: [
    { id: "kanawha", name: "Kanawha County (Charleston)", city: "Charleston", hasPublicApi: true },
    { id: "cabell", name: "Cabell County (Huntington)", city: "Huntington", hasPublicApi: true },
    { id: "monongalia", name: "Monongalia County (Morgantown)", city: "Morgantown", hasPublicApi: true },
  ]},
  wisconsin: { name: "Wisconsin", abbr: "WI", counties: [
    { id: "milwaukee", name: "Milwaukee County", city: "Milwaukee", hasPublicApi: true },
    { id: "dane", name: "Dane County (Madison)", city: "Madison", hasPublicApi: true },
    { id: "waukesha", name: "Waukesha County", city: "Waukesha", hasPublicApi: true },
    { id: "brown", name: "Brown County (Green Bay)", city: "Green Bay", hasPublicApi: true },
    { id: "racine", name: "Racine County", city: "Racine", hasPublicApi: true },
  ]},
  wyoming: { name: "Wyoming", abbr: "WY", counties: [
    { id: "laramie", name: "Laramie County (Cheyenne)", city: "Cheyenne", hasPublicApi: true },
    { id: "natrona", name: "Natrona County (Casper)", city: "Casper", hasPublicApi: true },
    { id: "teton", name: "Teton County (Jackson)", city: "Jackson", hasPublicApi: true },
  ]},

  // ── INTERNATIONAL ────────────────────────────────────────────────────────────

  canada: { name: "Canada", abbr: "CAN", counties: [
    // Ontario
    { id: "toronto", name: "Toronto, Ontario", city: "Toronto", hasPublicApi: true },
    { id: "ottawa", name: "Ottawa, Ontario", city: "Ottawa", hasPublicApi: true },
    { id: "hamilton_on", name: "Hamilton, Ontario", city: "Hamilton", hasPublicApi: true },
    { id: "mississauga", name: "Mississauga, Ontario", city: "Mississauga", hasPublicApi: true },
    { id: "brampton", name: "Brampton, Ontario", city: "Brampton", hasPublicApi: true },
    { id: "london_on", name: "London, Ontario", city: "London", hasPublicApi: true },
    { id: "kitchener", name: "Kitchener, Ontario", city: "Kitchener", hasPublicApi: true },
    // British Columbia
    { id: "vancouver", name: "Vancouver, British Columbia", city: "Vancouver", hasPublicApi: true },
    { id: "surrey", name: "Surrey, British Columbia", city: "Surrey", hasPublicApi: true },
    { id: "burnaby", name: "Burnaby, British Columbia", city: "Burnaby", hasPublicApi: true },
    { id: "richmond_bc", name: "Richmond, British Columbia", city: "Richmond", hasPublicApi: true },
    { id: "victoria_bc", name: "Victoria, British Columbia", city: "Victoria", hasPublicApi: true },
    { id: "kelowna", name: "Kelowna, British Columbia", city: "Kelowna", hasPublicApi: true },
    // Québec
    { id: "montreal", name: "Montréal, Québec", city: "Montréal", hasPublicApi: true },
    { id: "quebec_city", name: "Québec City, Québec", city: "Québec City", hasPublicApi: true },
    { id: "laval", name: "Laval, Québec", city: "Laval", hasPublicApi: true },
    { id: "gatineau", name: "Gatineau, Québec", city: "Gatineau", hasPublicApi: true },
    // Alberta
    { id: "calgary", name: "Calgary, Alberta", city: "Calgary", hasPublicApi: true },
    { id: "edmonton", name: "Edmonton, Alberta", city: "Edmonton", hasPublicApi: true },
    { id: "red_deer", name: "Red Deer, Alberta", city: "Red Deer", hasPublicApi: true },
    { id: "lethbridge", name: "Lethbridge, Alberta", city: "Lethbridge", hasPublicApi: true },
    // Other provinces
    { id: "winnipeg", name: "Winnipeg, Manitoba", city: "Winnipeg", hasPublicApi: true },
    { id: "halifax", name: "Halifax, Nova Scotia", city: "Halifax", hasPublicApi: true },
    { id: "saskatoon", name: "Saskatoon, Saskatchewan", city: "Saskatoon", hasPublicApi: true },
    { id: "regina", name: "Regina, Saskatchewan", city: "Regina", hasPublicApi: true },
    { id: "st_johns_nl", name: "St. John's, Newfoundland", city: "St. John's", hasPublicApi: true },
    { id: "moncton", name: "Moncton, New Brunswick", city: "Moncton", hasPublicApi: true },
  ]},

  uk: { name: "United Kingdom", abbr: "UK", counties: [
    { id: "uk_fsa", name: "United Kingdom (FSA)", city: "United Kingdom", hasPublicApi: true },
    { id: "london", name: "London, England", city: "London", hasPublicApi: true },
    { id: "birmingham", name: "Birmingham, England", city: "Birmingham", hasPublicApi: true },
    { id: "manchester", name: "Manchester, England", city: "Manchester", hasPublicApi: true },
    { id: "leeds", name: "Leeds, England", city: "Leeds", hasPublicApi: true },
    { id: "glasgow", name: "Glasgow, Scotland", city: "Glasgow", hasPublicApi: true },
    { id: "edinburgh", name: "Edinburgh, Scotland", city: "Edinburgh", hasPublicApi: true },
    { id: "liverpool", name: "Liverpool, England", city: "Liverpool", hasPublicApi: true },
    { id: "bristol", name: "Bristol, England", city: "Bristol", hasPublicApi: true },
    { id: "sheffield", name: "Sheffield, England", city: "Sheffield", hasPublicApi: true },
    { id: "cardiff", name: "Cardiff, Wales", city: "Cardiff", hasPublicApi: true },
    { id: "belfast", name: "Belfast, Northern Ireland", city: "Belfast", hasPublicApi: true },
  ]},

  mexico: { name: "Mexico", abbr: "MX", counties: [
    { id: "mexico_city", name: "Mexico City (CDMX)", city: "Mexico City", hasPublicApi: true },
    { id: "guadalajara", name: "Guadalajara, Jalisco", city: "Guadalajara", hasPublicApi: true },
    { id: "monterrey", name: "Monterrey, Nuevo León", city: "Monterrey", hasPublicApi: true },
    { id: "cancun", name: "Cancún, Quintana Roo", city: "Cancún", hasPublicApi: true },
    { id: "tijuana", name: "Tijuana, Baja California", city: "Tijuana", hasPublicApi: true },
    { id: "puebla_mx", name: "Puebla, Puebla", city: "Puebla", hasPublicApi: true },
    { id: "queretaro", name: "Querétaro, Querétaro", city: "Querétaro", hasPublicApi: true },
    { id: "merida", name: "Mérida, Yucatán", city: "Mérida", hasPublicApi: true },
  ]},

  australia: { name: "Australia", abbr: "AU", counties: [
    { id: "sydney", name: "Sydney, New South Wales", city: "Sydney", hasPublicApi: true },
    { id: "melbourne", name: "Melbourne, Victoria", city: "Melbourne", hasPublicApi: true },
    { id: "brisbane", name: "Brisbane, Queensland", city: "Brisbane", hasPublicApi: true },
    { id: "perth", name: "Perth, Western Australia", city: "Perth", hasPublicApi: true },
    { id: "adelaide", name: "Adelaide, South Australia", city: "Adelaide", hasPublicApi: true },
    { id: "gold_coast", name: "Gold Coast, Queensland", city: "Gold Coast", hasPublicApi: true },
    { id: "canberra", name: "Canberra, ACT", city: "Canberra", hasPublicApi: true },
    { id: "hobart", name: "Hobart, Tasmania", city: "Hobart", hasPublicApi: true },
  ]},

  france: { name: "France", abbr: "FR", counties: [
    { id: "paris", name: "Paris, Île-de-France", city: "Paris", hasPublicApi: true },
    { id: "lyon", name: "Lyon, Auvergne-Rhône-Alpes", city: "Lyon", hasPublicApi: true },
    { id: "marseille", name: "Marseille, Provence-Alpes-Côte d'Azur", city: "Marseille", hasPublicApi: true },
    { id: "toulouse", name: "Toulouse, Occitanie", city: "Toulouse", hasPublicApi: true },
    { id: "nice", name: "Nice, Provence-Alpes-Côte d'Azur", city: "Nice", hasPublicApi: true },
    { id: "bordeaux", name: "Bordeaux, Nouvelle-Aquitaine", city: "Bordeaux", hasPublicApi: true },
    { id: "strasbourg", name: "Strasbourg, Grand Est", city: "Strasbourg", hasPublicApi: true },
  ]},

  germany: { name: "Germany", abbr: "DE", counties: [
    { id: "berlin", name: "Berlin", city: "Berlin", hasPublicApi: true },
    { id: "munich", name: "Munich, Bavaria", city: "Munich", hasPublicApi: true },
    { id: "hamburg", name: "Hamburg", city: "Hamburg", hasPublicApi: true },
    { id: "cologne", name: "Cologne, North Rhine-Westphalia", city: "Cologne", hasPublicApi: true },
    { id: "frankfurt", name: "Frankfurt, Hesse", city: "Frankfurt", hasPublicApi: true },
    { id: "stuttgart", name: "Stuttgart, Baden-Württemberg", city: "Stuttgart", hasPublicApi: true },
    { id: "dusseldorf", name: "Düsseldorf, North Rhine-Westphalia", city: "Düsseldorf", hasPublicApi: true },
  ]},

  spain: { name: "Spain", abbr: "ES", counties: [
    { id: "madrid", name: "Madrid, Community of Madrid", city: "Madrid", hasPublicApi: true },
    { id: "barcelona", name: "Barcelona, Catalonia", city: "Barcelona", hasPublicApi: true },
    { id: "valencia_es", name: "Valencia, Valencian Community", city: "Valencia", hasPublicApi: true },
    { id: "seville", name: "Seville, Andalusia", city: "Seville", hasPublicApi: true },
    { id: "bilbao", name: "Bilbao, Basque Country", city: "Bilbao", hasPublicApi: true },
    { id: "malaga", name: "Málaga, Andalusia", city: "Málaga", hasPublicApi: true },
  ]},

  italy: { name: "Italy", abbr: "IT", counties: [
    { id: "rome", name: "Rome, Lazio", city: "Rome", hasPublicApi: true },
    { id: "milan", name: "Milan, Lombardy", city: "Milan", hasPublicApi: true },
    { id: "naples", name: "Naples, Campania", city: "Naples", hasPublicApi: true },
    { id: "florence", name: "Florence, Tuscany", city: "Florence", hasPublicApi: true },
    { id: "venice", name: "Venice, Veneto", city: "Venice", hasPublicApi: true },
    { id: "turin", name: "Turin, Piedmont", city: "Turin", hasPublicApi: true },
    { id: "bologna", name: "Bologna, Emilia-Romagna", city: "Bologna", hasPublicApi: true },
  ]},

  japan: { name: "Japan", abbr: "JP", counties: [
    { id: "tokyo", name: "Tokyo", city: "Tokyo", hasPublicApi: true },
    { id: "osaka", name: "Osaka, Osaka Prefecture", city: "Osaka", hasPublicApi: true },
    { id: "kyoto", name: "Kyoto, Kyoto Prefecture", city: "Kyoto", hasPublicApi: true },
    { id: "yokohama", name: "Yokohama, Kanagawa Prefecture", city: "Yokohama", hasPublicApi: true },
    { id: "sapporo", name: "Sapporo, Hokkaido", city: "Sapporo", hasPublicApi: true },
    { id: "fukuoka", name: "Fukuoka, Fukuoka Prefecture", city: "Fukuoka", hasPublicApi: true },
    { id: "nagoya", name: "Nagoya, Aichi Prefecture", city: "Nagoya", hasPublicApi: true },
  ]},

  brazil: { name: "Brazil", abbr: "BR", counties: [
    { id: "sao_paulo", name: "São Paulo, São Paulo", city: "São Paulo", hasPublicApi: true },
    { id: "rio", name: "Rio de Janeiro, Rio de Janeiro", city: "Rio de Janeiro", hasPublicApi: true },
    { id: "brasilia", name: "Brasília, Federal District", city: "Brasília", hasPublicApi: true },
    { id: "salvador", name: "Salvador, Bahia", city: "Salvador", hasPublicApi: true },
    { id: "fortaleza", name: "Fortaleza, Ceará", city: "Fortaleza", hasPublicApi: true },
    { id: "belo_horizonte", name: "Belo Horizonte, Minas Gerais", city: "Belo Horizonte", hasPublicApi: true },
    { id: "curitiba", name: "Curitiba, Paraná", city: "Curitiba", hasPublicApi: true },
  ]},

  india: { name: "India", abbr: "IN", counties: [
    { id: "mumbai", name: "Mumbai, Maharashtra", city: "Mumbai", hasPublicApi: true },
    { id: "delhi", name: "Delhi, NCT", city: "Delhi", hasPublicApi: true },
    { id: "bangalore", name: "Bengaluru, Karnataka", city: "Bengaluru", hasPublicApi: true },
    { id: "hyderabad", name: "Hyderabad, Telangana", city: "Hyderabad", hasPublicApi: true },
    { id: "chennai", name: "Chennai, Tamil Nadu", city: "Chennai", hasPublicApi: true },
    { id: "kolkata", name: "Kolkata, West Bengal", city: "Kolkata", hasPublicApi: true },
    { id: "pune", name: "Pune, Maharashtra", city: "Pune", hasPublicApi: true },
    { id: "jaipur", name: "Jaipur, Rajasthan", city: "Jaipur", hasPublicApi: true },
  ]},

  south_korea: { name: "South Korea", abbr: "KR", counties: [
    { id: "seoul", name: "Seoul", city: "Seoul", hasPublicApi: true },
    { id: "busan", name: "Busan", city: "Busan", hasPublicApi: true },
    { id: "incheon", name: "Incheon", city: "Incheon", hasPublicApi: true },
    { id: "daegu", name: "Daegu", city: "Daegu", hasPublicApi: true },
    { id: "jeju", name: "Jeju Island", city: "Jeju City", hasPublicApi: true },
  ]},

  china: { name: "China", abbr: "CN", counties: [
    { id: "beijing", name: "Beijing", city: "Beijing", hasPublicApi: true },
    { id: "shanghai", name: "Shanghai", city: "Shanghai", hasPublicApi: true },
    { id: "shenzhen", name: "Shenzhen, Guangdong", city: "Shenzhen", hasPublicApi: true },
    { id: "guangzhou", name: "Guangzhou, Guangdong", city: "Guangzhou", hasPublicApi: true },
    { id: "chengdu", name: "Chengdu, Sichuan", city: "Chengdu", hasPublicApi: true },
    { id: "hangzhou", name: "Hangzhou, Zhejiang", city: "Hangzhou", hasPublicApi: true },
    { id: "xian", name: "Xi'an, Shaanxi", city: "Xi'an", hasPublicApi: true },
    { id: "hong_kong", name: "Hong Kong SAR", city: "Hong Kong", hasPublicApi: true },
  ]},

  uae: { name: "United Arab Emirates", abbr: "AE", counties: [
    { id: "dubai", name: "Dubai", city: "Dubai", hasPublicApi: true },
    { id: "abu_dhabi", name: "Abu Dhabi", city: "Abu Dhabi", hasPublicApi: true },
    { id: "sharjah", name: "Sharjah", city: "Sharjah", hasPublicApi: true },
  ]},

  singapore: { name: "Singapore", abbr: "SG", counties: [
    { id: "singapore", name: "Singapore (City-State)", city: "Singapore", hasPublicApi: true },
  ]},

  ireland: { name: "Ireland", abbr: "IE", counties: [
    { id: "dublin", name: "Dublin, Leinster", city: "Dublin", hasPublicApi: true },
    { id: "cork", name: "Cork, Munster", city: "Cork", hasPublicApi: true },
    { id: "galway", name: "Galway, Connacht", city: "Galway", hasPublicApi: true },
    { id: "limerick", name: "Limerick, Munster", city: "Limerick", hasPublicApi: true },
    { id: "waterford", name: "Waterford, Munster", city: "Waterford", hasPublicApi: true },
  ]},

  netherlands: { name: "Netherlands", abbr: "NL", counties: [
    { id: "amsterdam", name: "Amsterdam, North Holland", city: "Amsterdam", hasPublicApi: true },
    { id: "rotterdam", name: "Rotterdam, South Holland", city: "Rotterdam", hasPublicApi: true },
    { id: "the_hague", name: "The Hague, South Holland", city: "The Hague", hasPublicApi: true },
    { id: "utrecht_nl", name: "Utrecht, Utrecht", city: "Utrecht", hasPublicApi: true },
  ]},

  portugal: { name: "Portugal", abbr: "PT", counties: [
    { id: "lisbon", name: "Lisbon, Lisbon District", city: "Lisbon", hasPublicApi: true },
    { id: "porto", name: "Porto, Porto District", city: "Porto", hasPublicApi: true },
    { id: "faro", name: "Faro, Algarve", city: "Faro", hasPublicApi: true },
  ]},

  new_zealand: { name: "New Zealand", abbr: "NZ", counties: [
    { id: "auckland", name: "Auckland", city: "Auckland", hasPublicApi: true },
    { id: "wellington", name: "Wellington", city: "Wellington", hasPublicApi: true },
    { id: "christchurch", name: "Christchurch, Canterbury", city: "Christchurch", hasPublicApi: true },
    { id: "queenstown", name: "Queenstown, Otago", city: "Queenstown", hasPublicApi: true },
  ]},

  argentina: { name: "Argentina", abbr: "AR", counties: [
    { id: "buenos_aires", name: "Buenos Aires", city: "Buenos Aires", hasPublicApi: true },
    { id: "cordoba_ar", name: "Córdoba", city: "Córdoba", hasPublicApi: true },
    { id: "rosario", name: "Rosario, Santa Fe", city: "Rosario", hasPublicApi: true },
    { id: "mendoza", name: "Mendoza", city: "Mendoza", hasPublicApi: true },
  ]},

  thailand: { name: "Thailand", abbr: "TH", counties: [
    { id: "bangkok", name: "Bangkok", city: "Bangkok", hasPublicApi: true },
    { id: "chiang_mai", name: "Chiang Mai", city: "Chiang Mai", hasPublicApi: true },
    { id: "phuket", name: "Phuket", city: "Phuket City", hasPublicApi: true },
    { id: "pattaya", name: "Pattaya, Chonburi", city: "Pattaya", hasPublicApi: true },
  ]},

  greece: { name: "Greece", abbr: "GR", counties: [
    { id: "athens", name: "Athens, Attica", city: "Athens", hasPublicApi: true },
    { id: "thessaloniki", name: "Thessaloniki, Central Macedonia", city: "Thessaloniki", hasPublicApi: true },
    { id: "heraklion", name: "Heraklion, Crete", city: "Heraklion", hasPublicApi: true },
  ]},

  turkey: { name: "Turkey", abbr: "TR", counties: [
    { id: "istanbul", name: "Istanbul", city: "Istanbul", hasPublicApi: true },
    { id: "ankara", name: "Ankara", city: "Ankara", hasPublicApi: true },
    { id: "izmir", name: "İzmir", city: "İzmir", hasPublicApi: true },
    { id: "antalya", name: "Antalya", city: "Antalya", hasPublicApi: true },
  ]},

  south_africa: { name: "South Africa", abbr: "ZA", counties: [
    { id: "cape_town", name: "Cape Town, Western Cape", city: "Cape Town", hasPublicApi: true },
    { id: "johannesburg", name: "Johannesburg, Gauteng", city: "Johannesburg", hasPublicApi: true },
    { id: "durban", name: "Durban, KwaZulu-Natal", city: "Durban", hasPublicApi: true },
    { id: "pretoria", name: "Pretoria, Gauteng", city: "Pretoria", hasPublicApi: true },
  ]},

  // Catch-all for any city/country typed by the user that isn't in the alias map
  global: { name: "Worldwide", abbr: "", counties: [
    { id: "global", name: "Worldwide (AI Search)", city: "", hasPublicApi: false },
  ]},
};

/**
 * Source / county_id → US two-letter state code.
 * International sources resolve to null.
 * Used by every component that needs to know what state a restaurant is in
 * to look up state-specific data (water systems, ADA records, etc.)
 */
export const SOURCE_TO_STATE = {
  king:          "WA",
  nyc:           "NY",
  ny_state:      "NY",
  cook:          "IL",
  chicago:       "IL",
  travis:        "TX",
  austin:        "TX",
  sf:            "CA",
  la:            "CA",
  montgomery_md: "MD",
  montgomery:    "MD",
  delaware:      "DE",
  boston:        "MA",
  houston:       "TX",
  pierce:        "WA",
  tacoma_pierce: "WA",
  toronto:       null,  // Canada
  dubai:         null,  // UAE
  uk_fsa:        null,  // UK
};

/**
 * Derive a US two-letter state code from a restaurant object.
 * Tries multiple strategies in order of reliability:
 *   1. Explicit `state` field if present and valid
 *   2. Map from county_id or source via SOURCE_TO_STATE
 *   3. Parse from address using "City, ST 12345" pattern (allows comma between state and zip)
 * Returns null if no state can be determined.
 *
 * @param {object} restaurant — must have at minimum a source, county_id, address, city, or state field
 * @returns {string|null} two-letter uppercase state code or null
 */
export function inferState(restaurant) {
  if (!restaurant) return null;

  // Strategy 1: explicit state field
  if (restaurant.state && typeof restaurant.state === "string" && restaurant.state.length === 2) {
    return restaurant.state.toUpperCase();
  }

  // Strategy 2: known county_id or source
  if (restaurant.county_id && SOURCE_TO_STATE[restaurant.county_id] !== undefined) {
    return SOURCE_TO_STATE[restaurant.county_id];
  }
  if (restaurant.source && SOURCE_TO_STATE[restaurant.source] !== undefined) {
    return SOURCE_TO_STATE[restaurant.source];
  }

  // Strategy 3: parse from address — accepts "City, ST 12345" or "City, ST, 12345"
  const fullAddr = [restaurant.address, restaurant.city, restaurant.zip_code].filter(Boolean).join(", ");
  const m = fullAddr.match(/,\s*([A-Z]{2})[\s,]+\d{5}/);
  return m ? m[1] : null;
}