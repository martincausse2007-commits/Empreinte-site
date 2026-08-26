import { useEffect, useState } from "react";
import { createLabelTexture, paintWineLabel } from "./textures";

/** Texture canvas de l'étiquette, redessinée quand le logo change. */
export function useLabelTexture(logoSrc: string | null) {
  const [texture] = useState(createLabelTexture);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    paintWineLabel(canvas, logoSrc, () => {
      texture.needsUpdate = true;
    });
  }, [texture, logoSrc]);

  return texture;
}
