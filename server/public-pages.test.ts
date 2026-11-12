import { describe, expect, it, vi } from "vitest";
import { getPublicPageDefinition, renderPublicPageHtml } from "./public-pages";

describe("public page SEO handling", () => {
  it("recognizes public and private routes while rejecting unknown pages", () => {
    expect(getPublicPageDefinition("/")?.indexable).toBe(true);
    expect(getPublicPageDefinition("/help/")?.path).toBe("/help");
    expect(getPublicPageDefinition("/notices?from=home")?.indexable).toBe(true);
    expect(getPublicPageDefinition("/member")?.indexable).toBe(false);
    expect(getPublicPageDefinition("/missing")).toBeNull();
  });

  it("renders meaningful body and route metadata without guessing an origin", () => {
    vi.stubEnv("PUBLIC_SITE_URL", "");
    const template = "<!doctype html><html><head><title>old</title><meta name=\"description\" content=\"old\"></head><body><div id=\"root\">placeholder</div></body></html>";
    const definition = getPublicPageDefinition("/help");
    expect(definition).not.toBeNull();
    const html = renderPublicPageHtml(template, definition!, "<main><h1>Clear help</h1><p>Approval is review only.</p></main>");

    expect(html).toContain("<h1>Clear help</h1>");
    expect(html).toContain("Approval is review only.");
    expect(html).toContain('name="robots" content="index,follow"');
    expect(html).toContain('property="og:image"');
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("og:url");
  });

  it("uses only the configured origin for canonical and social URL metadata", () => {
    vi.stubEnv("PUBLIC_SITE_URL", "https://public.example.test/");
    const template = "<html><head><title>old</title><meta name=\"description\" content=\"old\"></head><body><div id=\"root\"></div></body></html>";
    const definition = getPublicPageDefinition("/notices");
    const html = renderPublicPageHtml(template, definition!, "<main><h1>Public notices</h1></main>");

    expect(html).toContain('<link rel="canonical" href="https://public.example.test/notices" />');
    expect(html).toContain('<meta property="og:url" content="https://public.example.test/notices" />');
    expect(html).not.toContain("manus.computer");
  });
});
