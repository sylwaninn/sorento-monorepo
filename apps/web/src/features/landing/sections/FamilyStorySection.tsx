import { Check } from "lucide-react";
import { OptimizedPicture } from "@/components/OptimizedPicture";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonAnimated } from "@/components/ui/button-animated";
import { shellClass } from "@/components/ui/shell";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { landingContent } from "@/features/landing/content";
import { landingPictures, memberPortraitById } from "@/features/landing/presentation";
import { landingAnchorHref } from "@/navigation";

const { familyStory } = landingContent;

export const FamilyStorySection = () => (
  <section className={cn(shellClass, "pb-section")}>
    <div className="lg:min-h-140 grid grid-cols-1 items-stretch gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col items-start gap-7 lg:justify-center">
        <SectionHeading description={familyStory.description} title={familyStory.title} />
        <div className="flex flex-col gap-3">
          {familyStory.points.map((point) => (
            <div key={point} className="flex items-center gap-3">
              <Check
                aria-hidden="true"
                className="text-sage-deep size-4 shrink-0"
                strokeWidth={1.75}
              />
              <Text className="text-sm">{point}</Text>
            </div>
          ))}
        </div>
        <ButtonAnimated href={landingAnchorHref("result")}>{familyStory.cta}</ButtonAnimated>
      </div>

      <div className="rounded-brand-lg min-h-112 relative overflow-hidden">
        <OptimizedPicture
          {...landingPictures.familyMain}
          alt={familyStory.images.mainAlt}
          className="absolute inset-0"
        />
        {/* Bottom-weighted veil, only as dark as the glass card under it needs for contrast. */}
        <div
          aria-hidden="true"
          className="from-ink/55 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
        />

        {/* The people the dossier is shared with, sitting on the photograph itself: a frosted
            surface rather than a solid card, so the family behind it stays part of the scene. */}
        <div className="rounded-brand-sm border-card/30 bg-card/15 text-primary-foreground shadow-overlay absolute inset-x-4 bottom-4 flex flex-col gap-3.5 border p-4 backdrop-blur-md md:inset-x-6 md:bottom-6">
          <div className="flex flex-col items-start gap-3.5 sm:flex-row sm:items-center">
            <AvatarGroup className="*:data-[slot=avatar]:ring-card/45">
              {familyStory.crew.members.map((member) => (
                <Avatar key={member.id} size="lg">
                  <AvatarImage alt={member.name} src={memberPortraitById[member.id]} />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
              <AvatarGroupCount className="ring-card/45 size-10">
                {familyStory.crew.extra}
              </AvatarGroupCount>
            </AvatarGroup>
            <div className="flex min-w-0 flex-col">
              <Text className="text-body-sm text-primary-foreground font-strong">
                {familyStory.crew.title}
              </Text>
              <Text className="text-caption text-primary-foreground/78">
                {familyStory.crew.caption}
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {familyStory.roles.map((role) => (
              <Badge
                key={role}
                className="border-primary-foreground/35 text-primary-foreground bg-transparent"
                variant="outline"
              >
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
