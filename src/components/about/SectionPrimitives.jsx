import { Card } from "@/components/ui/card";

export const Section = ({ children, className = "", id }) => (
  <Card
    id={id}
    className={`p-7 sm:p-9 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow scroll-mt-32 ${className}`}
  >
    {children}
  </Card>
);

export const Pill = ({ children, color = "bg-slate-900 text-white" }) => (
  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{children}</span>
);