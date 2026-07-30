import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Heart,
  Landmark,
  ListChecks,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { OptimizedPictureProps } from "@/components/OptimizedPicture";
import type { PublicCardTone } from "@/components/PublicCard";
import type {
  AudienceId,
  FamilyMemberId,
  ForgottenMoneyId,
  HowItWorksStepId,
  ReassuranceId,
  ResultFeatureId,
  TrustPointId,
} from "@/features/landing/content";

type PicturePresentation = Omit<OptimizedPictureProps, "alt">;

export const landingPictures = {
  hero: {
    avifSrcSet:
      "/images/hero-sorento-768.avif 768w, /images/hero-sorento-1280.avif 1280w, /images/hero-sorento-1728.avif 1728w",
    fallbackSrc: "/images/hero-sorento-1280.jpg",
    fallbackSrcSet:
      "/images/hero-sorento-768.jpg 768w, /images/hero-sorento-1280.jpg 1280w, /images/hero-sorento-1728.jpg 1728w",
    height: 909,
    priority: true,
    sizes: "(max-width: 767px) 100vw, min(88rem, calc(100vw - 2.5rem))",
    variant: "hero",
    width: 1728,
  },
  familyMain: {
    avifSrcSet:
      "/images/family-support-mother-daughter-720.avif 720w, /images/family-support-mother-daughter-1200.avif 1200w",
    fallbackSrc: "/images/family-support-mother-daughter-1200.jpg",
    fallbackSrcSet:
      "/images/family-support-mother-daughter-720.jpg 720w, /images/family-support-mother-daughter-1200.jpg 1200w",
    height: 900,
    sizes: "(max-width: 1023px) 100vw, 44vw",
    variant: "stack",
    width: 1200,
  },
} satisfies Record<"familyMain" | "hero", PicturePresentation>;

/**
 * Placeholder portraits for the shared-dossier vignette. They come from a stock set rather than
 * from anyone real, and the trio is completed by a "+1" counter instead of a fourth face.
 */
export const memberPortraitById = {
  marie: "/images/avatars/avatar-marie.jpg",
  claire: "/images/avatars/avatar-claire.jpg",
  samuel: "/images/avatars/avatar-samuel.jpg",
} satisfies Record<FamilyMemberId, string>;

export const audienceToneById = {
  close: "surface",
  preparation: "inverse",
} satisfies Record<AudienceId, PublicCardTone>;

export const resultIconById = {
  schedule: CalendarDays,
  benefits: Search,
  letters: FileText,
  "shared-record": UsersRound,
} satisfies Record<ResultFeatureId, LucideIcon>;

export const moneyPresentationById = {
  "death-capital": { icon: Banknote, stream: "forward" },
  "survivor-pension": { icon: UserRoundCheck, stream: "forward" },
  "widowhood-allowance": { icon: CalendarDays, stream: "forward" },
  "life-insurance": { icon: ShieldCheck, stream: "forward" },
  "inactive-accounts": { icon: Landmark, stream: "reverse" },
  "family-support": { icon: Heart, stream: "reverse" },
  "job-centre-benefit": { icon: WalletCards, stream: "reverse" },
  "beneficiary-annuity": { icon: UsersRound, stream: "reverse" },
} satisfies Record<
  ForgottenMoneyId,
  {
    icon: LucideIcon;
    stream: "forward" | "reverse";
  }
>;

export const stepIconById = {
  questionnaire: ClipboardCheck,
  summary: ListChecks,
  record: UsersRound,
} satisfies Record<HowItWorksStepId, LucideIcon>;

export const reassuranceIconById = {
  free: Heart,
  "no-commission": WalletCards,
  "official-sources": ShieldCheck,
  privacy: LockKeyhole,
} satisfies Record<ReassuranceId, LucideIcon>;

export const trustIconById = {
  "official-sources": ShieldCheck,
  "no-commission": WalletCards,
  "eu-hosting": LockKeyhole,
} satisfies Record<TrustPointId, LucideIcon>;
