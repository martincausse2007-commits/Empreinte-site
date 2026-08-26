import { LogoPlaque } from "./LogoPlaque";
import { TextureOverlay } from "./TextureOverlay";

const BOTTLE_PATH =
  "M160 20 L240 20 Q250 20 250 32 L250 150 Q250 168 225 178 L210 190 L210 244 L190 244 L190 190 L175 178 Q150 168 150 150 L150 32 Q150 20 160 20 Z";

export function WineHolderMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="wine-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#050f09" />
          <stop offset="18%" stopColor="#0e2717" />
          <stop offset="42%" stopColor="#2e6a3d" />
          <stop offset="58%" stopColor="#1b4826" />
          <stop offset="100%" stopColor="#040d08" />
        </linearGradient>
        <linearGradient id="wine-foil" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5b4420" />
          <stop offset="30%" stopColor="#d9b869" />
          <stop offset="50%" stopColor="#f3dfa4" />
          <stop offset="70%" stopColor="#c79a4d" />
          <stop offset="100%" stopColor="#4a3418" />
        </linearGradient>
        <linearGradient id="wine-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5a34" />
          <stop offset="100%" stopColor="#4f2f18" />
        </linearGradient>
        <radialGradient id="wine-medallion" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f3dfa4" />
          <stop offset="55%" stopColor="#caa14d" />
          <stop offset="100%" stopColor="#8a6d2c" />
        </radialGradient>
        <filter id="wine-soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* ombre au sol */}
      <ellipse cx="205" cy="272" rx="110" ry="11" fill="#1c1208" opacity="0.3" filter="url(#wine-soft-shadow)" />

      {/* bouteille en équilibre sur le goulot, verre teinté */}
      <g transform="translate(25 -34) rotate(-30 200 244)">
        <path d={BOTTLE_PATH} fill="url(#wine-glass)" />
        {/* reflet spéculaire vertical */}
        <path d="M172 26 Q166 100 172 170 L180 168 Q176 96 182 28 Z" fill="#ffffff" opacity="0.16" />
        <path d="M226 40 Q222 100 226 150 L231 148 Q228 96 232 42 Z" fill="#ffffff" opacity="0.08" />
        {/* capsule dorée */}
        <path d="M150 32 Q150 20 160 20 L240 20 Q250 20 250 32 L250 62 L150 62 Z" fill="url(#wine-foil)" />
        <rect x="150" y="56" width="100" height="6" fill="#3a2a12" opacity="0.4" />
        {/* étiquette suggérée */}
        <rect x="158" y="96" width="84" height="46" rx="2" fill="#f7f4ea" opacity="0.9" />
        <rect x="166" y="108" width="68" height="2.5" fill="#8a6d2c" opacity="0.6" />
        <rect x="166" y="116" width="46" height="2" fill="#4a3418" opacity="0.4" />
        <rect x="166" y="122" width="52" height="2" fill="#4a3418" opacity="0.4" />
      </g>

      {/* socle en bois massif, la bouteille semble en lévitation */}
      <rect x="128" y="206" width="176" height="52" rx="22" fill="url(#wine-wood)" />
      <TextureOverlay
        id="wine-base-grain"
        x={128}
        y={206}
        width={176}
        height={52}
        rx={22}
        baseFrequency="0.012 0.35"
        numOctaves={3}
        seed={6}
        color="#1a0f06"
        opacity={0.42}
        blend="overlay"
      />
      <rect x="128" y="206" width="176" height="10" rx="5" fill="#c99a5f" opacity="0.25" />
      <rect x="129" y="207" width="174" height="50" rx="21" fill="none" stroke="#2a1608" strokeOpacity="0.5" strokeWidth="1.5" />

      {/* point d'insertion du goulot */}
      <ellipse cx="225" cy="210" rx="10" ry="3.4" fill="#0c0704" opacity="0.6" />

      {/* médaillon laiton avec le logo */}
      <circle cx="176" cy="232" r="25" fill="url(#wine-medallion)" />
      <circle cx="176" cy="232" r="25" fill="none" stroke="#5c4520" strokeOpacity="0.5" strokeWidth="1.5" />
      <LogoPlaque
        id="wine-holder"
        x={152}
        y={208}
        width={48}
        height={48}
        shape="circle"
        logoSrc={logoSrc}
        effect="print"
        padding={7}
      />
    </svg>
  );
}
