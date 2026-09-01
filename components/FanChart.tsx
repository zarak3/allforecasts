export default function FanChart({
  todayLabel,
  releaseLabel,
}: {
  todayLabel: string;
  releaseLabel: string;
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 pt-2 pb-10">
      <svg viewBox="0 0 880 260" width="100%" role="img" aria-labelledby="fanchartTitle">
        <title id="fanchartTitle">
          Forecast fan chart: history widening into a probability cone toward the next release date
        </title>
        <defs>
          <linearGradient id="cone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <line x1="0" y1="60" x2="880" y2="60" stroke="#ddd4bd" strokeWidth="1" />
        <line x1="0" y1="130" x2="880" y2="130" stroke="#ddd4bd" strokeWidth="1" />
        <line x1="0" y1="200" x2="880" y2="200" stroke="#ddd4bd" strokeWidth="1" />

        <path
          d="M 0 150 C 80 140, 140 160, 210 145 C 280 130, 330 155, 420 120"
          fill="none"
          stroke="#1a1a17"
          strokeWidth="2.5"
        />

        <path
          d="M 420 120 C 500 100, 600 95, 700 90 L 700 155 C 600 150, 500 148, 420 120 Z"
          fill="url(#cone)"
          stroke="none"
        />

        <path
          d="M 420 120 C 500 112, 600 108, 700 122"
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="2"
          strokeDasharray="6 5"
        />

        <circle cx="420" cy="120" r="4.5" fill="#1a1a17" />
        <line x1="420" y1="0" x2="420" y2="260" stroke="#1a1a17" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
        <line x1="700" y1="0" x2="700" y2="260" stroke="#9c4221" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
      </svg>
      <div className="font-mono text-xs text-ink-soft flex justify-between mt-2">
        <span>History</span>
        <span>Today — {todayLabel}</span>
        <span className="text-warn">Release — {releaseLabel}</span>
      </div>
    </div>
  );
}
