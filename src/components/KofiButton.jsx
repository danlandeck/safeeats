import React from "react";
import { Heart } from "lucide-react";

export default function KofiButton({ context = "default" }) {
  const messages = {
    default: "Support SafeEats",
    bad_score: "Saved you from a bad meal? Buy me a coffee!",
    footer: "Support SafeEats ☕",
  };

  return (
    <a
      href="https://ko-fi.com/danlandeck"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5E5B] hover:bg-[#e04e4b] text-white text-sm font-bold shadow-sm transition-all hover:shadow-md"
    >
      <Heart className="w-4 h-4 fill-white" />
      {messages[context] || messages.default}
    </a>
  );
}