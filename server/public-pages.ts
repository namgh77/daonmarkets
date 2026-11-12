import type { Express, Request, Response, NextFunction } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import appConfig from "../app.config";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

const logoUrl = appConfig.logoUrl;
const publicPaths = ["/", "/help", "/notices"] as const;
const privatePaths = [
  "/login",
  "/forgot-password",
  "/signup",
  "/member",
  "/member/services",
  "/dashboard",
  "/admin",
  "/admin/finance",
  "/admin/invites",
] as const;

type PublicNotice = {
  id: number;
  title: string;
  body: string;
  audience?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
type PageDefinition = {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
};

const definitions: Record<string, PageDefinition> = {
  "/": {
    path: "/",
    title: "Daonmarkets | Structured member access",
    description:
      "Daonmarkets provides review-led member access, structured information, and direct operational support.",
    indexable: true,
  },
  "/help": {
    path: "/help",
    title: "Daonmarkets Help | Access and request guidance",
    description:
      "Understand Daonmarkets access requests, review approval, member permissions, and the boundary around real-money operations.",
    indexable: true,
  },
  "/notices": {
    path: "/notices",
    title: "Daonmarkets Notices | Public updates",
    description:
      "Read public notices explicitly published by Daonmarkets. Empty public notices are shown as empty; no sample content is inserted.",
    indexable: true,
  },
  "/login": {
    path: "/login",
    title: "Daonmarkets | Sign in",
    description:
      "Sign in to the Daonmarkets member experience through the configured authentication flow.",
    indexable: false,
  },
  "/signup": {
    path: "/signup",
    title: "Daonmarkets | Request access",
    description:
      "Start a Daonmarkets member access request through the configured authentication flow.",
    indexable: false,
  },
  "/forgot-password": {
    path: "/forgot-password",
    title: "Daonmarkets | Reset password",
    description: "Reset your Daonmarkets account password securely by email.",
    indexable: false,
  },
  "/member": {
    path: "/member",
    title: "Daonmarkets | Member area",
    description: "Protected Daonmarkets member area.",
    indexable: false,
  },
  "/member/services": {
    path: "/member/services",
    title: "Daonmarkets | Member resources",
    description: "Protected Daonmarkets member resources.",
    indexable: false,
  },
  "/dashboard": {
    path: "/dashboard",
    title: "Daonmarkets | Member dashboard",
    description: "Protected Daonmarkets member dashboard for requests and account activity.",
    indexable: false,
  },
  "/admin": {
    path: "/admin",
    title: "Daonmarkets | Administration",
    description: "Protected Daonmarkets administration area.",
    indexable: false,
  },
  "/admin/finance": {
    path: "/admin/finance",
    title: "Daonmarkets | Finance request review",
    description: "Protected Daonmarkets finance request review area.",
    indexable: false,
  },
  "/admin/invites": {
    path: "/admin/invites",
    title: "Daonmarkets | Invitation control",
    description: "Protected invitation link management for administrators and designated partners.",
    indexable: false,
  },
  "/404": {
    path: "/404",
    title: "Daonmarkets | Page not found",
    description: "The requested Daonmarkets page was not found.",
    indexable: false,
  },
};

function normalizePath(input: string) {
  const pathname = input.split("?", 1)[0].split("#", 1)[0] || "/";
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function getPublicPageDefinition(input: string): PageDefinition | null {
  return definitions[normalizePath(input)] ?? null;
}

function siteOrigin() {
  const configured = process.env.PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>\"']/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character
  );
}

function metaTags(definition: PageDefinition) {
  const robots = definition.indexable
    ? "index,follow"
    : "noindex,nofollow,noarchive";
  const origin = siteOrigin();
  const canonical = origin
    ? `${origin}${definition.path === "/" ? "/" : definition.path}`
    : null;
  const tags = [
    `<meta name="description" content="${escapeHtml(definition.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(definition.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(definition.description)}" />`,
    `<meta property="og:site_name" content="Daonmarkets" />`,
    `<meta property="og:image" content="${escapeHtml(logoUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(definition.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(definition.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(logoUrl)}" />`,
  ];
  if (canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}" />`);
    tags.push(`<meta property="og:url" content="${escapeHtml(canonical)}" />`);
  }
  return tags.join("\n    ");
}

