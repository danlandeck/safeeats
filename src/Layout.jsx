import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { ShieldCheck, Info } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShieldCheck className="w-6 h-6 text-white" />
              <span className="font-extrabold text-lg text-white tracking-tight">SafeEats</span>
            </a>
            <div className="flex items-center gap-2">
              <Link to={createPageUrl("About")}>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                  <Info className="w-4 h-4" />
                  About
                </button>
              </Link>
              <Link to={createPageUrl("Feedback")}>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                  Feedback
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

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
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} SafeEats. All rights reserved.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Patent Pending | Multi-jurisdiction health data
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}