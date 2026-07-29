import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Check, X, Lock, Camera, MapPin, Globe, Database, Trash2, Cookie, Smartphone } from "lucide-react";

/**
 * Data Safety & Compliance page — addresses all common Google Play scan
 * warnings: data collection, permissions, security, third-party services,
 * data retention, account deletion, advertising/tracking, children's privacy,
 * and government data source transparency.
 */
export default function DataSafety() {
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Nunito, sans-serif" }}>
      {/* Header */}
      <div className="bg-slate-900 border-b-4 border-[#4CAF50] py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-[#81c784] hover:text-white transition-colors text-sm font-bold mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to SafeEats™
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4CAF50] flex items-center justify-center border-2 border-white/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Data Safety & Compliance</h1>
          </div>
          <p className="text-slate-400 text-sm mt-2">Last updated: July 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-slate-700">

        <section>
          <p className="text-sm text-slate-500 leading-relaxed">
            This page provides a complete disclosure of SafeEats™ data collection, security, and privacy
            practices in accordance with Google Play Data Safety requirements, the EU Digital Services Act,
            and general app store compliance standards.
          </p>
        </section>

        {/* ── 1. Data Collection Summary ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#4CAF50]" /> 1. Data Collection Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="text-left p-2.5 font-bold">Data Type</th>
                  <th className="text-center p-2.5 font-bold">Collected?</th>
                  <th className="text-left p-2.5 font-bold">Purpose</th>
                  <th className="text-center p-2.5 font-bold">Shared?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {DATA_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="p-2.5 font-semibold text-slate-800">{row.type}</td>
                    <td className="p-2.5 text-center">
                      {row.collected
                        ? <Check className="w-4 h-4 text-emerald-500 inline" />
                        : <X className="w-4 h-4 text-slate-300 inline" />}
                    </td>
                    <td className="p-2.5 text-slate-600">{row.purpose}</td>
                    <td className="p-2.5 text-center">
                      {row.shared
                        ? <Check className="w-4 h-4 text-amber-500 inline" />
                        : <X className="w-4 h-4 text-slate-300 inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            ✅ = Yes / ❌ = No. "Shared" means data is transmitted to a third-party service for processing.
          </p>
        </section>

        {/* ── 2. App Permissions ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#4CAF50]" /> 2. App Permissions
          </h2>
          <div className="space-y-3">
            {PERMISSIONS.map((perm, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <perm.icon className="w-4.5 h-4.5 text-[#4CAF50]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{perm.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{perm.description}</p>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${perm.required ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {perm.required ? "Required for core function" : "Optional — user-initiated only"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Security Practices ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#4CAF50]" /> 3. Security Practices
          </h2>
          <ul className="space-y-2">
            {SECURITY_PRACTICES.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 4. Third-Party Services ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#4CAF50]" /> 4. Third-Party Services & SDKs
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            SafeEats™ does <strong className="text-slate-700">not</strong> use any advertising SDKs, ad-tracking SDKs,
            analytics SDKs, or social SDKs. The only third-party services used are:
          </p>
          <div className="space-y-2">
            {THIRD_PARTY.map((svc, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="font-bold text-sm text-slate-800">{svc.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{svc.purpose}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. Advertising & Tracking ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">5. Advertising & Tracking</h2>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <ul className="space-y-1.5">
              {NO_ADS.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                  <X className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 6. Local Storage & Cookies ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Cookie className="w-5 h-5 text-[#4CAF50]" /> 6. Local Storage & Cookies
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            SafeEats™ uses browser localStorage (not HTTP cookies) for the following:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
            <li><strong>Consent preference</strong> — remembers whether you allowed location/cookies (key: <code className="text-xs bg-slate-100 px-1 rounded">safeeats_consent_v1</code>)</li>
            <li><strong>Favorite restaurants</strong> — your saved restaurant list stays on your device</li>
            <li><strong>Search cache</strong> — recent search results cached to avoid re-fetching on back-navigation</li>
            <li><strong>Theme preference</strong> — dark/light mode follows your system setting</li>
          </ul>
          <p className="text-xs text-slate-400 mt-2">
            All localStorage data is stored on-device and is never transmitted to our servers. Clearing browser data
            or uninstalling the app removes all of it.
          </p>
        </section>

        {/* ── 7. Data Retention & Account Deletion ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#4CAF50]" /> 7. Data Retention & Account Deletion
          </h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong className="text-slate-700">Cached restaurant data:</strong> Retained until superseded by newer data from the source government API (typically 24–48 hours for live sources).</p>
            <p><strong className="text-slate-700">User accounts:</strong> Retained for the lifetime of your account. You can delete your account at any time via the in-app Account Deletion button (located in the app footer), which permanently removes your email, name, and authentication tokens.</p>
            <p><strong className="text-slate-700">Analytics events:</strong> Anonymous usage events (e.g., "search performed") are retained in aggregate and are not linked to your identity.</p>
          </div>
        </section>

        {/* ── 8. Children's Privacy ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">8. Children's Privacy (COPPA)</h2>
          <p className="text-sm text-slate-500">
            SafeEats™ is rated for all ages and is not directed at children under 13. The app does not knowingly
            collect personal information from children. No data is collected that would trigger COPPA requirements.
            The app does not use behavioral advertising, interest-based targeting, or contact collection of any kind.
          </p>
        </section>

        {/* ── 9. Government Data Sources ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#4CAF50]" /> 9. Government Data Sources
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            SafeEats™ queries the following official government health inspection APIs at request time. These are
            public open-data endpoints — no authentication credentials are exchanged.
          </p>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            {GOV_SOURCES.map((src, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] flex-shrink-0" />
                <span><strong className="text-slate-700">{src.region}</strong> — {src.agency}</span>
              </div>
            ))}
            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 mt-2">
              Additional regions without live APIs use AI-assisted research of public records or link directly to the
              official health department portal. See our <Link to="/global-coverage" className="text-[#4CAF50] font-bold hover:underline">Coverage page</Link> for details.
            </p>
          </div>
        </section>

        {/* ── 10. Compliance Checklist ── */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">10. Compliance Checklist</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <ul className="space-y-1.5">
              {COMPLIANCE_CHECKLIST.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Links ── */}
        <section className="border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500">
            See also:{" "}
            <Link to="/privacy" className="text-[#4CAF50] font-bold hover:underline">Privacy Policy</Link>
            {" · "}
            <Link to="/terms" className="text-[#4CAF50] font-bold hover:underline">Terms of Use</Link>
            {" · "}
            <Link to="/contact" className="text-[#4CAF50] font-bold hover:underline">Contact</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

// ── Data ──

const DATA_TABLE = [
  { type: "Search queries (restaurant name/location)", collected: true, purpose: "Retrieve inspection data from government APIs", shared: true },
  { type: "Approximate location (city/zip)", collected: true, purpose: "Filter restaurants by proximity", shared: false },
  { type: "Precise GPS location", collected: false, purpose: "Only if user explicitly grants permission", shared: false },
  { type: "Account email & name", collected: true, purpose: "Authentication only", shared: false },
  { type: "Camera captures", collected: false, purpose: "On-device only; images uploaded to AI for analysis, not stored", shared: true },
  { type: "Cached inspection records", collected: true, purpose: "Performance cache from public government data", shared: false },
  { type: "Analytics (anonymous)", collected: true, purpose: "Aggregate usage statistics", shared: false },
  { type: "Device contacts / SMS / call log", collected: false, purpose: "Never accessed", shared: false },
  { type: "Photos / media files", collected: false, purpose: "Never accessed", shared: false },
  { type: "Microphone / audio", collected: false, purpose: "Never accessed", shared: false },
  { type: "Advertising identifiers", collected: false, purpose: "No advertising SDKs present", shared: false },
];

const PERMISSIONS = [
  { name: "INTERNET", icon: Globe, description: "Required to fetch restaurant inspection data from government APIs and display results.", required: true },
  { name: "ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION", icon: MapPin, description: "Used to show nearby restaurants. Only requested when the user taps 'Use my location'. User can decline and search by city name instead.", required: false },
  { name: "CAMERA", icon: Camera, description: "Used only for the optional QR/menu scanner feature. The camera is activated solely when the user taps the Scan button and is released immediately when the scanner closes. No photos are saved to the device.", required: false },
];

const SECURITY_PRACTICES = [
  "All network communication uses HTTPS/TLS encryption (no cleartext HTTP traffic).",
  "Backend API access requires authenticated session tokens — unauthenticated requests are rejected.",
  "Server-side input sanitization on all SoQL/database queries to prevent injection attacks.",
  "SSRF protection: user-supplied URLs are stripped and rebuilt against trusted base domains.",
  "No sensitive data (passwords, tokens) stored in localStorage — authentication is handled via secure HTTP-only session cookies managed by the platform.",
  "Camera stream is released immediately when the scanner view closes — no background camera access.",
  "No JavaScript interfaces exposed to untrusted content (WebView security).",
];

const THIRD_PARTY = [
  { name: "Google Places API", purpose: "Enriches restaurant listings with addresses, phone numbers, and coordinates. Governed by Google's Privacy Policy." },
  { name: "Government Health APIs (US, UK, Canada, France, Netherlands)", purpose: "Public open-data endpoints queried at request time. No credentials exchanged." },
  { name: "AI/LLM Service (OpenAI/Google/Anthropic)", purpose: "Used for restaurant sign/menu scanning and AI-assisted research for regions without live APIs. Image data is processed and not retained." },
];

const NO_ADS = [
  "No advertising SDKs (no Google AdMob, Facebook Audience Network, or any ad SDK).",
  "No ad-tracking identifiers collected (no GAID, IDFA, or AAID).",
  "No behavioral or interest-based advertising.",
  "No social SDKs (no Facebook, Twitter, or Instagram SDKs).",
  "No push notification SDKs for marketing purposes.",
  "No data sold or shared with third parties for advertising or commercial purposes.",
];

const GOV_SOURCES = [
  { region: "New York City", agency: "NYC Open Data — DOHMH Restaurant Inspections" },
  { region: "King County, WA", agency: "King County Open Data — Food Facility Inspections" },
  { region: "Chicago, IL", agency: "Chicago Data Portal — Food Inspections" },
  { region: "Los Angeles County, CA", agency: "LA County Public Health — Restaurant Inspections" },
  { region: "San Francisco, CA", agency: "SF Data — Restaurant Scores" },
  { region: "Dallas, TX", agency: "Dallas Open Data — Restaurant Inspections (Socrata)" },
  { region: "United Kingdom", agency: "FSA Food Hygiene Rating Scheme API" },
  { region: "Toronto, Canada", agency: "Toronto DineSafe Open Data API" },
  { region: "France", agency: "Alim'confiance — DGCCRF Official API" },
  { region: "Netherlands", agency: "NVWA — Netherlands Food Safety Authority API" },
  { region: "Additional US counties", agency: "Wake County NC, Boston MA, Portland OR, Houston TX, Louisville KY, Maricopa AZ, and others via official portals" },
];

const COMPLIANCE_CHECKLIST = [
  "Privacy Policy published and accessible in-app (also at /privacy).",
  "Terms of Use published and accessible in-app (also at /terms).",
  "In-app account deletion available (footer → Delete Account).",
  "Location permission requested only on user action, with decline option.",
  "Camera permission requested only on user action, with decline option.",
  "Consent banner shown on first visit for location/cookie usage.",
  "No background data collection — all API calls are user-initiated.",
  "No data sold to or shared with third parties for commercial purposes.",
  "App content rating: All ages (no violence, mature content, or gambling).",
  "Target audience: General audience (not directed at children).",
  "No deceptive behavior, impersonation, or misleading claims.",
  "All government data sources are publicly documented and verifiable.",
];