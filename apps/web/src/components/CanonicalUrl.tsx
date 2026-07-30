import { useEffect } from "react";
import { useLocation } from "react-router";
import { env } from "@/lib/env";

const CANONICAL_SELECTOR = 'link[rel="canonical"]';

const headLink = (): HTMLLinkElement => {
  const existing = document.head.querySelector<HTMLLinkElement>(CANONICAL_SELECTOR);
  if (existing) return existing;

  const created = document.createElement("link");
  created.rel = "canonical";
  document.head.append(created);
  return created;
};

/**
 * Keeps the canonical address on the page the visitor is actually reading.
 *
 * One index.html answers every route here, so a canonical written into the static document
 * would declare each legal page a duplicate of the homepage. Search engines render the page
 * before reading its head, which is what makes setting it from the route work; the social
 * crawlers that do not render scripts read og:url instead, and the build writes that one.
 *
 * Nothing is rendered, and nothing happens at all where the build was not told its own origin:
 * a canonical pointing at a guessed domain is worse than none.
 */
export const CanonicalUrl = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const { siteUrl } = env;
    if (siteUrl === undefined) return;

    headLink().href = new URL(pathname, siteUrl).href;
  }, [pathname]);

  return null;
};
