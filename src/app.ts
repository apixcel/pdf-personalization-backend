import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./app/config";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import router from "./app/routes";
import authUtils from "./app/utils/auth.utils";

const app: Application = express();

// parsers
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: [config.frontend_base_url!],
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// application routes
app.use("/api/v1", router);

// test route
app.get("/", async (_req: Request, res: Response) => {
  await authUtils.sendEmail({
    html: "<h1>hello</h1>",
    subject: "test email",
    receiverMail: "sakibsarkar707@gmail.com",
  });
  res.send("server running ⚡⚡⚡ ");
});

app.use(notFound);
// global error handler
app.use(globalErrorHandler);

// not found route

export default app;
