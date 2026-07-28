import { Card, Link as HeroLink } from "@heroui/react";
import { sharedContent } from "@/components/content";

export interface CatalogNoticeProps {
  /** Required, not optional: no catalog data may be displayed without its provenance. */
  sourceUrl: string;
  lastVerifiedDate: string;
  /** Regulated profession to redirect to, straight from the catalog row — never hardcoded. */
  referenceProfession: string | null;
}

const professionPhrase = (referenceProfession: string | null): string => {
  if (referenceProfession === null) return sharedContent.catalogNotice.defaultProfession;
  return (
    sharedContent.catalogNotice.professionArticles[referenceProfession] ??
    `d'un ${referenceProfession}`
  );
};

const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return year !== undefined && month !== undefined && day !== undefined
    ? `${day}/${month}/${year}`
    : isoDate;
};

/**
 * The single provenance block for anything coming from the catalog: official source, date of
 * last verification, and the redirect to the relevant regulated profession. Its props are
 * required so a screen physically cannot render catalog data without them.
 */
export const CatalogNotice = ({
  sourceUrl,
  lastVerifiedDate,
  referenceProfession,
}: CatalogNoticeProps) => (
  <Card>
    <Card.Content className="text-muted flex flex-col gap-1 py-3 text-sm">
      <HeroLink href={sourceUrl} target="_blank" rel="noreferrer noopener">
        {sharedContent.catalogNotice.sourceLabel}
      </HeroLink>
      <span>
        {sharedContent.catalogNotice.verifiedAtPrefix} {formatDate(lastVerifiedDate)}
      </span>
      <span>
        {sharedContent.catalogNotice.professionPrefix} {professionPhrase(referenceProfession)}.
      </span>
    </Card.Content>
  </Card>
);
