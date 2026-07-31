import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";
import { Link } from "@/components/ui/link";

/**
 * Whether the router owns this destination, which means every in-app path without a fragment.
 *
 * A fragment is left to the browser on purpose: the router does not scroll to a hash, and
 * scrolling to a section is the entire behaviour those links exist for. An absolute URL is not
 * ours to route either, so both fall back to a plain anchor.
 */
const isRouterDestination = (href: string) => href.startsWith("/") && !href.includes("#");

export type RouteAnchorProps = Omit<ComponentProps<"a">, "href"> & { href: string };

/**
 * The bare anchor behind every in-app destination. Where the router can serve the address, the
 * click becomes a client navigation, so a visitor who has already downloaded the bundle does not
 * pay for it a second time and the route-level splitting in routes.tsx keeps its point.
 *
 * Unstyled, so a styled parent can wrap it through `asChild`.
 */
export const RouteAnchor = ({ href, ...props }: RouteAnchorProps) =>
  isRouterDestination(href) ? <RouterLink {...props} to={href} /> : <a {...props} href={href} />;

export type RouteLinkProps = Omit<ComponentProps<typeof Link>, "asChild" | "href"> & {
  href: string;
};

/** The same decision, wearing the app's own link styling. */
export const RouteLink = ({ children, href, ...props }: RouteLinkProps) => (
  <Link asChild {...props}>
    <RouteAnchor href={href}>{children}</RouteAnchor>
  </Link>
);
