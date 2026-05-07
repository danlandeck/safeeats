import React from "react";

// WCAG 2.4.1 — Skip Navigation
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-3 focus:bg-[#4CAF50] focus:text-white focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none"
    >
      Skip to main content
    </a>
  );
}