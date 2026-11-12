import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerPublicPageRoutes } from "../public-pages";
import { registerClerkAuth } from "../clerk-auth";
import { resolveAuthProvider } from "../../shared/auth";

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res
      .set("Cache-Control", "no-store")
      .type("application/javascript")
      .send(publicPlatformScript());
  });
  if (resolveAuthProvider(process.env.AUTH_PROVIDER) === "manus") {
    registerOAuthRoutes(app);
  }
  registerClerkAuth(app);
  app.use(
    "/api/trpc",
    (_req, res, next) => {
      res.set("Cache-Control", "private, no-store");
      next();
    },
    createExpressMiddleware({ router: appRouter, createContext })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    registerPublicPageRoutes(app, path.resolve(import.meta.dirname, "public"));
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid PORT");
  }
  server.on("error", error => {
    console.error("Server failed:", error.message);
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () =>
    console.log(`Server listening on port ${port}`)
  );
}

startServer().catch(() => {
  console.error(
    "Server startup failed; check the protected deployment configuration."
  );
  process.exit(1);
});
