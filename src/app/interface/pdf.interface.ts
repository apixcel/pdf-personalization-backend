export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export interface IPdfFormPosition {
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotate?: number;
  type?: "text" | "image";
  src?: string;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: "normal" | "italic";
  fontKey?: string;
  fontSize?: number;
  color?: string | [number, number, number];
}
