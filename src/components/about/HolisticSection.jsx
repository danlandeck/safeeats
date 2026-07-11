import { ClipboardList, Droplets, Accessibility, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Inspection History",
    body: "Not just the latest grade — SafeEats shows the full timeline. Repeated violations, clean streaks, and trending patterns tell you whether a restaurant is consistently safe or just had one good day.",
  },
  {
    icon: <Droplets className="w-5 h-5" />,
    title: "Water Quality",
    body: "Even a spotless kitchen can't fix contaminated water. SafeEats pulls EPA water system data for the restaurant's area so you know what's coming out of the tap — contaminants, violations, and all.",
  },
  {
    icon: <Accessibility className="w-5 h-5" />,
    title: "Accessibility",
    body: "Can your grandmother get through the door? Does it have an accessible restroom? A safety grade is meaningless if you can't enter the building. SafeEats checks ADA compliance for every US restaurant.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Source Transparency",
    body: "Every score links back to the government database it came from. No anonymous data, no review-site opinions — just inspector-issued records you can verify yourself with one click.",
  },
];

export default function HolisticSection() {
  return (
    <div id="beyond" className="scroll-mt-32 pt-2">
      <div className="text-center mb-6">
        <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-[#4CAF50] mb-2">
          Beyond the Grade
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
          A Holistic Picture of Restaurant Safety
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xl mx-auto">
          Most tools stop at a letter grade. SafeEats doesn't — because a single score can't tell you whether the water is clean, whether the kitchen has a history of repeat violations, or whether your family can even get through the front door.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PILLARS.map(({ icon, title, body }) => (
          <div
            key={title}
            className="flex gap-3 items-start p-4 bg-white rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="w-9 h-9 bg-[#4CAF50] rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm">
              {icon}
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">{title}</p>
              <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400 mt-4 italic">
        Pest trackers tell you where the rats are. SafeEats tells you whether the restaurant is safe — for everyone, in every way that matters.
      </p>
    </div>
  );
}