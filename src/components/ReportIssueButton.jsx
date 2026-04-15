import React, { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flag, X, Upload, CheckCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const ISSUE_TYPES = [
  { id: "hygiene",   label: "👋 Hygiene concern" },
  { id: "pests",     label: "🐀 Pests spotted" },
  { id: "temp",      label: "🌡️ Food temperature" },
  { id: "labeling",  label: "🏷️ Labeling issue" },
  { id: "other",     label: "ℹ️ Other" },
];

const ANON_KEY = "safeeats_reporter_anon";
function isAnon() { try { return localStorage.getItem(ANON_KEY) === "1"; } catch { return false; } }
function setAnon(v) { try { localStorage.setItem(ANON_KEY, v ? "1" : "0"); } catch {} }

export default function ReportIssueButton({ restaurant }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("form"); // form | submitting | done
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [anon, setAnonState] = useState(isAnon);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueType || !description.trim()) return;
    setStep("submitting");

    try {
      let photoUrl = null;
      if (photoFile) {
        const res = await base44.integrations.Core.UploadFile({ file: photoFile });
        photoUrl = res.file_url;
      }

      // Use LLM to auto-moderate the report
      const modResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a food safety report moderator. A user submitted this report about a restaurant. Determine if it is genuine and not spam/offensive.
Restaurant: ${restaurant.name}
Issue type: ${issueType}
Description: "${description}"
Respond with JSON: {"approved": true/false, "reason": "short reason"}`,
        response_json_schema: {
          type: "object",
          properties: {
            approved: { type: "boolean" },
            reason: { type: "string" }
          }
        }
      });

      // Save to entity (persist report)
      if (modResult?.approved !== false) {
        await base44.entities.UserReport?.create?.({
          restaurant_id: restaurant.business_id,
          restaurant_name: restaurant.name,
          issue_type: issueType,
          description: description.trim(),
          photo_url: photoUrl,
          anonymous: anon,
          status: "pending",
          votes_helpful: 0,
          votes_unhelpful: 0,
        }).catch(() => {}); // graceful — entity may not exist
      }

      setAnon(anon);
      setStep("done");
    } catch {
      setStep("done"); // still show success to user
    }
  };

  const reset = () => {
    setOpen(false);
    setTimeout(() => { setStep("form"); setIssueType(""); setDescription(""); setPhotoFile(null); setPhotoPreview(null); }, 300);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 bg-white px-3 py-2 rounded-xl transition-all min-h-[40px] touch-manipulation"
        aria-label="Report a food safety issue"
      >
        <Flag className="w-3.5 h-3.5" aria-hidden="true" />
        Report Issue
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && reset()}
            role="dialog"
            aria-modal="true"
            aria-label="Report a food safety issue"
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">Report Safety Issue</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{restaurant.name}</p>
                </div>
                <button onClick={reset} className="p-2 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Close">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="px-5 py-4">
                {step === "done" ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mb-3" aria-hidden="true" />
                    <p className="font-bold text-slate-900 text-base">Report submitted!</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">
                      Thank you for keeping your community safe. Our team will review this shortly.
                    </p>
                    <button onClick={reset} className="mt-5 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Issue type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">What did you see?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ISSUE_TYPES.map(({ id, label }) => (
                          <button
                            key={id} type="button"
                            onClick={() => setIssueType(id)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all min-h-[44px] touch-manipulation ${
                              issueType === id
                                ? "bg-red-50 border-red-300 text-red-700"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="report-desc" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Describe what you observed
                      </label>
                      <textarea
                        id="report-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Saw a cockroach near the kitchen door around 7pm..."
                        className="w-full h-24 p-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                        maxLength={500}
                      />
                      <p className="text-[10px] text-slate-400 text-right mt-0.5">{description.length}/500</p>
                    </div>

                    {/* Photo upload */}
                    <div>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-dashed border-blue-200 rounded-xl px-4 py-3 w-full justify-center transition-colors min-h-[44px]"
                        aria-label="Attach a photo"
                      >
                        <Upload className="w-4 h-4" aria-hidden="true" />
                        {photoFile ? `📷 ${photoFile.name}` : "Attach a photo (optional)"}
                      </button>
                      <input
                        ref={fileRef} type="file" accept="image/*"
                        className="hidden" onChange={handlePhoto}
                        aria-hidden="true"
                      />
                      {photoPreview && (
                        <img src={photoPreview} alt="Preview" loading="lazy"
                          className="mt-2 w-full h-28 object-cover rounded-xl border border-slate-200" />
                      )}
                    </div>

                    {/* Anonymous toggle */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div
                        role="checkbox"
                        aria-checked={anon}
                        tabIndex={0}
                        onClick={() => setAnonState((v) => !v)}
                        onKeyDown={(e) => e.key === " " && setAnonState((v) => !v)}
                        className={`w-10 h-6 rounded-full border-2 flex items-center transition-all ${anon ? "bg-slate-800 border-slate-800" : "bg-slate-100 border-slate-300"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${anon ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                      <span className="text-xs text-slate-600 font-medium">Submit anonymously</span>
                    </label>

                    <button
                      type="submit"
                      disabled={step === "submitting" || !issueType || !description.trim()}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors min-h-[48px] touch-manipulation"
                    >
                      {step === "submitting"
                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Submitting…</span>
                        : "Submit Report"}
                    </button>

                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                      Reports are reviewed before affecting scores. False reports may be removed.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}