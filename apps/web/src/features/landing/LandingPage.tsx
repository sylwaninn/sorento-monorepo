import { PublicFooter } from "@/components/PublicFooter";
import { LandingHeader } from "@/features/landing/components/LandingHeader";
import { AudienceSection } from "@/features/landing/sections/AudienceSection";
import { FamilyStorySection } from "@/features/landing/sections/FamilyStorySection";
import { FaqSection } from "@/features/landing/sections/FaqSection";
import { FinalCtaSection } from "@/features/landing/sections/FinalCtaSection";
import { ForgottenMoneySection } from "@/features/landing/sections/ForgottenMoneySection";
import { HeroSection } from "@/features/landing/sections/HeroSection";
import { HowItWorksSection } from "@/features/landing/sections/HowItWorksSection";
import { ResultSection } from "@/features/landing/sections/ResultSection";
import { TrustSection } from "@/features/landing/sections/TrustSection";
import { TrustStripSection } from "@/features/landing/sections/TrustStripSection";

/**
 * The scroll margin is set here rather than on each section: the floating header overlaps the
 * top of the viewport, and an anchor that lands under it reads as a broken link.
 * Clipping what leaves the frame is the stylesheet's job, on the window itself: a page that
 * clipped its own root would be a scroll container, and the sticky column in the FAQ would
 * have nothing to stick to.
 *
 * `flow-root` is what keeps the page's own ground under the top of the window. Without it the
 * header's top margin collapses straight out of here and out of the body, so the page starts
 * twenty pixels down and those pixels show whatever is behind it: the document's own colour,
 * and above that the strip BrowserChromeTint parks at the very top, which is a different one.
 * A block formatting context holds the margin inside. Not `overflow`, which would also hold it
 * but would make this a scroll container, and the FAQ column sticks to the window.
 */
export const LandingPage = () => (
  <div className="text-ink bg-canvas flow-root min-h-screen [&_section[id]]:scroll-mt-28">
    <LandingHeader />
    <main>
      <HeroSection />
      <TrustStripSection />
      <AudienceSection />
      <FamilyStorySection />
      <ResultSection />
      <ForgottenMoneySection />
      <HowItWorksSection />
      <TrustSection />
      <FaqSection />
      <FinalCtaSection />
    </main>
    <PublicFooter />
  </div>
);
