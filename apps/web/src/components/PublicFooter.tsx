import { ShieldCheck } from "lucide-react";
import { sharedContent } from "@/components/content";
import { RouteLink } from "@/components/RouteLink";
import { SorentoBrand } from "@/components/SorentoBrand";
import { shellClass } from "@/components/ui/shell";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { landingAnchorHref, publicPath } from "@/navigation";

const { publicFooter, publicNavigation } = sharedContent;

const LEGAL_LINKS = [
  { href: publicPath.legalNotice, label: publicFooter.legalNotice },
  { href: publicPath.privacy, label: publicFooter.privacy },
  { href: publicPath.terms, label: publicFooter.terms },
] as const;

const FOOTER_LINK = "text-caption";
const FOOTER_ROW = "flex flex-col justify-between gap-8 max-md:items-start md:flex-row";
const FOOTER_CLUSTER = "flex flex-wrap items-center gap-6";

export interface PublicFooterProps {
  anchorPrefix?: string;
}

/**
 * Shared public footer; anchorPrefix keeps homepage sections reachable from nested routes.
 *
 * The tinted panel sits inside the shell padding rather than on the shell itself, so its edges
 * line up with the section above it instead of reaching past them.
 */
export const PublicFooter = ({ anchorPrefix = "" }: PublicFooterProps) => (
  <footer className={cn(shellClass, "mt-3")}>
    <div className="rounded-t-brand-lg border-line bg-card border border-b-0 px-6 pb-8 pt-12 md:px-12">
      <div className={FOOTER_ROW}>
        <div className="max-w-108 flex flex-col items-start gap-4">
          <SorentoBrand href={publicPath.home} iconClassName="size-9" showSignature />
          <Text tone="muted">{publicFooter.description}</Text>
        </div>
        <div className={cn(FOOTER_CLUSTER, "md:justify-end")}>
          {publicNavigation.links.map((item) => (
            <RouteLink
              key={item.anchor}
              className={FOOTER_LINK}
              href={landingAnchorHref(item.anchor, anchorPrefix)}
              variant="quiet"
            >
              {item.label}
            </RouteLink>
          ))}
        </div>
      </div>

      {/* The scope promise, small but on every public page: what Sorento does, what it never
          claims to be, and the general-information notice compliance asks for. */}
      <div className="border-line mt-12 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t pt-6">
        <ShieldCheck
          aria-hidden="true"
          className="text-sage-deep mt-0.5 size-4"
          strokeWidth={1.5}
        />
        <div className="flex flex-col gap-1.5">
          <Text className="font-strong text-sm">{publicFooter.scopeTitle}</Text>
          <Text className="text-caption max-w-176 leading-relaxed" tone="muted">
            {publicFooter.scopeDescription}
          </Text>
          <Text className="text-caption leading-relaxed" tone="muted">
            {sharedContent.legalNotice}
          </Text>
        </div>
      </div>

      <div className={cn(FOOTER_ROW, "border-line mt-8 items-center border-t pt-6")}>
        <div className={FOOTER_CLUSTER}>
          {LEGAL_LINKS.map((item) => (
            <RouteLink key={item.href} className={FOOTER_LINK} href={item.href} variant="quiet">
              {item.label}
            </RouteLink>
          ))}
        </div>
        <div className={FOOTER_CLUSTER}>
          <Text className="text-caption" tone="muted">
            {publicFooter.copyright}
          </Text>
          <RouteLink className={FOOTER_LINK} href={publicPath.login} variant="quiet">
            {publicFooter.login}
          </RouteLink>
          <RouteLink className={FOOTER_LINK} href={publicPath.signup} variant="quiet">
            {publicFooter.signup}
          </RouteLink>
        </div>
      </div>
    </div>
  </footer>
);
