import React, { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

export default function LanguageSwitcher() {
  const { langCode, langMeta, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-extrabold text-slate-300 hover:text-white hover:bg-white/15 transition-all min-h-[40px]"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{langMeta.flag} {langMeta.nativeLabel}</span>
        <span className="sm:hidden">{langMeta.flag}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[200] overflow-hidden"
          role="listbox"
          aria-label="Language options"
        >
          <div className="p-2 grid grid-cols-1 gap-0.5 max-h-80 overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                role="option"
                aria-selected={lang.code === langCode}
                onClick={() => { setLanguage(lang.code); setOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all ${
                  lang.code === langCode
                    ? "bg-[#4CAF50] text-white"
                    : "text-slate-200 hover:bg-slate-700"
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.nativeLabel}</span>
                {lang.code === langCode && <span className="ml-auto text-xs opacity-75">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}