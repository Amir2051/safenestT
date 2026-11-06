import React from "react";

/** Compact, scalable SafeNestT shield mark for authenticated workspace surfaces. */
export default function SafeNestTMark({ className = "h-10 w-10", title = "SafeNestT" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="safenestt-mark-gradient" x1="10" y1="7" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67E8F9" />
          <stop offset="0.55" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <path d="M32 4.5 54 13v17.2c0 13.2-8.4 23.6-22 30.3C16.4 53.8 8 43.4 8 30.2V13L32 4.5Z" fill="#07131F" stroke="url(#safenestt-mark-gradient)" strokeWidth="2.6" />
      <path d="M20.5 43V21l23 22V21" stroke="url(#safenestt-mark-gradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 21h23" stroke="#BAF6FF" strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="49.5" cy="14.5" r="2.5" fill="#A5F3FC" />
    </svg>
  );
}