export function renderPublicPageHtml(
  template: string,
  definition: PageDefinition,
  body: string
) {
  let html = template.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(definition.title)}</title>`
  );
  html = html.replace(/<meta name="description"[^>]*>/i, "");
  html = html.replace(/<meta name="robots"[^>]*>/i, "");
  html = html.replace(/<\/head>/i, `    ${metaTags(definition)}\n  </head>`);
  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    `<div id="root">${body}</div>`
  );
  return html;
}

function homeBody() {
  return `<main class="public-page-fallback"><p>DAONMARKETS / MEMBER OPERATIONS</p><h1>정보를, 행동으로 이어지게.</h1><p>초대된 회원을 위한 접근 관리, 정리된 정보, 운영팀의 직접 지원을 하나의 플랫폼에 담았습니다. 공개 회원 가입은 제공하지 않습니다.</p><nav aria-label="Public links"><a href="/signup">초대 링크로 가입</a> <a href="/help">도움말</a> <a href="/notices">공개 공지</a></nav></main>`;
}

function helpBody() {
  return `<main class="public-page-fallback"><p>PUBLIC HELP</p><h1>입장 전에, 명확한 답변을 확인하세요.</h1><p>Daonmarkets는 공개 모집이 아닌 초대 전용 회원 서비스입니다. 회원 이용 권한은 관리자 역할이 아니며, 승인은 송금이나 잔액 반영을 의미하지 않습니다.</p><nav aria-label="Public links"><a href="/signup">초대 링크로 가입</a> <a href="/notices">공개 공지</a> <a href="/">홈</a></nav><h2>초대 링크가 없는 공개 가입은 제공하지 않습니다.</h2></main>`;
}

function noticeBody(notices: PublicNotice[]) {
  if (notices.length === 0)
    return `<main class="public-page-fallback"><p>PUBLIC NOTICES</p><h1>공개 대상으로 게시된 공지입니다.</h1><p>현재 게시된 공개 공지가 없습니다. 공개 대상으로 명시적으로 게시된 공지만 표시하며, 목록이 비어 있을 때 샘플 공지를 추가하지 않습니다.</p><nav aria-label="Public links"><a href="/help">도움말</a> <a href="/">홈</a></nav></main>`;
  const items = notices
    .map(
      notice =>
        `<article><h2>${escapeHtml(notice.title)}</h2><p>${escapeHtml(notice.body)}</p></article>`
    )
    .join("");
  return `<main class="public-page-fallback"><p>PUBLIC NOTICES</p><h1>공개 대상으로 게시된 공지입니다.</h1><p>공개 대상으로 게시된 실제 공지입니다.</p><section aria-label="Public notices">${items}</section><nav aria-label="Public links"><a href="/help">도움말</a> <a href="/">홈</a></nav></main>`;
}

async function loadPublicNotices(
  req: Request,
  res: Response
): Promise<PublicNotice[]> {
  const context = await createContext({ req, res, info: {} as never });
  const caller = appRouter.createCaller(context);
  const result = await caller.publicContent.announcements();
  if (!Array.isArray(result))
    throw new Error("publicContent.announcements returned invalid data");
  return result
    .filter(item => item && item.audience === "PUBLIC")
    .map(item => ({
      id: Number(item.id),
      title: String(item.title),
      body: String(item.body),
      audience: item.audience,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
}

async function readTemplate(distPath: string) {
  return fs.readFile(path.join(distPath, "index.html"), "utf8");
}

export async function loadPublicPageBody(
  req: Request,
  res: Response,
  definition: PageDefinition
) {
  if (definition.path === "/notices")
    return noticeBody(await loadPublicNotices(req, res));
  if (definition.path === "/") return homeBody();
  if (definition.path === "/help") return helpBody();
  if (definition.path === "/404")
    return `<main class="public-page-fallback"><h1>Page not found.</h1><p>The requested page does not exist.</p><a href="/">Return home</a></main>`;
  return `<main class="public-page-fallback"><h1>${escapeHtml(definition.title)}</h1></main>`;
}

async function sendPage(
  res: Response,
  distPath: string,
  definition: PageDefinition,
  body: string,
  status = 200,
  cacheControl = "public, max-age=0"
) {
  const template = await readTemplate(distPath);
  res
    .status(status)
    .set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cacheControl,
    })
    .send(renderPublicPageHtml(template, definition, body));
}

export async function sendNotFoundPage(res: Response, distPath: string) {
  try {
    await sendPage(
      res,
      distPath,
      definitions["/404"],
      `<main class="public-page-fallback"><p>404 / DAONMARKETS</p><h1>Page not found.</h1><p>The requested page does not exist.</p><a href="/">Return home</a></main>`,
      404,
      "no-store"
    );
  } catch {
    res.status(404).type("text/plain").send("Not found");
  }
}

export function registerPublicPageRoutes(app: Express, distPath: string) {
  app.get("/robots.txt", (_req, res) => {
    const origin = siteOrigin();
    const lines = ["User-agent: *"];
    if (origin) {
      lines.push("Allow: /");
      lines.push(
        "Disallow: /login",
        "Disallow: /signup",
        "Disallow: /member",
        "Disallow: /admin",
        "Disallow: /api/",
        `Sitemap: ${origin}/sitemap.xml`
      );
    } else {
      lines.push("Disallow: /");
    }
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=0")
      .send(`${lines.join("\n")}\n`);
  });

  app.get("/sitemap.xml", (_req, res) => {
    const origin = siteOrigin();
    if (!origin)
      return res
        .status(404)
        .type("text/plain")
        .send("Sitemap unavailable until PUBLIC_SITE_URL is configured.");
    const urls = publicPaths
      .map(
        route =>
          `<url><loc>${escapeHtml(`${origin}${route === "/" ? "/" : route}`)}</loc></url>`
      )
      .join("");
    return res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=0")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
      );
  });

  const routeMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const normalized = normalizePath(req.path);
    const definition = getPublicPageDefinition(normalized);
    if (!definition) return next();
    try {
      const body = await loadPublicPageBody(req, res, definition);
      await sendPage(
        res,
        distPath,
        definition,
        body,
        definition.path === "/404" ? 404 : 200,
        definition.indexable ? "public, max-age=0" : "no-store"
      );
    } catch (error) {
      if (normalized === "/notices") {
        console.error("[Public pages] notices unavailable:", error);
        res
          .status(503)
          .set({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          })
          .send(
            `<main class="public-page-fallback"><p>PUBLIC NOTICES</p><h1>Public notices are temporarily unavailable.</h1><p>Please try again later. No placeholder notices are shown.</p></main>`
          );
        return;
      }
      next(error);
    }
  };

  app.get(
    [
      "/",
      "/help",
      "/help/",
      "/notices",
      "/notices/",
      "/login",
      "/login/",
      "/forgot-password",
      "/forgot-password/",
      "/signup",
      "/signup/",
      "/member",
      "/member/",
      "/member/services",
      "/member/services/",
      "/dashboard",
      "/dashboard/",
      "/admin",
      "/admin/",
      "/admin/finance",
      "/admin/finance/",
      "/admin/invites",
      "/admin/invites/",
      "/404",
      "/404/",
    ],
    routeMiddleware
  );
}
