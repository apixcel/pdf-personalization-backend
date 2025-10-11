import fs from "fs";
import path from "path";
import { degrees, PDFDocument } from "pdf-lib";
import QueryBuilder from "../builder/QueryBuilder";
import AppError from "../errors/AppError";
import PdfForm from "../models/pdf.model";
import catchAsyncError from "../utils/catchAsync";
import { generatePdfFileName, pdfPosition } from "../utils/pd.utils";
import sendResponse from "../utils/send.response";
import { toRgbColor } from "../utils/colors";
import { buildFontRegistry } from "../utils/fontRegistry";
import { resolveFontKey } from "../utils/fontResolve";
import { IPdfFormPosition } from "../interface/pdf.interface";
import { compressImage } from "../utils/imageCompress";

const fillPdf = catchAsyncError(async (req, res) => {
  const user = req.user!;
  const pdfPath = path.join(__dirname, "../templates/form.pdf");
  const { body } = req;

  const fileBuffer = fs.readFileSync(pdfPath);
  if (!fileBuffer) {
    throw new AppError(404, "Something went wrong. pdf file not found");
  }

  const pdfDoc = await PDFDocument.load(new Uint8Array(fileBuffer));
  const fontRegistry = await buildFontRegistry(pdfDoc);
  const pages = pdfDoc.getPages();

  for (const [field, positions] of Object.entries(pdfPosition)) {
    for (let i = 0; i < positions.length; i++) {
      const { page, x, y, type, width, height, rotate, src } = positions[i];

      if (!pages[page]) {
        continue;
      }

      const yPosition = pages[page].getHeight() - y;
      const value = body[field] ? String(body[field]) : "";

      if (type === "image") {
        let imageBytes: Uint8Array | null = null;
        let isPng = false;
        let isJpg = false;

        if (src) {
          const resolved = path.isAbsolute(src) ? src : path.join(__dirname, src);
          if (!fs.existsSync(resolved)) {
            throw new AppError(404, `Static image not found at ${resolved}`);
          }
          const buf = fs.readFileSync(resolved);
          imageBytes = new Uint8Array(buf);
          const lc = resolved.toLowerCase();
          isPng = lc.endsWith(".png");
          isJpg = lc.endsWith(".jpg") || lc.endsWith(".jpeg");
        } else {
          if (!value || typeof value !== "string") {
            continue;
          }

          const lc = value.toLowerCase();
          if (value.startsWith("data:image/")) {
            const base64 = value.split(",")[1] || "";
            if (!base64) {
              throw new AppError(400, "Invalid data URL for image");
            }
            imageBytes = Uint8Array.from(Buffer.from(base64, "base64"));
            isPng = value.startsWith("data:image/png");
            isJpg = value.startsWith("data:image/jpeg") || value.startsWith("data:image/jpg");
          } else if (/^https?:\/\//i.test(value)) {
            const resp = await fetch(value);
            if (!resp.ok) {
              throw new AppError(400, `Failed to fetch image: ${resp.status} ${resp.statusText}`);
            }
            const ab = await resp.arrayBuffer();
            if (!ab || (ab as ArrayBuffer).byteLength === 0) {
              throw new AppError(400, "Empty image response");
            }
            imageBytes = new Uint8Array(ab);
            const ct = (resp.headers.get("content-type") || "").toLowerCase();
            isPng = ct.includes("image/png") || lc.endsWith(".png");
            isJpg = ct.includes("image/jpeg") || ct.includes("image/jpg") || /\.(jpe?g)$/i.test(lc);
          } else if (fs.existsSync(value)) {
            const buf = fs.readFileSync(value);
            imageBytes = new Uint8Array(buf);
            isPng = lc.endsWith(".png");
            isJpg = lc.endsWith(".jpg") || lc.endsWith(".jpeg");
          } else {
            throw new AppError(
              400,
              "Unsupported image source; provide data URL, http(s) URL, or valid file path"
            );
          }
        }

        if (!imageBytes) {
          continue;
        }
        if (!isPng && !isJpg) {
          throw new AppError(400, "Invalid image format; only PNG or JPG supported");
        }

        const targetMaxW = width ?? 1024;
        const targetMaxH = height ?? 1024;

        const { bytes: smallBytes, isPng: outPng } = await compressImage(imageBytes, {
          maxWidth: targetMaxW,
          maxHeight: targetMaxH,
          quality: 100,
        });

        const embedded = outPng
          ? await pdfDoc.embedPng(smallBytes)
          : await pdfDoc.embedJpg(smallBytes);

        pages[page].drawImage(embedded, {
          x,
          y: yPosition,
          width: width || embedded.width,
          height: height || embedded.height,
          rotate: rotate ? degrees(rotate) : undefined,
        });
      } else {
        if (value == null) {
          continue;
        }

        const pos = positions[i] as IPdfFormPosition;
        const size = pos.fontSize ?? 10;
        const fontKey = resolveFontKey(fontRegistry, {
          fontFamily: pos.fontFamily,
          fontWeight: pos.fontWeight,
          fontStyle: pos.fontStyle,
          fontKey: pos.fontKey,
        });
        const font = fontRegistry.fonts[fontKey] ?? fontRegistry.fonts["Helvetica"];
        const color = toRgbColor(pos.color);

        pages[page].drawText(String(value), {
          x,
          y: yPosition,
          size,
          font,
          color,
          rotate: rotate ? degrees(rotate) : undefined,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();

  const outputDir = path.join(process.cwd(), "storage", "pdfs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `filled_${Date.now()}.pdf`;
  const outputFilePath = path.join(outputDir, fileName);
  fs.writeFileSync(outputFilePath, pdfBytes);

  const softFileName = generatePdfFileName({ firstName: body.firstName, lastName: body.lastName });
  const result = await PdfForm.create({
    fileName: softFileName,
    filePath: `storage/pdfs/${fileName}`,
    user: user._id,
    fileSizeBytes: pdfBytes.byteLength,
    ...body,
  });

  sendResponse(res, {
    data: result,
    success: true,
    statusCode: 200,
    message: "PDF filled successfully",
  });
});

const getMyPdfs = catchAsyncError(async (req, res) => {
  const model = PdfForm.find({ user: req.user!._id }).select("-filePath");
  const queryModel = new QueryBuilder(model, req.query)
    .paginate()
    .filter()
    .sort()
    .search(["firstName", "lastName", "fileName"]);
  await queryModel.count();
  const result = await queryModel.modelQuery;
  const meta = queryModel.getMeta();
  sendResponse(res, {
    data: result,
    success: true,
    statusCode: 200,
    message: "PDFs retrieved successfully",
    meta,
  });
});

const getPdfStreamByPdfId = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  const user = req.user!;
  const pdf = await PdfForm.findById(id);
  if (!pdf) {
    throw new AppError(404, "PDF not found");
  }

  if (pdf.user.toString() !== user._id) {
    throw new AppError(403, "Unauthorized");
  }

  const filePath = path.join(process.cwd(), pdf.filePath);
  if (!fs.existsSync(filePath)) {
    throw new AppError(404, "PDF file not found");
  }
  const fileStream = fs.createReadStream(filePath);
  res.set("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${pdf.fileName || path.basename(filePath)}"`
  );
  fileStream.pipe(res);
});

const pdfStatistics = catchAsyncError(async (req, res) => {
  const user = req.user!;

  const now = new Date();

  // Current month range
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Current year range
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

  // Total count
  const totalCount = await PdfForm.countDocuments({ user: user._id });

  // Current month count
  const currentMonthCount = await PdfForm.countDocuments({
    user: user._id,
    createdAt: { $gte: monthStart, $lt: monthEnd },
  });

  // Current year count
  const currentYearCount = await PdfForm.countDocuments({
    user: user._id,
    createdAt: { $gte: yearStart, $lt: yearEnd },
  });

  sendResponse(res, {
    data: {
      totalCount,
      currentMonthCount,
      currentYearCount,
    },
    success: true,
    statusCode: 200,
    message: "PDF statistics retrieved successfully",
  });
});

const pdfController = {
  fillPdf,
  getMyPdfs,
  getPdfStreamByPdfId,
  pdfStatistics,
};

export default pdfController;
