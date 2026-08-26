import { LogoPlaque } from "./LogoPlaque";

export function PlacematMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="mat-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b98a53" />
          <stop offset="100%" stopColor="#8f6538" />
        </linearGradient>
      </defs>

      {/* set de table rigide */}
      <rect x="40" y="30" width="320" height="240" rx="18" fill="url(#mat-wood)" />
      <rect
        x="40"
        y="30"
        width="320"
        height="240"
        rx="18"
        fill="none"
        stroke="#6f4c26"
        strokeWidth="2"
        opacity="0.5"
      />

      {/* veines de bois discrètes */}
      {[70, 110, 150, 190, 230].map((y) => (
        <path
          key={y}
          d={`M55 ${y} Q200 ${y - 10} 345 ${y}`}
          fill="none"
          stroke="#7a5730"
          strokeOpacity="0.18"
          strokeWidth="1.5"
        />
      ))}

      {/* logo gravé au centre */}
      <LogoPlaque
        id="placemat"
        x={140}
        y={90}
        width={120}
        height={120}
        logoSrc={logoSrc}
        effect="engrave"
        padding={10}
      />

      {/* liseré de bordure gravé */}
      <rect
        x="58"
        y="48"
        width="284"
        height="204"
        rx="10"
        fill="none"
        stroke="#5c3f22"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeDasharray="2 6"
      />
    </svg>
  );
}
