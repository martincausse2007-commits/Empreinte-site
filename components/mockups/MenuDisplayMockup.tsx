import { LogoPlaque } from "./LogoPlaque";
import { TextureOverlay } from "./TextureOverlay";

export function MenuDisplayMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="menu-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f3f5" />
          <stop offset="45%" stopColor="#c7cad0" />
          <stop offset="55%" stopColor="#aeb2b9" />
          <stop offset="100%" stopColor="#8a8e96" />
        </linearGradient>
        <linearGradient id="menu-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="100%" stopColor="#f1ebdd" />
        </linearGradient>
        <linearGradient id="menu-header" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4efe3" />
          <stop offset="100%" stopColor="#e6dfcc" />
        </linearGradient>
        <filter id="menu-soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* ombre portée du panneau */}
      <rect x="76" y="52" width="260" height="222" rx="6" fill="#000000" opacity="0.16" filter="url(#menu-soft-shadow)" />

      {/* barre magnétique en aluminium brossé */}
      <rect x="88" y="24" width="224" height="16" rx="8" fill="url(#menu-metal)" />
      <TextureOverlay
        id="menu-bar-brush"
        x={88}
        y={24}
        width={224}
        height={16}
        rx={8}
        baseFrequency="0.9 0.01"
        numOctaves={2}
        seed={2}
        color="#ffffff"
        opacity={0.35}
        blend="soft-light"
      />
      <rect x="88" y="24" width="224" height="5" rx="2.5" fill="#ffffff" opacity="0.5" />
      <circle cx="106" cy="32" r="3" fill="#6d7178" />
      <circle cx="294" cy="32" r="3" fill="#6d7178" />

      {/* panneau acrylique */}
      <rect x="70" y="46" width="260" height="220" rx="8" fill="url(#menu-paper)" stroke="#d8d2c0" strokeWidth="1.5" />
      <TextureOverlay
        id="menu-paper-fibre"
        x={70}
        y={46}
        width={260}
        height={220}
        rx={8}
        baseFrequency="0.5 0.5"
        numOctaves={2}
        seed={14}
        color="#5c5140"
        opacity={0.05}
        blend="multiply"
      />
      {/* reflet acrylique diagonal */}
      <path d="M78 50 L110 50 L84 262 L74 262 Z" fill="#ffffff" opacity="0.18" />

      {/* bandeau en-tête avec logo */}
      <rect x="70" y="46" width="260" height="72" fill="url(#menu-header)" />
      <rect x="70" y="115" width="260" height="3" fill="#00000010" />
      <LogoPlaque
        id="menu-display"
        x={150}
        y={54}
        width={100}
        height={54}
        rx={8}
        logoSrc={logoSrc}
        effect="print"
      />

      {/* titre */}
      <text
        x="200"
        y="146"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="17"
        letterSpacing="2.5"
        fill="#332c20"
      >
        MENU DU JOUR
      </text>

      {/* lignes de plats */}
      {[172, 196, 220, 244].map((y, i) => (
        <g key={y}>
          <line x1="94" y1={y} x2={i % 2 === 0 ? 302 : 274} y2={y} stroke="#c9c2b0" strokeWidth="1.5" />
          <line x1="288" y1={y - 4} x2="306" y2={y - 4} stroke="#c9c2b0" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}
