import { Database, Search, Languages, FileText, Ban } from "lucide-react";
import { Section, Pill } from "./SectionPrimitives";

const METHODS = [
  { icon: <Database className="w-5 h-5 text-white" />, bg: "bg-emerald-600", title: "Live Government APIs", pill: { text: "REAL-TIME", color: "bg-emerald-500 text-white" }, body: "For jurisdictions that publish open-data APIs — including Los Angeles, New York City, Chicago, San Francisco, King County (Seattle), Austin, Montgomery County MD, and Dubai Municipality via Dubai Pulse — SafeEats queries the official database directly. Data is current as of the moment you search." },
  { icon: <Search className="w-5 h-5 text-white" />, bg: "bg-slate-900", title: "AI-Assisted Research", pill: { text: "EVERYWHERE ELSE", color: "bg-slate-500 text-white" }, body: "For jurisdictions without a live API, our AI reads official health department websites, publicly posted inspection PDFs, and verified local news. Preliminary results are powered by Anthropic's Claude Opus for the most accurate restaurant identification, while live web search uses Gemini to pull real-time inspection data from official sources. Results are clearly labeled as AI-estimated — never presented as official government data." },
  { icon: <Languages className="w-5 h-5 text-white" />, bg: "bg-blue-600", title: "Multilingual Label Scanning", pill: { text: "ANY LANGUAGE", color: "bg-blue-500 text-white" }, body: "Point the camera at any food packaging or sign in Japanese, Chinese, Korean, or any script. SafeEats translates ingredients, allergens, expiration dates, and dietary flags into plain English instantly." },
  { icon: <FileText className="w-5 h-5 text-white" />, bg: "bg-slate-700", title: "Global Coverage", pill: null, body: "SafeEats is location-agnostic. Search for a restaurant by name alone and we find it anywhere in the world. Add a city, state, or ZIP to narrow results to a specific area." },
];

export default function SourcesSection() {
  return (
    <Section id="sources">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">How We Source Data</h2>
      <p className="text-slate-500 text-sm mb-6">Two methods — live APIs where they exist, AI-assisted research everywhere else.</p>
      <div className="space-y-4 mb-8">
        {METHODS.map(({ icon, bg, title, pill, body }) => (
          <div key={title} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>{icon}</div>
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
  );
}