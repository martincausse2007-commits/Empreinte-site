import { LogoPlaque } from "./LogoPlaque";
import { TextureOverlay } from "./TextureOverlay";

export function PlacematMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="mat-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a5a34" />
          <stop offset="50%" stopColor="#6b4324" />
          <stop offset="100%" stopColor="#4a2c16" />
        </linearGradient>
        <radialGradient id="mat-light" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="mat-soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* ombre au sol */}
      <rect x="52" y="266" width="296" height="14" rx="7" fill="#1c1208" opacity="0.22" filter="url(#mat-soft-shadow)" />

      {/* set de table rigide */}
      <rect x="40" y="28" width="320" height="240" rx="14" fill="url(#mat-wood)" />
      <TextureOverlay
        id="mat-grain"
        x={40}
        y={28}
        width={320}
        height={240}
        rx={14}
        baseFrequency="0.012 0.3"
        numOctaves={3}
        seed={9}
        color="#180d05"
        opacity={0.5}
        blend="overlay"
      />
      <rect x="40" y="28" width="320" height="240" rx="14" fill="url(#mat-light)" />
      <rect
        x="41"
        y="29"
        width="318"
        height="238"
        rx="13"
        fill="none"
        stroke="#2a1608"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      {/* biseau du bord, chant plus clair */}
      <rect x="40" y="28" width="320" height="4" rx="2" fill="#c99a5f" opacity="0.3" />

      {/* logo gravé au centre */}
      <LogoPlaque
        id="placemat"
        x={140}
        y={88}
        width={120}
        height={120}
        logoSrc={logoSrc}
        effect="engrave"
        padding={10}
      />

      {/* liseré de bordure gravé */}
      <rect
        x="58"
        y="46"
        width="284"
        height="204"
        rx="8"
        fill="none"
        stroke="#241206"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        strokeDasharray="1 5"
        strokeLinecap="round"
      />
    </svg>
  );
}
