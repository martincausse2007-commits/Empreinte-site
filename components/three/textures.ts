import * as THREE from "three";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Génère une texture de grain de bois procédurale (aucun asset externe). */
export function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, "#6b4423");
    grad.addColorStop(0.5, "#8a5c30");
    grad.addColorStop(1, "#5a3820");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 110; i++) {
      const y = Math.random() * 512;
      ctx.globalAlpha = 0.12 + Math.random() * 0.18;
      ctx.strokeStyle = Math.random() > 0.5 ? "#3d2412" : "#a97a45";
      ctx.lineWidth = 0.5 + Math.random() * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 24) {
        ctx.lineTo(x, y + (Math.random() - 0.5) * 8);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Dessine un logo (ou un placeholder) sur une texture canvas existante,
 * de façon synchrone si `logoSrc` est déjà chargeable, sinon via callback.
 */
export function paintLogoOnCanvas(
  canvas: HTMLCanvasElement,
  logoSrc: string | null,
  shape: "label" | "medallion",
  onDone: () => void,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;

  const drawBase = () => {
    ctx.clearRect(0, 0, size, size);
    if (shape === "label") {
      ctx.fillStyle = "#f7f3e8";
      roundRect(ctx, size * 0.08, size * 0.08, size * 0.84, size * 0.84, size * 0.03);
      ctx.fill();
      ctx.strokeStyle = "#caa14d";
      ctx.lineWidth = size * 0.006;
      roundRect(ctx, size * 0.08, size * 0.08, size * 0.84, size * 0.84, size * 0.03);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#e9d9ab";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a6d2c";
      ctx.lineWidth = size * 0.02;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  if (!logoSrc) {
    drawBase();
    ctx.fillStyle = shape === "label" ? "#b8ad94" : "#8a7a4c";
    ctx.font = `${Math.round(size * 0.09)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Logo", size / 2, size / 2);
    onDone();
    return;
  }

  const img = new Image();
  img.onload = () => {
    drawBase();
    const pad = shape === "label" ? size * 0.22 : size * 0.16;
    const maxW = size - pad * 2;
    const maxH = size - pad * 2;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, size / 2 - w / 2, size / 2 - h / 2, w, h);
    onDone();
  };
  img.src = logoSrc;
}
