import { LogoPlaque } from "./LogoPlaque";

export function WineHolderMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="wine-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a7c4e" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#2f5a34" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="wine-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a06a" />
          <stop offset="100%" stopColor="#96703f" />
        </linearGradient>
      </defs>

      {/* ombre au sol */}
      <ellipse cx="200" cy="262" rx="120" ry="12" fill="#000000" opacity="0.1" />

      {/* bouteille inclinée */}
      <g transform="rotate(28 200 150)">
        <rect x="188" y="40" width="24" height="20" fill="url(#wine-glass)" />
        <path
          d="M186 60 h28 v18 c22 10 26 30 26 46 v96 a10 10 0 0 1 -10 10 h-60 a10 10 0 0 1 -10 -10 v-96 c0 -16 4 -36 26 -46 z"
          fill="url(#wine-glass)"
        />
        <rect x="182" y="38" width="36" height="10" rx="3" fill="#7c2f3c" />
      </g>

      {/* support / berceau en bois */}
      <path
        d="M110 214 q90 -46 180 0 l-14 22 q-76 -38 -152 0 z"
        fill="url(#wine-wood)"
        stroke="#6f4c26"
        strokeWidth="1.5"
      />
      <rect x="150" y="230" width="100" height="16" rx="6" fill="url(#wine-wood)" />

      {/* médaillon logo sur le berceau */}
      <circle cx="200" cy="216" r="30" fill="#f6efe1" stroke="#6f4c26" strokeWidth="2" />
      <LogoPlaque
        id="wine-holder"
        x={176}
        y={192}
        width={48}
        height={48}
        shape="circle"
        logoSrc={logoSrc}
        effect="print"
        padding={6}
      />
    </svg>
  );
}
