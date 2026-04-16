import React, { useState } from "react";
import { ShieldCheck, Copy, Check, Code2 } from "lucide-react";
import { getGrade } from "../utils/grading";

// A page where anyone can generate an embed snippet for a restaurant

export default function EmbedGenerator() {
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/widget` : "/widget";
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (score) params.set("score", score);
  if (address) params.set("address", address);
  if (date) params.set("date", date);
  if (score) params.set("grade", getGrade(parseInt(score)));

  const widgetUrl = `${baseUrl}?${params.toString()}`;
  const iframeCode = `<iframe src="${widgetUrl}" width="320" height="130" frameborder="0" style="border-radius:16px;overflow:hidden;"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Code2 className="w-3.5 h-3.5" /> Embed Widget
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">SafeEats Embed Widget</h1>
          <p className="text-slate-500 mt-2 text-sm">Add a safety score badge to any website, blog, or review platform.</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Restaurant Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. McDonald's Capitol Hill"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Safety Score (0–100) *</label>
            <input
              type="number"
              min="0" max="100"
              value={score}
              onChange={e => setScore(e.target.value)}
              placeholder="e.g. 87"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Address (optional)</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Seattle WA"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Last Inspection Date (optional)</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Preview */}
        {name && score && (
          <div className="mt-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preview</p>
            <iframe
              src={widgetUrl}
              width="320"
              height="130"
              frameBorder="0"
              style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0" }}
              title="SafeEats widget preview"
            />
          </div>
        )}

        {/* Embed code */}
        {name && score && (
          <div className="mt-6 bg-slate-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Embed Code</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all leading-relaxed">{iframeCode}</pre>
          </div>
        )}

        {!name || !score ? (
          <p className="text-center text-sm text-slate-400 mt-6">Fill in the restaurant name and score to generate your embed code.</p>
        ) : null}
      </div>
    </div>
  );
}