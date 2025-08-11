import express from "express";
import pdfRoute from "./pdf.route";
import userRoute from "./user.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/user",
    route: userRoute,
  },
  {
    path: "/pdf",
    route: pdfRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
