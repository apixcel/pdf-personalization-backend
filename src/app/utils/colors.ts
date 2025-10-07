import { rgb } from "pdf-lib";

export function toRgbColor(input?: string | [number, number, number]) {
  if (!input) {
    return rgb(0, 0, 0);
  }

  if (Array.isArray(input) && input.length === 3) {
    const [r, g, b] = input;
    return rgb(clamp01(r), clamp01(g), clamp01(b));
  }

  if (typeof input === "string" && input.startsWith("#")) {
    const hex = input.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.padEnd(6, "0");

    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }

  return rgb(0, 0, 0);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
