import { LogoPlaque } from "./LogoPlaque";

export function PhoneStandMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="stand-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a06a" />
          <stop offset="100%" stopColor="#9c7642" />
        </linearGradient>
        <linearGradient id="stand-shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* table + ombre */}
      <ellipse cx="200" cy="252" rx="150" ry="14" fill="url(#stand-shadow)" />

      {/* socle */}
      <rect x="120" y="222" width="160" height="20" rx="6" fill="url(#stand-wood)" />
      <rect x="120" y="222" width="160" height="6" rx="3" fill="#d8b481" opacity="0.6" />

      {/* dossier incliné */}
      <g transform="rotate(-6 200 150)">
        <rect x="150" y="70" width="100" height="160" rx="14" fill="url(#stand-wood)" />
        {/* fente pour le téléphone */}
        <rect x="164" y="198" width="72" height="8" rx="4" fill="#5f4526" opacity="0.5" />
        <LogoPlaque
          id="phone-stand"
          x={168}
          y={96}
          width={64}
          height={64}
          rx={10}
          logoSrc={logoSrc}
          effect="print"
        />
      </g>

      {/* téléphone posé dans la fente */}
      <g transform="rotate(-6 200 150) translate(0 4)">
        <rect
          x="172"
          y="120"
          width="56"
          height="100"
          rx="10"
          fill="#1f2937"
          stroke="#0b0f16"
          strokeWidth="2"
        />
        <rect x="178" y="128" width="44" height="82" rx="4" fill="#3b4657" />
      </g>
    </svg>
  );
}
