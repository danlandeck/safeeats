import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Camera, RotateCcw, Search, Loader2, ScanLine, Utensils, AlertTriangle, Leaf, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function CameraScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState("camera"); // camera | preview | analyzing | done | error
  const [capturedImage, setCapturedImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  const startCamera = useCallback(async (facing = "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setErrorMsg("Camera access denied. Please allow camera permission and try again.");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const flipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    setPhase("preview");
  };

  const retake = async () => {
    setCapturedImage(null);
    setExtracted(null);
    setPhase("camera");
    await startCamera(facingMode);
  };

  const analyze = async () => {
    setPhase("analyzing");
    try {
      // Convert data URL to blob and upload
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert at reading food packaging, restaurant signs, menus, and health inspection placards in ANY language including Japanese (kanji/hiragana/katakana), Chinese, Korean, and other scripts.

Detect whether this image is a FOOD PRODUCT LABEL or a RESTAURANT SIGN/PLACARD, then extract:

FOR RESTAURANT SIGNS / INSPECTION PLACARDS:
- name: restaurant name (translate to English if needed)
- address, city, inspection_grade, inspection_score
- is_food_label: false

FOR FOOD PRODUCT LABELS (Japanese konbini, supermarket, packaged food):
- product_name in English (translate)
- ingredients: English array (translate all)
- allergens: flag shellfish, nuts, dairy, gluten, eggs, soy, wheat, fish. In Japan look for 特定原材料 (mandatory) and hidden shellfish in sauces (エキス = extract)
- nutrition_per_100g: {calories, protein_g, fat_g, carbs_g, sodium_mg} — Japanese labels use per 100g
- expiration_date: translate 賞味期限 (best before) or 消費期限 (use by), include type
- dietary_flags: halal, vegan, vegetarian, gluten-free, organic, kosher
- country_of_origin: translate 国産 as "Japan (domestic)"
- warnings: any safety/allergen warnings in plain English
- is_food_label: true

Set unknown fields to null. ALWAYS translate non-English text.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            inspection_grade: { type: "string" },
            inspection_score: { type: "number" },
            is_food_label: { type: "boolean" },
            product_name: { type: "string" },
            ingredients: { type: "array", items: { type: "string" } },
            allergens: { type: "array", items: { type: "string" } },
            nutrition_per_100g: { type: "object" },
            expiration_date: { type: "string" },
            dietary_flags: { type: "array", items: { type: "string" } },
            country_of_origin: { type: "string" },
            warnings: { type: "array", items: { type: "string" } },
          },
        },
      });

      if (!result?.name && !result?.product_name) {
        setErrorMsg("Couldn't read anything useful. Try a clearer, closer shot.");
        setPhase("error");
        return;
      }

      setExtracted(result);
      setPhase("done");
    } catch (e) {
      setErrorMsg("Analysis failed. Please try again.");
      setPhase("error");
    }
  };

  const doSearch = () => {
    if (extracted?.is_food_label) { onClose(); return; }
    if (!extracted?.name) return;
    const query = extracted.address
      ? `${extracted.name}, ${extracted.address}`
      : extracted.name;
    onResult(query, extracted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm">Scan Restaurant</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera / Preview area */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {phase === "camera" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-48 sm:w-96 sm:h-64">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-0.5 w-full bg-emerald-400/60 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-1.5 px-6">
              <p className="text-white/90 text-sm font-semibold text-center">Point at any sign, label, or placard</p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {["🏪 Restaurant sign","🇯🇵 Japanese label","🧾 Inspection grade","🥫 Food packaging"].map(t => (
                  <span key={t} className="text-[11px] bg-white/15 text-white/80 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {phase === "preview" && capturedImage && (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        )}

        {phase === "analyzing" && (
          <div className="flex flex-col items-center gap-4 text-white px-8 text-center">
            <div className="relative">
              <Loader2 className="w-14 h-14 animate-spin text-emerald-400" />
              <ScanLine className="w-6 h-6 text-white/60 absolute inset-0 m-auto" />
            </div>
            <p className="font-extrabold text-xl">Analyzing…</p>
            <p className="text-sm text-white/60 max-w-xs">AI vision is reading text in any language — Japanese, English, and more</p>
          </div>
        )}

        {phase === "done" && extracted && (
          <div className="w-full h-full overflow-y-auto">
            <div className="flex flex-col gap-4 px-6 py-6 text-white w-full max-w-sm mx-auto">

              {extracted.is_food_label ? (
                /* ── FOOD LABEL MODE ── */
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Utensils className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Food Label Decoded</p>
                      <h2 className="text-lg font-extrabold leading-tight">{extracted.product_name || "Unknown Product"}</h2>
                    </div>
                  </div>

                  {extracted.allergens?.length > 0 && (
                    <div className="bg-red-500/20 border border-red-400/40 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <p className="text-sm font-extrabold text-red-300">Allergens Detected</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {extracted.allergens.map((a, i) => (
                          <span key={i} className="px-2.5 py-1 bg-red-500/30 text-red-200 text-xs font-bold rounded-full border border-red-400/30">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extracted.dietary_flags?.length > 0 && (
                    <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf className="w-4 h-4 text-emerald-400" />
                        <p className="text-sm font-extrabold text-emerald-300">Dietary</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {extracted.dietary_flags.map((f, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-500/25 text-emerald-200 text-xs font-bold rounded-full capitalize">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extracted.nutrition_per_100g && Object.keys(extracted.nutrition_per_100g).length > 0 && (
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-xs font-extrabold text-white/60 uppercase tracking-widest mb-3">Nutrition per 100g</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(extracted.nutrition_per_100g).map(([k, v]) => (
                          <div key={k} className="text-center bg-white/5 rounded-xl p-2">
                            <p className="text-base font-extrabold text-white">{v}</p>
                            <p className="text-[10px] text-white/50 capitalize mt-0.5">{k.replace(/_/g," ")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extracted.expiration_date && (
                    <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                      <Calendar className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-widest">Expiration</p>
                        <p className="text-sm font-bold text-yellow-300">{extracted.expiration_date}</p>
                      </div>
                    </div>
                  )}

                  {extracted.ingredients?.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4">
                      <p className="text-xs font-extrabold text-white/50 uppercase tracking-widest mb-2">Ingredients</p>
                      <p className="text-xs text-white/70 leading-relaxed">{extracted.ingredients.join(", ")}</p>
                    </div>
                  )}

                  {extracted.country_of_origin && (
                    <p className="text-xs text-white/40 text-center">Origin: {extracted.country_of_origin}</p>
                  )}

                  {extracted.warnings?.length > 0 && (
                    <div className="bg-orange-500/15 border border-orange-400/30 rounded-2xl p-3">
                      {extracted.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-orange-300">⚠ {w}</p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* ── RESTAURANT MODE ── */
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Restaurant Found</p>
                      <h2 className="text-lg font-extrabold leading-tight">{extracted.name}</h2>
                    </div>
                  </div>
                  {extracted.address && <p className="text-sm text-white/60">{extracted.address}{extracted.city ? `, ${extracted.city}` : ""}</p>}
                  {(extracted.inspection_grade || extracted.inspection_score != null) && (
                    <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-4">
                      {extracted.inspection_grade && (
                        <div className="text-center">
                          <p className="text-[10px] text-white/50 uppercase tracking-widest">Grade</p>
                          <p className="text-4xl font-extrabold text-emerald-400">{extracted.inspection_grade}</p>
                        </div>
                      )}
                      {extracted.inspection_score != null && (
                        <div className="text-center">
                          <p className="text-[10px] text-white/50 uppercase tracking-widest">Score</p>
                          <p className="text-4xl font-extrabold text-emerald-400">{extracted.inspection_score}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-4 px-8 text-white text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="w-7 h-7 text-red-400" />
            </div>
            <p className="font-semibold text-base">{errorMsg}</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom controls */}
      <div className="bg-black/90 px-6 py-5 flex items-center justify-center gap-4">
        {phase === "camera" && (
          <>
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={capture}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-white/90 transition-colors border-4 border-white/30"
            >
              <Camera className="w-8 h-8 text-slate-900" />
            </button>
            <div className="w-12 h-12" />
          </>
        )}

        {phase === "preview" && (
          <>
            <Button variant="outline" onClick={retake} className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
              <RotateCcw className="w-4 h-4" /> Retake
            </Button>
            <Button onClick={analyze} className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2 px-6">
              <Search className="w-4 h-4" /> Analyze
            </Button>
          </>
        )}

        {phase === "done" && (
          <>
            <Button variant="outline" onClick={retake} className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
              <RotateCcw className="w-4 h-4" /> Scan Again
            </Button>
            {!extracted?.is_food_label && (
              <Button onClick={doSearch} className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2 px-6">
                <Search className="w-4 h-4" /> Search This Restaurant
              </Button>
            )}
          </>
        )}

        {phase === "error" && (
          <Button onClick={retake} className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
            <RotateCcw className="w-4 h-4" /> Try Again
          </Button>
        )}
      </div>
    </div>
  );
}