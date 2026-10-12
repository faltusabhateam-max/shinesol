"use client";
/** Resize + compress an image file client-side to a JPEG/WebP data URL that stays well under Firestore's 1 MB doc limit. */
export async function fileToDataUrl(file: File, maxSide = 1280, maxBytes = 650_000): Promise<{ dataUrl: string; ratio: number }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const bmp = await loadImage(file);
  let side = maxSide;
  let quality = 0.85;
  for (let i = 0; i < 8; i++) {
    const scale = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    const url = c.toDataURL("image/jpeg", quality);
    if (url.length * 0.75 < maxBytes || i === 7) return { dataUrl: url, ratio: w / h };
    if (quality > 0.6) quality -= 0.1; else side = Math.round(side * 0.8);
  }
  throw new Error("Image could not be compressed.");
}
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("This image could not be read."));
    img.src = URL.createObjectURL(file);
  });
}

/** Export a square crop (in source-pixel coordinates) as a compressed JPEG data URL. */
export function cropToDataUrl(img: HTMLImageElement, sx: number, sy: number, size: number, out = 320, quality = 0.82): string {
  const c = document.createElement("canvas");
  c.width = out; c.height = out;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, size, size, 0, 0, out, out);
  let q = quality, url = c.toDataURL("image/jpeg", q);
  while (url.length > 140_000 && q > 0.4) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
  return url;
}
export function loadImageFile(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Please choose an image file."));
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("This image could not be read."));
    img.src = URL.createObjectURL(file);
  });
}
