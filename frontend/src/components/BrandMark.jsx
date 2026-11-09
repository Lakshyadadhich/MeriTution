import { useId } from "react";

export default function BrandMark({ className = "" }) {
  const gradientId = `brand-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d9488" />
          <stop offset="1" stopColor="#115e59" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradientId})`} />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="12"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="0.8"
      />
      <circle cx="32" cy="34" r="21" fill="#ffffff" fillOpacity="0.08" />
      <path d="M24 24.5h16l-1.6 8.2H25.6z" fill="#ccfbf1" />
      <path d="M32 13 49 20.5 32 28 15 20.5z" fill="#ffffff" />
      <path
        d="M47 21.5v8.8"
        stroke="#fbbf24"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="47" cy="31.8" r="1.7" fill="#fbbf24" />
      <path d="M13 37.2q9-3.4 18 .4v9.6q-9-3.8-18-.4z" fill="#f0fdfa" />
      <path d="M51 37.2q-9-3.4-18 .4v9.6q9-3.8 18-.4z" fill="#f0fdfa" />
      <path
        d="M32 37.6v9.6"
        stroke="#0f766e"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M17.5 40.4q4.8-1.3 9.5 0M17.5 43q4.8-1.3 9.5 0M46.5 40.4q-4.8-1.3-9.5 0M46.5 43q-4.8-1.3-9.5 0"
        stroke="#5eead4"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
