import { useEffect } from "react";
import { useLocation } from "wouter";

const routeMetadata: Record<string, { title: string; description: string; robots: string }> = {
  "/": {
    title: "Daonmarkets | Structured member access",
    description: "Daonmarkets provides review-led member access, structured information, and direct operational support.",
    robots: "index,follow",
  },
  "/help": {
    title: "Daonmarkets Help | Access and request guidance",
    description: "Understand Daonmarkets access requests, review approval, member permissions, and the boundary around real-money operations.",
    robots: "index,follow",
  },
  "/notices": {
    title: "Daonmarkets Notices | Public updates",
    description: "Read public notices explicitly published by Daonmarkets. Empty public notices are shown as empty; no sample content is inserted.",
    robots: "index,follow",
  },
  "/login": {
    title: "Daonmarkets | Sign in",
    description: "Sign in to the Daonmarkets member experience through the configured authentication flow.",
    robots: "noindex,nofollow,noarchive",
  },
  "/signup": {
    title: "Daonmarkets | Request access",
    description: "Start a Daonmarkets member access request through the configured authentication flow.",
    robots: "noindex,nofollow,noarchive",
  },
  "/member": {
    title: "Daonmarkets | Member area",
    description: "Protected Daonmarkets member area.",
    robots: "noindex,nofollow,noarchive",
  },
  "/member/services": {
    title: "Daonmarkets | Member resources",
    description: "Protected Daonmarkets member resources.",
    robots: "noindex,nofollow,noarchive",
  },
  "/dashboard": {
    title: "Daonmarkets | Member dashboard",
    description: "Protected Daonmarkets member dashboard for requests and account activity.",
    robots: "noindex,nofollow,noarchive",
  },
  "/admin": {
    title: "Daonmarkets | Administration",
    description: "Protected Daonmarkets administration area.",
    robots: "noindex,nofollow,noarchive",
  },
  "/admin/finance": {
    title: "Daonmarkets | Finance request review",
    description: "Protected Daonmarkets finance request review area.",
    robots: "noindex,nofollow,noarchive",
  },
  "/admin/invites": {
    title: "Daonmarkets | Invitation control",
    description: "Protected invitation link management for administrators and designated partners.",
    robots: "noindex,nofollow,noarchive",
  },
  "/404": {
    title: "Daonmarkets | Page not found",
    description: "The requested Daonmarkets page was not found.",
    robots: "noindex,nofollow,noarchive",
  },
};

function normalizedPath(location: string) {
  const pathname = location.split("?", 1)[0].split("#", 1)[0] || "/";
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function RouteMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const path = normalizedPath(location);
    const metadata = routeMetadata[path] ?? {
      title: "Daonmarkets | Page not found",
      description: "The requested Daonmarkets page was not found.",
      robots: "noindex,nofollow,noarchive",
    };

    document.title = metadata.title;
    setMeta("name", "description", metadata.description);
    setMeta("name", "robots", metadata.robots);
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
  }, [location]);

  return null;
}
