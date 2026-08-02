"use client";

/** Stylised brain — two lobes, a central fissure, drawn as one mirrored half. */
export function BrainIcon({ className = "" }: { className?: string }) {
  const half = (
    <>
      <path d="M12 5.4a2.7 2.7 0 0 0-5 1.05A2.5 2.5 0 0 0 4.8 9a2.5 2.5 0 0 0 .6 1.6 2.5 2.5 0 0 0-.3 3.2 2.7 2.7 0 0 0 2.6 3.4A2.6 2.6 0 0 0 12 18.5" />
      <path d="M9.4 9.3c.9-.2 1.8.2 2.2 1" />
      <path d="M8.2 13.7c1 .1 2-.4 2.4-1.3" />
    </>
  );
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {half}
      <g transform="translate(24,0) scale(-1,1)">{half}</g>
      <path d="M12 5.4v13.1" strokeWidth="1.3" opacity="0.55" />
    </svg>
  );
}
