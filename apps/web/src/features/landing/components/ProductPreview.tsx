import { Check } from "lucide-react";
import { PublicCard } from "@/components/PublicCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { landingContent } from "@/features/landing/content";
import { memberPortraitById } from "@/features/landing/presentation";

const { preview } = landingContent.result;
const { progress } = preview;

const WINDOW_DOTS = ["bg-window-close", "bg-window-minimise", "bg-window-expand"] as const;

// The cast restates what the construction guarantees: Object.fromEntries erases the key type,
// and the entries come from the same members list FamilyMemberId is derived from.
const memberNameById = Object.fromEntries(
  landingContent.familyStory.crew.members.map((member) => [member.id, member.name]),
) as Record<keyof typeof memberPortraitById, string>;

/** A mock of a real journey, framed as a browser window so it reads as a product shot. */
export const ProductPreview = () => (
  <div className="border-ink/12 rounded-brand-md bg-card relative w-full self-center overflow-hidden border shadow-none">
    <div className="bg-surface-raised z-2 relative grid min-h-14 grid-cols-[1fr_auto_1fr] items-center border-b px-5">
      <div aria-hidden="true" className="flex gap-2">
        {WINDOW_DOTS.map((dot) => (
          <span key={dot} className={cn("border-ink/8 size-3 rounded-full border", dot)} />
        ))}
      </div>
      <Text className="text-muted-foreground text-caption inline-flex items-baseline justify-center gap-1 text-center tracking-[-0.01em]">
        <span className="text-ink font-heavy">{preview.windowBrand}</span>{" "}
        <span>{preview.windowLabel}</span>
      </Text>
      <span aria-hidden="true" className="w-11 justify-self-end" />
    </div>
    <PublicCard
      aria-label={preview.ariaLabel}
      className="bg-canvas text-ink md:min-h-124 gap-5 rounded-none p-5 shadow-none md:p-[clamp(1.35rem,3.5vw,2rem)]"
      tone="sage"
    >
      <CardHeader className="flex flex-col items-start justify-between gap-4 p-0 md:flex-row md:items-center">
        <CardTitle className="text-preview text-ink">{preview.title}</CardTitle>
        <div className="border-ink/7 bg-card/72 text-muted-foreground flex w-full items-start gap-3 rounded-lg border py-2 pl-2.5 pr-3 text-left md:w-auto md:shrink-0 md:items-center">
          <ProgressCircle
            label={progress.ariaLabel}
            maxValue={progress.total}
            value={progress.completed}
          />
          <div className="flex min-w-20 flex-col">
            <Text className="text-ink text-caption font-bold">
              {progress.completed} {progress.connector} {progress.total}
            </Text>
            <Text className="text-caption">{progress.label}</Text>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 p-0">
        {preview.items.map((item, index) => {
          const isCompleted = item.state === "completed";
          return (
            <article
              key={item.id}
              className={cn(
                "border-ink/8 bg-card shadow-preview gap-snug grid grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-[1.1rem] border px-4 py-4",
                isCompleted && "border-sage-deep/24 bg-surface-done",
              )}
            >
              <span
                className={cn(
                  "border-line-strong bg-canvas text-ink text-meta font-heavy grid size-9 place-items-center rounded-xl border [&_svg]:size-4",
                  isCompleted && "border-sage-deep bg-sage-deep text-primary-foreground",
                )}
              >
                {index === 0 ? <Check aria-hidden="true" strokeWidth={2} /> : `0${index + 1}`}
              </span>
              <div className="min-w-0">
                {/* The deeper green, not the one the borders use: at this size the label is
                    body text as far as WCAG is concerned, so it needs the 4.5:1 ratio. */}
                <span className="text-sage-strong text-micro font-bold">{item.window}</span>
                <Heading className="text-ink text-body-sm font-strong mb-[0.18rem] mt-1" level={3}>
                  {item.title}
                </Heading>
                <Text className="text-caption leading-[1.45]" tone="muted">
                  {item.detail}
                </Text>
              </div>
              <div className="flex flex-col items-end gap-1.5 self-center">
                <span
                  className={cn(
                    "bg-canvas text-muted-foreground text-tag font-strong whitespace-nowrap rounded-full px-2 py-1 max-md:hidden",
                    isCompleted && "bg-sage text-sage-ink",
                  )}
                >
                  {item.status}
                </span>
                {/* Who the step is assigned to: the shared dossier, visible inside the shot. */}
                <Avatar size="sm">
                  <AvatarImage
                    alt={memberNameById[item.assignee]}
                    src={memberPortraitById[item.assignee]}
                  />
                  <AvatarFallback>{memberNameById[item.assignee].charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            </article>
          );
        })}
      </CardContent>
    </PublicCard>
  </div>
);
