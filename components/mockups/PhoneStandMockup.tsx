import { LogoPlaque } from "./LogoPlaque";
import { TextureOverlay } from "./TextureOverlay";

export function PhoneStandMockup({ logoSrc }: { logoSrc: string | null }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <defs>
        <linearGradient id="phone-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7a4c26" />
          <stop offset="45%" stopColor="#5f3a1d" />
          <stop offset="100%" stopColor="#3f2612" />
        </linearGradient>
        <linearGradient id="phone-wood-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5c30" />
          <stop offset="100%" stopColor="#6b4423" />
        </linearGradient>
        <linearGradient id="phone-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a4552" />
          <stop offset="45%" stopColor="#171d24" />
          <stop offset="100%" stopColor="#05070a" />
        </linearGradient>
        <filter id="phone-soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* ombre au sol */}
      <ellipse cx="205" cy="256" rx="128" ry="13" fill="#1c1208" opacity="0.28" filter="url(#phone-soft-shadow)" />

      {/* socle en bois massif, vu en perspective légère */}
      <path d="M96 232 L304 232 L292 250 L108 250 Z" fill="url(#phone-wood-edge)" />
      <path d="M96 218 L304 218 L304 232 L96 232 Z" fill="url(#phone-wood)" />
      <TextureOverlay
        id="phone-base"
        x={96}
        y={218}
        width={208}
        height={14}
        baseFrequency="0.01 0.4"
        seed={4}
        color="#1a0f06"
        opacity={0.4}
        blend="overlay"
      />
      <path d="M96 218 L304 218 L296 213 L104 213 Z" fill="#8f6234" opacity="0.6" />

      {/* dossier incliné en bois avec veinage */}
      <g transform="rotate(-5 200 148)">
        <rect x="152" y="66" width="98" height="156" rx="16" fill="url(#phone-wood)" />
        <TextureOverlay
          id="phone-back"
          x={152}
          y={66}
          width={98}
          height={156}
          rx={16}
          baseFrequency="0.012 0.5"
          numOctaves={3}
          seed={11}
          color="#1a0f06"
          opacity={0.45}
          blend="overlay"
        />
        <rect x="152" y="66" width="98" height="156" rx="16" fill="none" stroke="#2c1a0c" strokeOpacity="0.5" strokeWidth="1.5" />
        {/* chant lumineux gauche */}
        <path d="M156 70 q-4 74 0 148" fill="none" stroke="#c99a5f" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />

        {/* fente pour le téléphone, creusée */}
        <rect x="166" y="192" width="68" height="9" rx="4.5" fill="#0f0904" opacity="0.75" />
        <rect x="166" y="192" width="68" height="3" rx="1.5" fill="#000000" opacity="0.5" />

        <LogoPlaque
          id="phone-stand"
          x={171}
          y={76}
          width={58}
          height={54}
          rx={10}
          logoSrc={logoSrc}
          effect="print"
        />
      </g>

      {/* téléphone posé dans la fente, verre + reflet */}
      <g transform="rotate(-5 200 148) translate(0 2)">
        <rect x="171" y="146" width="58" height="76" rx="11" fill="#0b0f16" />
        <rect x="174" y="149" width="52" height="70" rx="8" fill="url(#phone-screen)" />
        <path d="M178 152 L196 152 L184 213 L178 213 Z" fill="#ffffff" opacity="0.06" />
        <rect x="171" y="146" width="58" height="76" rx="11" fill="none" stroke="#000000" strokeOpacity="0.4" strokeWidth="1" />
      </g>
    </svg>
  );
}
