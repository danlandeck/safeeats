import React, { useState, useEffect } from "react";
import { MapPin, Cookie, X, CheckCircle } from "lucide-react";

const CONSENT_KEY = "safeeats_consent_v1";

export function useConsent() {
  const [consent, setConsent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)) || null; }
    catch { return null; }
  });

  const accept = () => {
    const val = { location: true, cookies: true, ts: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(val));
    setConsent(val);
  };

  const decline = () => {
    const val = { location: false, cookies: false, ts: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(val));
    setConsent(val);
  };

  return { consent, accept, decline };
}

export default function ConsentBanner({ onAccept, onDecline }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch { setVisible(true); }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    setVisible(false);
    onDecline?.();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 flex gap-1.5 mt-0.5">
            <MapPin className="w-5 h-5 text-blue-400" />
            <Cookie className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-snug mb-1">Enable Location & Cookies</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              SafeEats uses your <strong className="text-white">location</strong> to show nearby restaurant inspection results and <strong className="text-white">cookies</strong> to remember your preferences. We never sell your data.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handleAccept}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Allow Location & Cookies
              </button>
              <button
                onClick={handleDecline}
                className="text-slate-400 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                No thanks
              </button>
            </div>
          </div>
          <button onClick={handleDecline} className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}