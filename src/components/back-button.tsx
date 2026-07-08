"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-gold transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 12L6 8L10 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
