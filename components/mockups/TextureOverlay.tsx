type Props = {
  /** Unique id prefix (must be unique across all mockups on the page). */
  id: string;
  /** Shape to texture — reuse the exact geometry of the surface underneath. */
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  baseFrequency: string;
  numOctaves?: number;
  seed?: number;
  color?: string;
  opacity?: number;
  blend?: "multiply" | "overlay" | "soft-light" | "screen";
};

/**
 * Procedural material grain (wood, brushed metal, paper fibre…) masked to the
 * silhouette of the surface it sits on, via feComposite "in" against the
 * shape's own alpha — this keeps the grain inside rounded corners without a
 * separate clipPath.
 */
export function TextureOverlay({
  id,
  x,
  y,
  width,
  height,
  rx = 0,
  baseFrequency,
  numOctaves = 2,
  seed = 5,
  color = "#000000",
  opacity = 0.35,
  blend = "overlay",
}: Props) {
  const filterId = `${id}-grain`;
  return (
    <>
      <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency={baseFrequency}
          numOctaves={numOctaves}
          seed={seed}
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 0"
          result="grain"
        />
        <feComposite in="grain" in2="SourceGraphic" operator="in" />
      </filter>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={rx}
        fill={color}
        filter={`url(#${filterId})`}
        opacity={opacity}
        style={{ mixBlendMode: blend }}
      />
    </>
  );
}
