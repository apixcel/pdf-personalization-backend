import path from "path";
import fs from "fs";
import { PDFDocument, PDFFont, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type FontMap = Record<string, PDFFont>;

export interface FontFamily {
  weights: Partial<Record<`${number}-${"normal" | "italic"}`, string>>;
  defaultKey: string;
}

export interface FontRegistry {
  fonts: FontMap;
  families: Record<string, FontFamily>;
}

export async function buildFontRegistry(pdfDoc: PDFDocument): Promise<FontRegistry> {
  // IMPORTANT: register fontkit on THIS pdfDoc (don’t create another PDFDocument)
  pdfDoc.registerFontkit(fontkit);

  const fonts: FontMap = {};

  // --- Standard fonts (don’t need fontkit, but fine to mix)
  fonts["Helvetica"] = await pdfDoc.embedFont(StandardFonts.Helvetica);
  fonts["Helvetica-Bold"] = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  fonts["Helvetica-Oblique"] = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  fonts["Helvetica-BoldOblique"] = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  fonts["TimesRoman"] = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  fonts["TimesRoman-Bold"] = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  fonts["TimesRoman-Italic"] = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  fonts["TimesRoman-BoldItalic"] = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  // --- Custom fonts (need fontkit)
  const addCustom = async (key: string, fileRelPath: string) => {
    const abs = path.join(__dirname, "../templates/fonts", fileRelPath);
    if (!fs.existsSync(abs)) {
      return;
    }
    const ttfBytes = fs.readFileSync(abs);
    fonts[key] = await pdfDoc.embedFont(ttfBytes);
  };

  // Example: GreatVibes Regular (script font typically ships only as Regular)
  await addCustom("BLKCHCRY", "BLKCHCRY.TTF");
  await addCustom("BradleyHand-Bold", "bradley-hand-itc-tt-bold.ttf");

  const families: Record<string, FontFamily> = {
    Helvetica: {
      defaultKey: "Helvetica",
      weights: {
        "400-normal": "Helvetica",
        "700-normal": "Helvetica-Bold",
        "400-italic": "Helvetica-Oblique",
        "700-italic": "Helvetica-BoldOblique",
      },
    },
    TimesRoman: {
      defaultKey: "TimesRoman",
      weights: {
        "400-normal": "TimesRoman",
        "700-normal": "TimesRoman-Bold",
        "400-italic": "TimesRoman-Italic",
        "700-italic": "TimesRoman-BoldItalic",
      },
    },
    BLKCHCRY: {
      defaultKey: "BLKCHCRY",
      weights: {
        "400-normal": "BLKCHCRY",
        "700-normal": "BLKCHCRY",
        "400-italic": "BLKCHCRY",
        "700-italic": "BLKCHCRY",
      },
    },
  };

  return { fonts, families };
}
