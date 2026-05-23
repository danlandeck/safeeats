import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { ShieldCheck, Info, Globe, Signal } from "lucide-react";
import KofiButton from "./components/KofiButton";
import LanguageSwitcher from "./components/LanguageSwitcher";
import SkipToContent from "./components/SkipToContent";

// Cartoony nav pill style — applied directly to Link for proper semantics
const navPill = "flex items-center gap-1.5 px-3 py-2 text-sm font-extrabold text-slate-300 hover:text-white hover:bg-white/15 rounded-2xl transition-all min-h-[40px] focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:ring-offset-2 focus:ring-offset-slate-900";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SkipToContent />
      {/* Navigation */}
      <nav className="bg-slate-900 border-b-4 border-[#4CAF50] sticky top-0 z-50" aria-label="Main navigation" style={{ fontFamily: "Nunito, sans-serif" }}>
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Logo — big & fun */}
            <a href="/" className="flex items-center gap-2 hover:scale-105 transition-transform flex-shrink-0" aria-label="SafeEats — Home">
              <div className="w-9 h-9 rounded-2xl bg-[#4CAF50] flex items-center justify-center shadow-md border-2 border-white/20" aria-hidden="true">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-black text-xl text-white tracking-tight leading-none">SafeEats</span>
                <div className="text-[9px] text-[#81c784] font-bold leading-none" aria-hidden="true">🛡️ Food Safety for Everyone</div>
              </div>
            </a>
            {/* Nav links */}
            <div className="flex items-center gap-0.5 flex-wrap justify-end" role="list">
              <div role="listitem"><Link to={createPageUrl("About")} className={navPill} aria-label="About SafeEats"><Info className="w-4 h-4" aria-hidden="true" /><span>About</span></Link></div>
              <div role="listitem"><Link to="/global-coverage" className={navPill} aria-label="Global coverage"><Signal className="w-4 h-4" aria-hidden="true" /><span>Coverage</span></Link></div>
              <div role="listitem"><Link to="/country-codes" className={navPill} aria-label="Country codes reference"><Globe className="w-4 h-4" aria-hidden="true" /><span>Codes</span></Link></div>
              <div role="listitem"><Link to="/contact" className={navPill} aria-label="Contact us">💬 <span>Contact</span></Link></div>
              <div role="listitem"><LanguageSwitcher /></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1" id="main-content" tabIndex="-1">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
                <span className="font-extrabold text-white tracking-tight">SafeEats</span>
              </div>
              <p className="text-xs text-slate-500">
                Empowering informed dining decisions through transparency
              </p>
              <div className="flex gap-3 mt-2">
                <Link to="/About" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">About</Link>
                <Link to="/contact" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Contact</Link>
              </div>
            </div>
            <div className="text-center md:text-right space-y-2">
              <KofiButton context="footer" />
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} SafeEats. All rights reserved.
              </p>
              <p className="text-xs text-slate-600">
                Patent Pending | Multi-jurisdiction health data
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}