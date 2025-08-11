import { Router } from "express";
import pdfController from "../controller/pdf.controller";
import authMiddleware from "../middlewares/authValidation";
const router = Router();
router.post("/fill-form", authMiddleware.isAuthenticatedUser(), pdfController.fillPdf);

const pdfRoute = router;
export default pdfRoute;
