import { Award, Baby } from "lucide-react";
import { Section } from "./SectionPrimitives";

const BADGES = [
  { icon: <Award className="w-3.5 h-3.5" />, text: "Black Belt · Okinawan Karate (Shudokan)", color: "bg-slate-900 text-white border border-slate-700" },
  { icon: <Award className="w-3.5 h-3.5" />, text: "Blue Belt · Brazilian Jiu Jitsu", color: "bg-blue-100 text-blue-800 border border-blue-200" },
  { icon: <Baby className="w-3.5 h-3.5" />, text: "Doting Father", color: "bg-pink-50 text-pink-700 border border-pink-200" },
  { icon: <span className="text-xs">🎮</span>, text: "Veteran Game Developer", color: "bg-slate-100 text-slate-700 border border-slate-200" },
  { icon: <span className="text-xs">🎬</span>, text: "Film Producer", color: "bg-amber-50 text-amber-700 border border-amber-200" },
];

const LINKS = [
  { href: "https://www.linkedin.com/in/danlandeck/", label: "LinkedIn →", style: "bg-slate-900 text-white hover:bg-slate-700" },
  { href: "https://www.mobygames.com/person/277275/daniel-landeck/", label: "MobyGames →", style: "bg-slate-100 text-slate-800 hover:bg-slate-200" },
  { href: "https://www.imdb.com/name/nm6015660/", label: "IMDb →", style: "bg-slate-100 text-slate-800 hover:bg-slate-200" },
];

export default function CreatorSection() {
  return (
    <Section id="creator" className="border-2 border-slate-100">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center flex-shrink-0 text-3xl shadow-md">🥋</div>
        <div className="flex-1">
          <p className="text-xs font-extrabold text-[#4CAF50] uppercase tracking-widest mb-1">About the Creator</p>
          <p className="text-2xl font-extrabold text-slate-900">Daniel Landeck</p>
          <p className="text-slate-500 text-sm mt-0.5 mb-4">Global Citizen · University of Washington Graduate</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {BADGES.map(({ icon, text, color }) => (
              <span key={text} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${color}`}>{icon}{text}</span>
            ))}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Daniel built SafeEats as a genuine public service — transparent food safety data, free, because the public deserves better than a wall of government PDFs. As a doting father, knowing what's in the food his family eats isn't optional — it's personal. That same drive extends to anyone navigating foreign food systems, managing allergies, or simply trying to make an informed choice about where to eat tonight.
          </p>
          <div className="flex flex-wrap gap-2">
            {LINKS.map(({ href, label, style }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm ${style}`}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}