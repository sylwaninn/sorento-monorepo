import { audiencesContent } from "@/features/landing/content/audiences";
import { faqContent } from "@/features/landing/content/faq";
import { familyStoryContent } from "@/features/landing/content/family-story";
import { finalCtaContent } from "@/features/landing/content/final-cta";
import { forgottenMoneyContent } from "@/features/landing/content/forgotten-money";
import { heroContent } from "@/features/landing/content/hero";
import { howItWorksContent } from "@/features/landing/content/how-it-works";
import { reassuranceContent } from "@/features/landing/content/reassurance";
import { resultContent } from "@/features/landing/content/result";

/**
 * One module per section, matching the components in `sections/`, so a copy change stays in the
 * file named after the screen it changes. This aggregate exists for the readers that legitimately
 * span sections: the page-level tests and the presentation map that keys visuals by content id.
 */
export const landingContent = {
  hero: heroContent,
  audiences: audiencesContent,
  familyStory: familyStoryContent,
  result: resultContent,
  forgottenMoney: forgottenMoneyContent,
  howItWorks: howItWorksContent,
  reassurance: reassuranceContent,
  faq: faqContent,
  finalCta: finalCtaContent,
} as const;

export type { AudienceId } from "@/features/landing/content/audiences";
export type { FamilyMemberId } from "@/features/landing/content/family-story";
export type { ForgottenMoneyId } from "@/features/landing/content/forgotten-money";
export type { HowItWorksStepId } from "@/features/landing/content/how-it-works";
export type { ReassuranceId } from "@/features/landing/content/reassurance";
export type { ResultFeatureId } from "@/features/landing/content/result";
export type { TrustPointId } from "@/features/landing/content/hero";
