import { ButtonAnimated } from "@/components/ui/button-animated";
import { PublicCard } from "@/components/PublicCard";
import { PublicFooter } from "@/components/PublicFooter";
import { SorentoBrand } from "@/components/SorentoBrand";
import { sharedContent } from "@/components/content";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { CardContent, CardHeader } from "@/components/ui/card";
import { shellClass } from "@/components/ui/shell";
import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { legalContent } from "@/features/legal/content";
import { publicPath } from "@/navigation";

interface LegalDocument {
  title: string;
  sections: ReadonlyArray<{ title: string; paragraphs: readonly string[] }>;
}

/**
 * On the narrowest viewports the back link keeps only its arrow: the header is a single row
 * shared with the centred brand, and the label is what makes that row wrap.
 */
const BACK_LINK_COMPACT = cn(
  "max-sm:w-11 max-sm:justify-center max-sm:gap-0 max-sm:p-0",
  "max-sm:[&_[data-slot=action-label]]:hidden",
);

/** `flow-root` for the same reason as the homepage: see LandingPage.tsx. */
const LegalPage = ({ document }: { document: LegalDocument }) => (
  <div className="text-ink bg-cream flow-root min-h-screen">
    <header
      className={cn(
        shellClass,
        "md:px-gutter md:mt-frame min-h-18 relative mt-3 flex items-center justify-start gap-6 px-4 py-3 sm:min-h-20 sm:py-4",
      )}
    >
      <ButtonAnimated className={BACK_LINK_COMPACT} direction="back" href={publicPath.home}>
        {sharedContent.backHome}
      </ButtonAnimated>
      <SorentoBrand
        className="absolute left-1/2 -translate-x-1/2"
        href={publicPath.home}
        showSignature
        variant="header"
      />
    </header>

    <main className={cn(shellClass, "max-w-legal py-15 sm:py-19 md:py-[clamp(4.5rem,8vw,7rem)]")}>
      <div className="max-w-192 mb-8 md:mb-[clamp(2rem,4vw,3rem)]">
        <Heading
          className="text-legal-title-sm sm:text-legal-title max-w-display-line"
          level={1}
          tone="display"
        >
          {document.title}
        </Heading>
      </div>

      <Alert
        className="rounded-brand-sm bg-mist text-ink mb-4 border shadow-none"
        variant="warning"
      >
        <AlertIndicator />
        <AlertDescription>{legalContent.reviewBanner}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-4">
        {document.sections.map((section) => (
          <PublicCard
            key={section.title}
            className="border-ink/8 rounded-brand-md p-card gap-5 border shadow-none"
          >
            <CardHeader className="p-0">
              <Heading className="text-legal-section" level={2} tone="display">
                {section.title}
              </Heading>
            </CardHeader>
            <CardContent className="flex flex-col gap-[0.9rem] p-0">
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} className="max-w-prose leading-[1.75]" tone="muted">
                  {paragraph}
                </Text>
              ))}
            </CardContent>
          </PublicCard>
        ))}
      </div>
    </main>

    <PublicFooter anchorPrefix={publicPath.home} />
  </div>
);

export const LegalNoticePage = () => <LegalPage document={legalContent.legalNotice} />;
export const PrivacyPage = () => <LegalPage document={legalContent.privacy} />;
export const TermsPage = () => <LegalPage document={legalContent.terms} />;
