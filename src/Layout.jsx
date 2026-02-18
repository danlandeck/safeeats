import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { ShieldCheck, Info } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <span className="font-bold text-lg text-slate-900">SafeEats</span>
            </Link>
            <Link to={createPageUrl("About")}>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                <Info className="w-4 h-4" />
                About
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-white">SafeEats</span>
              </div>
              <p className="text-xs text-slate-400">
                Empowering informed dining decisions through transparency
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} SafeEats. All rights reserved.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Patent Pending | Data from King County Public Health
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}