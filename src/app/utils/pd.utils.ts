import { IPdfFormPosition } from "../interface/pdf.interface";

export const pdfPosition: Record<string, IPdfFormPosition[]> = {
  dob: [
    { page: 5, x: 453, y: 442 },
    { page: 5, x: 651, y: 431 },
    { page: 0, x: 670, y: 255 },
  ],
  firstName: [
    { page: 5, x: 290, y: 333 },
    { page: 4, x: 92, y: 101 },
    { page: 4, x: 79, y: 172 },
    { page: 4, x: 140, y: 220 },
    { page: 3, x: 400, y: 200 },
    { page: 1, x: 71, y: 329 },
    { page: 1, x: 71, y: 396 },
    { page: 1, x: 140, y: 506 },
    { page: 0, x: 198, y: 434 },
    { page: 0, x: 664, y: 301 },
    { page: 0, x: 606.66, y: 219.3 }, //
  ],
  lastName: [
    { page: 5, x: 345, y: 332 },
    { page: 4, x: 121, y: 171 },
    { page: 4, x: 181, y: 220 },
    { page: 3, x: 400, y: 150 },
    { page: 0, x: 250, y: 434 },
    { page: 0, x: 592, y: 230 },
  ],
  photo: [
    {
      page: 0,
      x: 556.66,
      y: 566.66,
      type: "image",
      width: 230,
      height: 226.66,
    },
  ],
  age: [
    { page: 3, x: 410, y: 450 },
    { page: 3, x: 690, y: 314 },
    { page: 2, x: 160, y: 470 },
    { page: 2, x: 693, y: 480 },
    { page: 1, x: 602, y: 490 },
    { page: 1, x: 324, y: 250 },
    { page: 1, x: 340, y: 152 },
    { page: 0, x: 140, y: 449.33 },
    { page: 0, x: 590, y: 246 },
  ],
};
export function generatePdfFileName(data: { firstName: string; lastName: string }) {
  const safeFirst = data.firstName.replace(/\s+/g, "_");
  const safeLast = data.lastName.replace(/\s+/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  return `${safeFirst}_${safeLast}_${dateStr}.pdf`;
}
