import * as THREE from "three";

export const LABEL_WIDTH = 420;
export const LABEL_HEIGHT = 620;

/**
 * Dessine une étiquette de bouteille (logo + hiérarchie de texte type
 * étiquette de vin) sur un canvas existant. Le chargement du logo étant
 * asynchrone, `onDone` est appelé une fois le rendu terminé.
 */
export function paintWineLabel(
  canvas: HTMLCanvasElement,
  logoSrc: string | null,
  onDone: () => void,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  const drawText = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // liseré fin
    ctx.strokeStyle = "#d9d2c0";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // titre
    ctx.fillStyle = "#232018";
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.round(w * 0.088)}px Georgia, 'Times New Roman', serif`;
    ctx.fillText("CUVÉE DE LA MAISON", w / 2, h * 0.62);

    // sous-titre
    ctx.fillStyle = "#6b6350";
    ctx.font = `600 ${Math.round(w * 0.038)}px Georgia, serif`;
    ctx.save();
    ctx.textBaseline = "alphabetic";
    const letterSpaced = (text: string, y: number, spacing: number) => {
      const totalWidth = [...text].reduce((acc, ch) => acc + ctx.measureText(ch).width + spacing, -spacing);
      let x = w / 2 - totalWidth / 2;
      for (const ch of text) {
        ctx.fillText(ch, x + ctx.measureText(ch).width / 2, y);
        x += ctx.measureText(ch).width + spacing;
      }
    };
    letterSpaced("ÉDITION PERSONNALISÉE", h * 0.685, 3);
    ctx.restore();

    // ligne de séparation
    ctx.strokeStyle = "#caa14d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.735);
    ctx.lineTo(w * 0.72, h * 0.735);
    ctx.stroke();

    // mentions bas d'étiquette
    ctx.fillStyle = "#6b6350";
    ctx.font = `${Math.round(w * 0.034)}px Georgia, serif`;
    ctx.fillText("Mise en bouteille pour votre établissement", w / 2, h * 0.85);
    ctx.fillText("750 ml", w / 2, h * 0.885);

    // sceau décoratif
    ctx.strokeStyle = "#caa14d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.95, w * 0.045, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#caa14d";
    ctx.font = `${Math.round(w * 0.04)}px Georgia, serif`;
    ctx.fillText("★", w / 2, h * 0.962);
  };

  const drawLogo = (img: HTMLImageElement | null) => {
    drawText();
    const boxSize = w * 0.4;
    const boxX = w / 2 - boxSize / 2;
    const boxY = h * 0.1;
    if (img) {
      const scale = Math.min(boxSize / img.width, boxSize / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.drawImage(img, w / 2 - iw / 2, boxY + boxSize / 2 - ih / 2, iw, ih);
    } else {
      ctx.strokeStyle = "#d9d2c0";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(boxX, boxY, boxSize, boxSize);
      ctx.setLineDash([]);
      ctx.fillStyle = "#b8ad94";
      ctx.font = `${Math.round(w * 0.045)}px Georgia, serif`;
      ctx.fillText("Logo", w / 2, boxY + boxSize / 2 + w * 0.015);
    }
  };

  if (!logoSrc) {
    drawLogo(null);
    onDone();
    return;
  }

  const img = new Image();
  img.onload = () => {
    drawLogo(img);
    onDone();
  };
  img.src = logoSrc;
}

export function createLabelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
