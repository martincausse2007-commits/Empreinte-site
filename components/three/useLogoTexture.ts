import { useEffect, useState } from "react";
import * as THREE from "three";
import { paintLogoOnCanvas } from "./textures";

function createTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Texture canvas (étiquette ou médaillon) qui se redessine quand le logo change. */
export function useLogoTexture(logoSrc: string | null, shape: "label" | "medallion") {
  const [texture] = useState(createTexture);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    paintLogoOnCanvas(canvas, logoSrc, shape, () => {
      texture.needsUpdate = true;
    });
  }, [texture, logoSrc, shape]);

  return texture;
}
