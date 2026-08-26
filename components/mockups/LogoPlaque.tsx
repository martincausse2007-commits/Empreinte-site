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

  return (
    <g>
      <clipPath id={clipId}>{clipShape}</clipPath>
      <g
        clipPath={`url(#${clipId})`}
        style={
          effect === "engrave"
            ? {
                filter: "grayscale(1) contrast(1.35) brightness(0.8)",
                mixBlendMode: "multiply",
              }
            : undefined
        }
      >
        <rect
          x={x - padding}
          y={y - padding}
          width={width + padding * 2}
          height={height + padding * 2}
          fill={effect === "engrave" ? "#e7e0d4" : "white"}
          opacity={effect === "engrave" ? 1 : 0}
        />
        <image
          href={logoSrc}
          x={x + padding}
          y={y + padding}
          width={width - padding * 2}
          height={height - padding * 2}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </g>
  );
}
