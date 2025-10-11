import sharp from "sharp";

export interface CompressOptions {
  maxWidth?: number; // may be float; we'll sanitize
  maxHeight?: number; // may be float; we'll sanitize
  quality?: number; // 1-100
  forceFormat?: "jpeg" | "png" | null;
}

function normDim(n?: number): number | undefined {
  if (n == null) {
    return undefined;
  }
  if (!Number.isFinite(n) || n <= 0) {
    return undefined;
  }
  return Math.max(1, Math.round(n));
}

export async function compressImage(
  input: ArrayBuffer | Uint8Array,
  opts: CompressOptions = {}
): Promise<{
  bytes: Uint8Array;
  isPng: boolean;
  isJpg: boolean;
  width?: number;
  height?: number;
}> {
  if (input == null) {
    throw new TypeError("compressImage: input is null/undefined");
  }

  const { maxWidth: rawW = 1024, maxHeight: rawH = 1024, quality = 80, forceFormat = null } = opts;

  const maxWidth = normDim(rawW);
  const maxHeight = normDim(rawH);

  const buf = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input);
  let img = sharp(buf, { failOn: "none" });
  const meta = await img.metadata();

  const canResize = maxWidth != null || maxHeight != null;
  const needsResize =
    canResize &&
    ((maxWidth != null && (meta.width ?? 0) > maxWidth) ||
      (maxHeight != null && (meta.height ?? 0) > maxHeight));

  if (needsResize) {
    img = img.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const srcFmt = (meta.format || "").toLowerCase();
  const chosenFmt = forceFormat ?? (srcFmt === "png" ? "png" : "jpeg");

  let out: Buffer;
  if (chosenFmt === "png") {
    out = await img.png({ compressionLevel: 9, quality }).toBuffer();
  } else {
    out = await img.jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  const dim = await sharp(out).metadata();

  return {
    bytes: new Uint8Array(out),
    isPng: chosenFmt === "png",
    isJpg: chosenFmt === "jpeg",
    width: dim.width,
    height: dim.height,
  };
}
