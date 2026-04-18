import React, { useState, useEffect } from "react";
import { Loader2, Zap, ShieldCheck, X } from "lucide-react";

const MESSAGES = [
  "🔍 Searching health department records…",
  "🌐 Looking up real government inspection data…",
  "🧠 Double-checking scores and violations…",
  "📋 Pulling full inspection history…",
  "🛡️ Almost done — running final accuracy check…",
];

export default function AISearchStatus({ hasFastResults, onAcceptFast, onCancel }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((s) => s + 1);
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Spinner */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-[#4CAF50] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-[#4CAF50]" />
        </div>
      </div>

      {/* Status message */}
      <p className="text-sm font-semibold text-slate-600 text-center min-h-[20px] transition-all">
        {MESSAGES[msgIdx]}
      </p>
      <p className="text-xs text-slate-400 mt-1">{elapsed}s elapsed</p>

      {/* Accuracy notice */}
      <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 max-w-sm text-center">
        <p className="text-xs font-bold text-amber-800 mb-0.5">⏳ Why does this take a moment?</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          We're pulling <strong>real government health records</strong> from public databases worldwide — not just cached data. This takes 15–25 seconds but gives you actual verified results.
        </p>
      </div>

      {/* Fast results option — shown after 6s if preliminary data is ready */}
      {hasFastResults && elapsed >= 6 && (
        <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in">
          <p className="text-xs text-slate-500 font-semibold">Preliminary results are ready:</p>
          <div className="flex gap-2">
            <button
              onClick={onAcceptFast}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Show fast results now
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center max-w-xs">
            Fast results use AI training data — scores may be estimated. Accurate results use live web verification.
          </p>
        </div>
      )}

      {/* Cancel if no fast results yet but been waiting long */}
      {!hasFastResults && elapsed >= 20 && (
        <button
          onClick={onCancel}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancel search
        </button>
      )}
    </div>
  );
}