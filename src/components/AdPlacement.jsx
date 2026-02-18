import React, { useEffect } from "react";

export default function AdPlacement({ slot, format = "auto", responsive = true, style = {} }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle && process.env.NODE_ENV === "production") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  // Show placeholder in development
  if (process.env.NODE_ENV !== "production") {
    return (
      <div
        className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-500 text-sm"
        style={{ minHeight: "100px", ...style }}
      >
        <div className="text-center p-4">
          <p className="font-medium">Ad Placement</p>
          <p className="text-xs mt-1">Slot: {slot}</p>
          <p className="text-xs text-slate-400 mt-2">
            Ads appear in production mode
          </p>
        </div>
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", ...style }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your AdSense publisher ID
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive.toString()}
    />
  );
}