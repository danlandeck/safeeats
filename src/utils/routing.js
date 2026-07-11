/**
 * Jurisdiction routing — now delegates to the unified hierarchical resolver.
 * Re-exports resolveJurisdiction from jurisdictionResolver.js for backward compat.
 *
 * The resolver handles both US (via dataSources.json) and non-US (via
 * globalJurisdictions.json) with deep-merge inheritance.
 */
export { resolveJurisdiction } from "./jurisdictionResolver";