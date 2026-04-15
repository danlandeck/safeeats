/**
 * Translates raw health inspection jargon into plain human language.
 * Also categorizes violations for cross-jurisdiction normalization.
 */

const JARGON_MAP = [
  // Temperature / cold holding
  { pattern: /cold.?holding/i,            human: "Food stored at unsafe temperatures (too warm)", category: "temperature" },
  { pattern: /hot.?holding/i,             human: "Hot food not kept warm enough",                  category: "temperature" },
  { pattern: /temperature.?abuse/i,       human: "Food left at unsafe temperatures",               category: "temperature" },
  { pattern: /time.?temperature/i,        human: "Food not kept at safe temperatures over time",   category: "temperature" },
  { pattern: /proper.?cooling/i,          human: "Hot food not cooled down safely",                category: "temperature" },
  { pattern: /reheat/i,                   human: "Leftovers not reheated to a safe temperature",   category: "temperature" },
  { pattern: /thermometer/i,              human: "No thermometer available to check food temps",   category: "temperature" },

  // Handwashing / hygiene
  { pattern: /hand.?wash/i,               human: "Staff not washing hands properly",               category: "hygiene" },
  { pattern: /bare.?hand.?contact/i,      human: "Staff touching ready-to-eat food without gloves", category: "hygiene" },
  { pattern: /personal.?hygiene/i,        human: "Staff not following hygiene practices",          category: "hygiene" },
  { pattern: /employee.?health/i,         human: "Sick employee policy not followed",              category: "hygiene" },
  { pattern: /gloves?/i,                  human: "Gloves not used when handling food",             category: "hygiene" },
  { pattern: /hair.?restraint/i,          human: "Staff not wearing hair covering",                category: "hygiene" },

  // Cross-contamination
  { pattern: /cross.?contamin/i,          human: "Risk of one food contaminating another",         category: "contamination" },
  { pattern: /raw.?(meat|poultry|seafood)/i, human: "Raw meat stored or handled unsafely",        category: "contamination" },
  { pattern: /sanitiz/i,                  human: "Surfaces or equipment not properly sanitized",   category: "contamination" },
  { pattern: /contamination/i,            human: "Potential for harmful contamination found",      category: "contamination" },

  // Pest / vermin
  { pattern: /rodent/i,                   human: "Evidence of rodents found",                      category: "pests" },
  { pattern: /insect/i,                   human: "Evidence of insects found",                      category: "pests" },
  { pattern: /pest/i,                     human: "Signs of pests (insects or rodents) found",      category: "pests" },
  { pattern: /vermin/i,                   human: "Evidence of vermin found",                       category: "pests" },
  { pattern: /cockroach/i,                human: "Cockroaches found on premises",                  category: "pests" },

  // Food storage
  { pattern: /food.?storage/i,            human: "Food not stored safely",                         category: "storage" },
  { pattern: /label/i,                    human: "Food containers not properly labeled",           category: "storage" },
  { pattern: /date.?mark/i,               human: "Food not marked with use-by dates",              category: "storage" },
  { pattern: /thaw/i,                     human: "Frozen food not thawed safely",                  category: "storage" },
  { pattern: /consumer.?advisory/i,       human: "Menu missing raw food safety warning",           category: "storage" },

  // Facility / equipment
  { pattern: /equipment.?(clean|maintenance)/i, human: "Kitchen equipment not clean or maintained", category: "facility" },
  { pattern: /plumbing/i,                 human: "Plumbing issue found",                           category: "facility" },
  { pattern: /ventilation/i,              human: "Ventilation system not working properly",        category: "facility" },
  { pattern: /toilet/i,                   human: "Restroom issue found",                           category: "facility" },
  { pattern: /sewage/i,                   human: "Sewage or wastewater issue found",               category: "facility" },
  { pattern: /garbage/i,                  human: "Garbage not properly disposed of",               category: "facility" },
  { pattern: /pest.?control/i,            human: "Pest control measures not in place",             category: "pests" },
  { pattern: /food.?contact.?surface/i,   human: "Surfaces that touch food are not clean",         category: "facility" },
  { pattern: /non.?food.?contact.?surface/i, human: "Non-food surfaces (walls, shelves) not clean", category: "facility" },

  // Permits / documentation
  { pattern: /permit/i,                   human: "Required permit not posted or valid",            category: "permits" },
  { pattern: /license/i,                  human: "Food service license not current",               category: "permits" },
  { pattern: /certified.?food.?manager/i, human: "No certified food safety manager on staff",     category: "permits" },
  { pattern: /food.?handler/i,            human: "Staff missing required food safety training",   category: "permits" },
];

/**
 * Given a raw violation description, returns a human-friendly version and a category.
 */
export function translateViolation(description) {
  if (!description) return { human: description, category: "other" };
  for (const { pattern, human, category } of JARGON_MAP) {
    if (pattern.test(description)) {
      return { human, category };
    }
  }
  // Capitalize and clean up if no match
  const cleaned = description
    .replace(/\s+/g, " ")
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .trim();
  return { human: cleaned, category: "other" };
}

export const CATEGORY_LABELS = {
  temperature:    { label: "Temperature",     emoji: "🌡️" },
  hygiene:        { label: "Staff Hygiene",   emoji: "🧼" },
  contamination:  { label: "Contamination",   emoji: "⚠️" },
  pests:          { label: "Pests",           emoji: "🐀" },
  storage:        { label: "Food Storage",    emoji: "📦" },
  facility:       { label: "Facility",        emoji: "🏠" },
  permits:        { label: "Documentation",   emoji: "📋" },
  other:          { label: "Other",           emoji: "ℹ️" },
};