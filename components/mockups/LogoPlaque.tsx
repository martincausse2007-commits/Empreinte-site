type Props = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  shape?: "rect" | "circle";
  logoSrc: string | null;
  effect?: "print" | "engrave";
  padding?: number;
};

/**
 * Zone d'application du logo, réutilisée dans chaque mockup produit.
 * `effect="engrave"` simule une gravure (niveaux de gris + fusion "multiply")
 * plutôt qu'une impression couleur pleine (`effect="print"`).
 */
export function LogoPlaque({
  id,
  x,
  y,
  width,
  height,
  rx = 10,
  shape = "rect",
  logoSrc,
  effect = "print",
  padding = 8,
}: Props) {
  const clipId = `${id}-clip`;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const r = Math.min(width, height) / 2;

  const clipShape =
    shape === "circle" ? (
      <circle cx={cx} cy={cy} r={r} />
    ) : (
      <rect x={x} y={y} width={width} height={height} rx={rx} />
    );

  if (!logoSrc) {
    return (
      <g className="text-stone-300">
        {shape === "circle" ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 5"
            strokeWidth={1.5}
          />
        ) : (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={rx}
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 5"
            strokeWidth={1.5}
          />
        )}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          className="fill-stone-400"
        >
          Logo
        </text>
      </g>
    );
  }

  const ix = x + padding;
  const iy = y + padding;
  const iw = width - padding * 2;
  const ih = height - padding * 2;

  return (
    <g>
      <clipPath id={clipId}>{clipShape}</clipPath>
      <g clipPath={`url(#${clipId})`}>
        {effect === "engrave" ? (
          <>
            {/* creux gravé : ombre portée décalée */}
            <image
              href={logoSrc}
              x={ix + 1}
              y={iy + 1.4}
              width={iw}
              height={ih}
              preserveAspectRatio="xMidYMid meet"
              style={{ filter: "grayscale(1) brightness(0) blur(0.3px)", opacity: 0.55 }}
            />
            {/* corps de la gravure, assombri et fondu dans la matière */}
            <image
              href={logoSrc}
              x={ix}
              y={iy}
              width={iw}
              height={ih}
              preserveAspectRatio="xMidYMid meet"
              style={{
                filter: "grayscale(1) contrast(1.5) brightness(0.35)",
                mixBlendMode: "multiply",
                opacity: 0.92,
              }}
            />
            {/* liseré clair : arête relevée par la gravure laser */}
            <image
              href={logoSrc}
              x={ix - 0.8}
              y={iy - 0.8}
              width={iw}
              height={ih}
              preserveAspectRatio="xMidYMid meet"
              style={{
                filter: "grayscale(1) brightness(4)",
                mixBlendMode: "screen",
                opacity: 0.3,
              }}
            />
          </>
        ) : (
          <image
            href={logoSrc}
            x={ix}
            y={iy}
            width={iw}
            height={ih}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </g>
    </g>
  );
}
