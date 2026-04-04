import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Camera, RotateCcw, Search, Loader2, ScanLine } from "lucide-react";
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
        prompt: `This image shows a restaurant storefront, sign, menu board, or health inspection placard.
Extract the restaurant name and address (if visible).
If you see a health inspection score or grade placard, also extract that.
Return ONLY a JSON object with these fields:
- name: string (restaurant name, or null if unclear)
- address: string (street address, or null if not visible)
- city: string (city name, or null)
- inspection_grade: string (e.g. "A", "B", "Pass", or null)
- inspection_score: number (numeric score 0-100, or null)
If you cannot identify a restaurant at all, set name to null.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            inspection_grade: { type: "string" },
            inspection_score: { type: "number" },
          },
        },
      });

      if (!result?.name) {
        setErrorMsg("Couldn't identify a restaurant in the image. Try a clearer shot of the sign or placard.");
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
            <p className="absolute bottom-24 left-0 right-0 text-center text-white/70 text-xs px-8">
              Point at a restaurant sign, storefront, or health inspection placard
            </p>
          </>
        )}

        {phase === "preview" && capturedImage && (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        )}

        {phase === "analyzing" && (
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400" />
            <p className="font-semibold text-lg">Analyzing image…</p>
            <p className="text-sm text-white/60">Reading restaurant info with AI vision</p>
          </div>
        )}

        {phase === "done" && extracted && (
          <div className="flex flex-col items-center gap-4 px-8 text-white w-full max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-center">{extracted.name}</h2>
            {extracted.address && <p className="text-sm text-white/70 text-center">{extracted.address}{extracted.city ? `, ${extracted.city}` : ""}</p>}
            {(extracted.inspection_grade || extracted.inspection_score != null) && (
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3">
                {extracted.inspection_grade && (
                  <div className="text-center">
                    <p className="text-xs text-white/60">Grade</p>
                    <p className="text-3xl font-extrabold text-emerald-400">{extracted.inspection_grade}</p>
                  </div>
                )}
                {extracted.inspection_score != null && (
                  <div className="text-center">
                    <p className="text-xs text-white/60">Score</p>
                    <p className="text-3xl font-extrabold text-emerald-400">{extracted.inspection_score}</p>
                  </div>
                )}
              </div>
            )}
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
            <Button onClick={doSearch} className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2 px-6">
              <Search className="w-4 h-4" /> Search This Restaurant
            </Button>
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