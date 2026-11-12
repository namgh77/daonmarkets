import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import {
  getPublicPageDefinition,
  loadPublicPageBody,
  renderPublicPageHtml,
  sendNotFoundPage,
} from "../public-pages";

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = url.split("?", 1)[0];
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/manus-storage/")
    ) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const definition =
        getPublicPageDefinition(pathname) ?? getPublicPageDefinition("/404")!;
      const body = await loadPublicPageBody(req, res, definition);
      template = renderPublicPageHtml(template, definition, body);
      const page = await vite.transformIndexHtml(url, template);
      res
        .status(definition.path === "/404" ? 404 : 200)
        .set({
          "Content-Type": "text/html",
          "Cache-Control": definition.indexable
            ? "public, max-age=0"
            : "no-store",
        })
        .end(page);
    } catch (error) {
      if (pathname.replace(/\/+$/, "") === "/notices") {
        res
          .status(503)
          .set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" })
          .type("text/plain")
          .send(
            "Public notices are temporarily unavailable. Please try again later."
          );
        return;
      }
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath))
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  app.use(express.static(distPath));
  app.use("*", (req, res) => {
    const requestPath = req.originalUrl.split("?", 1)[0];
    if (
      requestPath.startsWith("/api/") ||
      requestPath.startsWith("/assets/") ||
      requestPath.startsWith("/manus-storage/")
    ) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    void sendNotFoundPage(res, distPath);
  });
}
