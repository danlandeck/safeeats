// Barrel file — re-exports all inspection processors from split modules.
// Each module covers a geographic region or functional group.
// Add new processors to the appropriate regional file, then re-export here.

export { processKingCountyResults, kingToDetailRows } from "./processors/kingCounty";
export { processNYCResults, processNYStateResults, nycToDetailRows, nyStateToDetailRows } from "./processors/nyc";
export { processChicagoResults, chicagoToDetailRows } from "./processors/chicago";
export {
  processLAResults, laToDetailRows,
  processSFResults, sfToDetailRows,
  processStanislausResults, stanislausToDetailRows,
  processRiversideResults, riversideToDetailRows,
  processTriCountyCoResults, triCountyCoToDetailRows,
} from "./processors/california";
export { processAustinResults, austinToDetailRows, processHoustonResults, houstonToDetailRows } from "./processors/texas";
export { processMontgomeryResults, montgomeryToDetailRows } from "./processors/montgomery";
export { llmToDetailRows, buildLLMRestaurant } from "./processors/llm";
export {
  processAlabamaResults, alabamaToDetailRows,
  processArkansasResults, arkansasToDetailRows,
  processFloridaResults, floridaToDetailRows,
  processGeorgiaResults, georgiaToDetailRows,
  processDCResults, dcToDetailRows,
} from "./processors/southeast";
export { processSNHDResults, snhdToDetailRows, processMaricopaResults, maricopaToDetailRows } from "./processors/southwest";
export {
  processLouisvilleResults, louisvilleToDetailRows,
  processWakeCountyResults, wakeCountyToDetailRows,
  processFVHDResults, fvhdToDetailRows,
  processIllinoisCDPResults, illinoisCDPToDetailRows,
  processIndianaMarionResults, indianaMarionToDetailRows,
} from "./processors/midwest";
export { processDelawareResults, delawareToDetailRows, processBostonResults, bostonToDetailRows } from "./processors/northeast";
export {
  processVancouverBCResults, vancouverBCToDetailRows,
  processTacomaPierceResults, tacomaPierceToDetailRows,
} from "./processors/pacific";
export {
  processUKFSAResults, ukFSAToDetailRows,
  processTorontoResults, torontoToDetailRows,
  processSingaporeResults, singaporeToDetailRows,
  processNSWResults, nswToDetailRows,
} from "./processors/international";
export { reverseGeocode, geocodeAddress } from "./processors/geocode";
export { processBRLAResults, brlaToDetailRows } from "./processors/louisiana";