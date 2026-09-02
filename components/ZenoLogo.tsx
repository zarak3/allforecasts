// A "Z" with a horizontal strike through the middle, like a mathematical
// zed -- simple, geometric, and distinct from the site's own wordmark.
export default function ZenoLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Zeno"
    >
      <path
        d="M5.5 6H18.5L5.5 18H18.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
