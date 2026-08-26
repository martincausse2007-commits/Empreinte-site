import { LogoPlaque } from "./LogoPlaque";

export function MenuDisplayMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="menu-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7e9ec" />
          <stop offset="100%" stopColor="#b9bec6" />
        </linearGradient>
      </defs>

      {/* barre magnétique */}
      <rect x="90" y="26" width="220" height="14" rx="7" fill="url(#menu-metal)" />
      <circle cx="106" cy="33" r="3.2" fill="#8b929c" />
      <circle cx="294" cy="33" r="3.2" fill="#8b929c" />

      {/* panneau acrylique */}
      <rect
        x="70"
        y="46"
        width="260"
        height="220"
        rx="10"
        fill="#fbfaf7"
        stroke="#d8d2c4"
        strokeWidth="2"
      />

      {/* bandeau en-tête avec logo */}
      <rect x="70" y="46" width="260" height="70" rx="10" fill="#f1ede3" />
      <rect x="70" y="106" width="260" height="10" fill="#f1ede3" />
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
        y="140"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="16"
        letterSpacing="2"
        fill="#3f3a30"
      >
        MENU DU JOUR
      </text>

      {/* lignes de plats */}
      {[168, 190, 212, 234].map((y, i) => (
        <g key={y}>
          <line x1="96" y1={y} x2={i % 2 === 0 ? 300 : 270} y2={y} stroke="#c9c2b0" strokeWidth="1.5" />
          <line x1="286" y1={y - 4} x2="304" y2={y - 4} stroke="#c9c2b0" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}
