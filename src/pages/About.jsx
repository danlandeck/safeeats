import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Database, TrendingUp, ArrowLeft, Heart, AlertTriangle, Globe, Search, Ban, FileText, Camera, Languages, Baby, Award, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Section = ({ children, className = "" }) => (
  <Card className={`p-7 sm:p-9 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
    {children}
  </Card>
);

const Pill = ({ children, color = "bg-slate-900 text-white" }) => (
  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{children}</span>
);

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/">
          <Button variant="ghost" className="mb-8 text-slate-500 hover:text-slate-800 -ml-2 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-6">

          {/* ── Hero header ── */}
          <div className="text-center pb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-white font-semibold mb-5 shadow-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              About SafeEats
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Your Food Safety<br />
              <span className="text-[#4CAF50]">Companion Worldwide</span>
            </h1>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
              Real inspection data. Instant translation. No third-party redirects. No angry Yelp reviews.
            </p>
          </div>

          {/* ── Disclaimer ── */}
          <Section className="border-2 border-red-300 bg-red-50 shadow-none">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-red-900 mb-3">Important Disclaimer</h2>
                <div className="space-y-2 text-sm text-red-800 leading-relaxed">
                  <p><strong>SafeEats is an informational research tool only.</strong> It is not affiliated with, endorsed by, or a substitute for any government health agency or official inspection authority.</p>
                  <p><strong>Data accuracy is not guaranteed.</strong> Scores come from government open-data APIs or AI-assisted lookups of public records. Both may contain errors, omissions, or outdated entries.</p>
                  <p><strong>AI-estimated scores carry additional uncertainty.</strong> For jurisdictions without a live government API, scores are estimated by AI reading publicly available sources — <em>not official government records</em>.</p>
                  <p className="font-bold text-red-900 border-t border-red-200 pt-3">
                    Always consult your local health department for authoritative records. By using SafeEats you acknowledge data may be incomplete and you are solely responsible for decisions made based on it.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Japan / Scanning story ── */}
          <Section className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white overflow-hidden relative">
            <div className="absolute top-0 right-0 text-7xl opacity-10 select-none pointer-events-none leading-none pr-4 pt-2">🇯🇵</div>
            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <h2 className="text-xl font-extrabold text-slate-900">Built for the American in Japan</h2>
                  <Pill color="bg-blue-600 text-white">Scan Any Language</Pill>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm mb-4">
                  Imagine arriving at a Tokyo konbini or a Osaka izakaya — menus entirely in kanji, ingredient labels in fine-print kana, and a health inspection placard you can't read. As a parent, an allergy sufferer, or anyone navigating a foreign food system, this is genuinely stressful.
                </p>
                <div className="bg-white rounded-2xl border border-blue-200 p-5 mb-4 shadow-sm">
                  <p className="text-xs font-extrabold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" /> Real Pitfalls SafeEats Helps You Avoid
                  </p>
                  <ul className="space-y-2.5 text-sm text-slate-700">
                    {[
                      { flag: "🦐", text: "Hidden shellfish — Japanese sauces often contain エキス (extract) from shrimp or crab. SafeEats flags these from the ingredient list even when buried in kanji." },
                      { flag: "📅", text: "Expiration labels — 賞味期限 (best before) vs 消費期限 (use by) look identical to untrained eyes. SafeEats translates both and explains the difference." },
                      { flag: "🥛", text: "\"Domestic\" labeling — 国産 means \"Product of Japan\" not \"dairy-free.\" SafeEats reads country-of-origin and surfaces it clearly." },
                      { flag: "📊", text: "Nutrition per 100g — Japan doesn't use US-style \"per serving\" sizing. SafeEats converts and displays calories, fat, sodium in the format you understand." },
                      { flag: "🕌", text: "Halal & vegan flags — Japan's labeling standards differ from Western ones. SafeEats checks ingredient lists, not just packaging claims." },
                    ].map(({ flag, text }) => (
                      <li key={flag} className="flex gap-3 items-start">
                        <span className="text-lg leading-none mt-0.5">{flag}</span>
                        <span className="text-slate-600 leading-relaxed">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-slate-500 italic">
                  Point SafeEats' camera at any sign, label, or menu in any language — it reads, translates, and surfaces what matters most in seconds.
                </p>
              </div>
            </div>
          </Section>

          {/* ── Mission ── */}
          <Section>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Why SafeEats Exists</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Food safety data should be accessible — not buried in county portals, PDF archives, or behind paywalls. SafeEats aggregates inspection records from official health departments worldwide and presents them through a single, consistent interface with a universal A–F grading system.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Every jurisdiction grades differently. A "Pass" in Chicago, 94 penalty points in LA, and a letter grade in NYC all mean different things. SafeEats normalizes everything to a 0–100 scale so you're always comparing apples to apples.
            </p>
          </Section>

          {/* ── ADA Accessibility ── */}
          <Section className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white overflow-hidden relative">
            <div className="absolute top-0 right-0 text-7xl opacity-10 select-none pointer-events-none leading-none pr-4 pt-2">♿</div>
            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Accessibility className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <h2 className="text-xl font-extrabold text-slate-900">ADA Accessibility — A Personal Commitment</h2>
                  <Pill color="bg-emerald-600 text-white">NEW FEATURE</Pill>
                </div>
                <p className="text-slate-700 leading-relaxed text-sm mb-4">
                  Accessibility is deeply personal to our family. Knowing whether a restaurant is wheelchair accessible, has accessible restrooms, or adequate parking shouldn't require a phone call or a gamble — it should be right there alongside the health score before you ever leave the house.
                </p>
                <div className="bg-white rounded-2xl border border-emerald-200 p-5 mb-4 shadow-sm">
                  <p className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest mb-3">What SafeEats Checks for Every US Restaurant</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: "🚪", title: "Accessible Entrance", desc: "Ramp, level entry, or automatic doors" },
                      { icon: "🚻", title: "Accessible Restroom", desc: "ADA-compliant facilities on-site" },
                      { icon: "🅿️", title: "Accessible Parking", desc: "Designated accessible spaces nearby" },
                    ].map(({ icon, title, desc }) => (
                      <div key={title} className="flex flex-col items-center text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-2xl mb-1">{icon}</span>
                        <p className="text-xs font-extrabold text-slate-800">{title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-emerald-700 rounded-2xl p-4 text-white">
                  <p className="text-sm font-bold mb-1">📧 See wrong ADA info? Tell us.</p>
                  <p className="text-emerald-100 text-xs leading-relaxed">
                    If SafeEats displays incorrect accessibility information for any restaurant, use the <Link to="/Feedback" className="underline font-semibold text-white">Feedback page</Link> to report it. Daniel personally follows up with businesses where accessibility data is inaccurate — because every family deserves to know before they show up.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Data Sources ── */}
          <Section>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">How We Source Data</h2>
            <p className="text-slate-500 text-sm mb-6">Two methods — live APIs where they exist, AI-assisted research everywhere else.</p>
            <div className="space-y-4 mb-8">
              {[
                {
                  icon: <Database className="w-5 h-5 text-white" />,
                  bg: "bg-emerald-600",
                  title: "Live Government APIs",
                  pill: { text: "REAL-TIME", color: "bg-emerald-500 text-white" },
                  body: "For jurisdictions that publish open-data APIs — including Los Angeles, New York City, Chicago, San Francisco, King County (Seattle), Austin, and Montgomery County MD — SafeEats queries the official database directly. Data is current as of the moment you search.",
                },
                {
                  icon: <Search className="w-5 h-5 text-white" />,
                  bg: "bg-slate-900",
                  title: "AI-Assisted Research",
                  pill: { text: "EVERYWHERE ELSE", color: "bg-slate-500 text-white" },
                  body: "For jurisdictions without a live API, our AI reads official health department websites, publicly posted inspection PDFs, and verified local news. Results are clearly labeled as AI-estimated — never presented as official government data.",
                },
                {
                  icon: <Languages className="w-5 h-5 text-white" />,
                  bg: "bg-blue-600",
                  title: "Multilingual Label Scanning",
                  pill: { text: "ANY LANGUAGE", color: "bg-blue-500 text-white" },
                  body: "Point the camera at any food packaging or sign in Japanese, Chinese, Korean, or any script. SafeEats translates ingredients, allergens, expiration dates, and dietary flags into plain English instantly.",
                },
                {
                  icon: <FileText className="w-5 h-5 text-white" />,
                  bg: "bg-slate-700",
                  title: "Global Coverage",
                  pill: null,
                  body: "SafeEats is location-agnostic. Search for a restaurant by name alone and we find it anywhere in the world. Add a city, state, or ZIP to narrow results to a specific area.",
                },
              ].map(({ icon, bg, title, pill, body }) => (
                <div key={title} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 mb-1 flex flex-wrap items-center gap-2">
                      {title}
                      {pill && <Pill color={pill.color}>{pill.text}</Pill>}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* No-Yelp callout */}
            <div className="bg-red-950 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <Ban className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <p className="text-lg font-extrabold">We Don't Use Yelp. Not Even a Little.</p>
                    <Pill color="bg-red-600 text-white">BY DESIGN</Pill>
                  </div>
                  <p className="text-red-200 leading-relaxed text-sm mb-3">
                    Yelp is a consumer review platform. Your food safety intelligence should not come from the same pool that includes one-star reviews because the parking lot was too small, or five-stars bought by the owner.
                  </p>
                  <p className="text-red-100 font-semibold text-sm">
                    SafeEats is just the facts. Inspector-issued scores. Violation codes. Official records. Did the health department pass this restaurant or not?
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Grading ── */}
          <Section>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-5">The Grading System</h2>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[
                { grade: "A", range: "90–100", color: "bg-green-700",  text: "text-white" },
                { grade: "B", range: "80–89",  color: "bg-green-400",  text: "text-white" },
                { grade: "C", range: "70–79",  color: "bg-yellow-400", text: "text-slate-800" },
                { grade: "D", range: "60–69",  color: "bg-orange-400", text: "text-white" },
                { grade: "F", range: "< 60",   color: "bg-red-600",    text: "text-white" },
              ].map(({ grade, range, color, text }) => (
                <div key={grade} className={`${color} rounded-2xl p-3 text-center shadow-sm`}>
                  <div className={`text-2xl font-extrabold ${text}`}>{grade}</div>
                  <div className={`text-xs font-semibold opacity-90 mt-0.5 ${text}`}>{range}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Raw scores from each jurisdiction (penalty points, pass/fail outcomes, letter grades) are normalized to a universal 0–100 scale. A score of 85 means different underlying criteria in Los Angeles vs. Chicago — the grade gives you a consistent at-a-glance verdict, but always review the full violation history for context.
            </p>
          </Section>

          {/* ── Esri ── */}
          <Section>
            <div className="flex gap-5 items-start">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900">Powered by Esri GIS Technology</h2>
                  <Pill color="bg-blue-100 text-blue-700">Map Data Partner</Pill>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm mb-4">
                  SafeEats uses Esri's diverging health-risk color scale — the same visual language used by public health agencies worldwide — to make safety risk immediately legible at a glance. Their perceptually calibrated color ramp works even for users with color vision deficiencies.
                </p>
                <a
                  href="https://www.esri.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
                >
                  Learn more about Esri →
                </a>
              </div>
            </div>
          </Section>

          {/* ── Creator ── */}
          <Section className="border-2 border-slate-100">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center flex-shrink-0 text-3xl shadow-md">
                🥋
              </div>
              <div className="flex-1">
                <p className="text-xs font-extrabold text-[#4CAF50] uppercase tracking-widest mb-1">About the Creator</p>
                <p className="text-2xl font-extrabold text-slate-900">Daniel Landeck</p>
                <p className="text-slate-500 text-sm mt-0.5 mb-4">Global Citizen · University of Washington Graduate</p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { icon: <Award className="w-3.5 h-3.5" />, text: "Black Belt · Okinawan Karate (Shudokan)", color: "bg-slate-900 text-white border border-slate-700" },
                    { icon: <Award className="w-3.5 h-3.5" />, text: "Blue Belt · Brazilian Jiu Jitsu", color: "bg-blue-100 text-blue-800 border border-blue-200" },
                    { icon: <Baby className="w-3.5 h-3.5" />, text: "Doting Father", color: "bg-pink-50 text-pink-700 border border-pink-200" },
                    { icon: <span className="text-xs">🎮</span>, text: "Veteran Game Developer", color: "bg-slate-100 text-slate-700 border border-slate-200" },
                    { icon: <span className="text-xs">🎬</span>, text: "Film Producer", color: "bg-amber-50 text-amber-700 border border-amber-200" },
                  ].map(({ icon, text, color }) => (
                    <span key={text} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${color}`}>
                      {icon}{text}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  Daniel built SafeEats as a genuine public service — transparent food safety data, free, because the public deserves better than a wall of government PDFs. As a doting father, knowing what's in the food his family eats isn't optional — it's personal. That same drive extends to anyone navigating foreign food systems, managing allergies, or simply trying to make an informed choice about where to eat tonight.
                </p>

                <div className="flex flex-wrap gap-2">
                  {[
                    { href: "https://www.linkedin.com/in/danlandeck/", label: "LinkedIn →", style: "bg-slate-900 text-white hover:bg-slate-700" },
                    { href: "https://www.mobygames.com/person/277275/daniel-landeck/", label: "MobyGames →", style: "bg-slate-100 text-slate-800 hover:bg-slate-200" },
                    { href: "https://www.imdb.com/name/nm6015660/", label: "IMDb →", style: "bg-slate-100 text-slate-800 hover:bg-slate-200" },
                  ].map(({ href, label, style }) => (
                    <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm ${style}`}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500 flex items-center justify-center gap-1.5">
              Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for food safety transparency
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}