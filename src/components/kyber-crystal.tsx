"use client";

import { useId } from "react";

export function KyberCrystal({ color, tier, size = "md" }: { color: string; tier: string; size?: "sm" | "md" }) {
  const id = useId().replace(/:/g, "");
  const sizeClass = size === "sm" ? "h-4 w-2.5" : "h-8 w-5";
  const glowSize = size === "sm" ? { min: 1, max: 4 } : { min: 2, max: 8 };

  return (
    <>
      <style>{`
        @keyframes kyber-${id} {
          0%, 100% { filter: drop-shadow(0 0 ${glowSize.min}px ${color}); }
          50% { filter: drop-shadow(0 0 ${glowSize.max}px ${color}); }
        }
      `}</style>
      <svg
        viewBox="0 0 20 32"
        className={sizeClass}
        aria-label={tier}
        style={{ animation: `kyber-${id} 3s ease-in-out infinite` }}
      >
        <path
          d="M10 0L17 8V20L10 32L3 20V8L10 0Z"
          fill={color}
          opacity="0.9"
        />
        <path
          d="M10 0L17 8V20L10 32V16L14 10V9L10 3V0Z"
          fill="white"
          opacity="0.15"
        />
        <path
          d="M10 0L17 8V20L10 32L3 20V8L10 0Z"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          opacity="0.3"
        />
      </svg>
    </>
  );
}
