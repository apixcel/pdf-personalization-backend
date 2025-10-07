import type { FontRegistry } from "./fontRegistry";
import type { FontWeight } from "../interface/pdf.interface";

function nearestWeight(requested?: number): 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 {
  const options = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  if (!requested) {
    return 400;
  }
  return options.reduce(
    (prev, curr) => (Math.abs(curr - requested) < Math.abs(prev - requested) ? curr : prev),
    400
  ) as FontWeight;
}

export function resolveFontKey(
  reg: FontRegistry,
  opts: {
    fontFamily?: string;
    fontWeight?: number;
    fontStyle?: "normal" | "italic";
    fontKey?: string;
  }
): string {
  if (opts.fontKey) {
    return opts.fontKey;
  }

  const family = opts.fontFamily && reg.families[opts.fontFamily];
  if (!family) {
    return "Helvetica";
  }

  const weight = nearestWeight(opts.fontWeight);
  const style = opts.fontStyle ?? "normal";
  const candidate =
    family.weights[`${weight}-${style}` as const] ||
    family.weights[`${weight}-normal` as const] ||
    family.weights[`400-${style}` as const] ||
    family.defaultKey;

  return candidate;
}
