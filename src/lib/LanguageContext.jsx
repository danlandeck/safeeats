import React, { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS } from "../utils/i18n";

// ISO 639-1 supported languages
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", flag: "🇮🇹", dir: "ltr" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", flag: "🇧🇷", dir: "ltr" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands", flag: "🇳🇱", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇦🇪", dir: "rtl" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", flag: "🇨🇳", dir: "ltr" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", flag: "🇯🇵", dir: "ltr" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", flag: "🇰🇷", dir: "ltr" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", flag: "🇹🇷", dir: "ltr" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά", flag: "🇬🇷", dir: "ltr" },
  { code: "th", label: "Thai", nativeLabel: "ภาษาไทย", flag: "🇹🇭", dir: "ltr" },
];

const STORAGE_KEY = "safeeats_lang";

function detectBrowserLanguage() {
  const nav = navigator.language || navigator.languages?.[0] || "en";
  // ISO 639-1: take first 2 chars (e.g. "en-US" → "en")
  const code = nav.split("-")[0].toLowerCase();
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.code || "en";
}

function loadPersistedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.find((l) => l.code === saved)) return saved;
  } catch {}
  return null;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [langCode, setLangCode] = useState(() => {
    return loadPersistedLanguage() || detectBrowserLanguage();
  });

  const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  const t = TRANSLATIONS[langCode] || TRANSLATIONS["en"];

  // Apply dir attribute to <html> for RTL support (ISO standard)
  useEffect(() => {
    document.documentElement.setAttribute("lang", langCode);
    document.documentElement.setAttribute("dir", langMeta.dir);
  }, [langCode, langMeta.dir]);

  const setLanguage = (code) => {
    setLangCode(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ langCode, langMeta, t, setLanguage, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}