import { Link } from "react-router-dom";
import { Handshake, ArrowRight } from "lucide-react";
import { Section } from "./SectionPrimitives";
import { Button } from "@/components/ui/button";

export default function AcquisitionSection() {
  return (
    <Section id="acquisition" className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-[#4CAF50] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm mb-4">
          <Handshake className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Free to use — open to acquisition
        </h2>
        <p className="text-slate-600 leading-relaxed text-sm max-w-xl mb-6">
          SafeEats is free for everyone. No paywalls, no ads, no enterprise tiers. If you're interested in
          purchasing the technology — the normalization engine, the data pipeline, or the full platform —
          we'd love to talk.
        </p>
        <Link to="/contact">
          <Button className="bg-[#4CAF50] hover:bg-[#43A047] text-white">
            Open a conversation <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </Section>
  );
}