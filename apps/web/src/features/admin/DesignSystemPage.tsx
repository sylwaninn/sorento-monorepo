import { ShieldCheck } from "lucide-react";
import { ButtonAnimated } from "@/components/ui/button-animated";
import { PublicCard } from "@/components/PublicCard";
import { IconBadge } from "@/components/IconBadge";
import { adminContent } from "@/features/admin/content";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const SECTION = "flex flex-col gap-6 border-t pt-8";
const ROW = "flex flex-wrap items-center gap-4";

/** Each swatch names the token it renders, so the page cannot drift from the theme. */
const SWATCH_CLASS: Record<string, string> = {
  ink: "bg-ink",
  cream: "bg-cream",
  sage: "bg-sage",
  leaf: "bg-leaf",
  danger: "bg-destructive",
};

const SectionIntroduction = ({ title, description }: { title: string; description: string }) => (
  <div className="max-w-192 flex flex-col gap-2">
    <Heading className="text-showcase-section" level={2} tone="display">
      {title}
    </Heading>
    <Text tone="muted">{description}</Text>
  </div>
);

const StatusAlert = ({
  label,
  variant,
}: {
  label: string;
  variant?: "success" | "warning" | "destructive";
}) => (
  <Alert {...(variant !== undefined && { variant })}>
    <AlertIndicator />
    <AlertDescription>{label}</AlertDescription>
  </Alert>
);

export const DesignSystemPage = () => (
  <main className="bg-cream text-ink min-h-screen py-10 md:py-20">
    <div className="max-w-shell px-gutter mx-auto flex w-full flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
        <div>
          <Heading className="text-showcase" level={1} tone="display">
            {adminContent.designSystem.title}
          </Heading>
          <Text className="max-w-168 mt-4" tone="muted">
            {adminContent.designSystem.description}
          </Text>
        </div>
        <ButtonAnimated direction="back" href="/admin">
          {adminContent.designSystem.back}
        </ButtonAnimated>
      </header>

      <Alert>
        <AlertIndicator />
        <AlertDescription>{adminContent.designSystem.interactionHint}</AlertDescription>
      </Alert>

      <section className={SECTION}>
        <SectionIntroduction {...adminContent.designSystem.sections.colors} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-4">
          {adminContent.designSystem.colors.map((color) => (
            <PublicCard key={color.id} className="gap-0 overflow-hidden py-0 shadow-none">
              <div aria-hidden="true" className={cn("min-h-28", SWATCH_CLASS[color.id])} />
              <CardContent className="py-4">{color.label}</CardContent>
            </PublicCard>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <SectionIntroduction {...adminContent.designSystem.sections.typography} />
        <PublicCard className="p-card shadow-none">
          <CardContent className="flex flex-col gap-4 p-0">
            <Heading className="text-showcase-sample" level={3} tone="display">
              {adminContent.designSystem.sections.typography.display}
            </Heading>
            <Heading level={3}>{adminContent.designSystem.sections.typography.heading}</Heading>
            <Text tone="muted">{adminContent.designSystem.sections.typography.body}</Text>
          </CardContent>
        </PublicCard>
      </section>

      <section className={SECTION} id="design-system-actions">
        <SectionIntroduction {...adminContent.designSystem.sections.actions} />
        <div className={ROW}>
          <Button variant="default">{adminContent.designSystem.actions.primary}</Button>
          <Button variant="outline">{adminContent.designSystem.actions.outline}</Button>
          <Button variant="ghost">{adminContent.designSystem.actions.ghost}</Button>
          <Button disabled variant="default">
            {adminContent.designSystem.actions.disabled}
          </Button>
        </div>
        <div className={ROW}>
          <ButtonAnimated href="#design-system-cards">
            {adminContent.designSystem.actions.forward}
          </ButtonAnimated>
          <ButtonAnimated direction="back" href="#design-system-actions">
            {adminContent.designSystem.actions.back}
          </ButtonAnimated>
          <div className="rounded-brand-sm bg-leaf p-5">
            <ButtonAnimated href="#design-system-alerts" variant="pill-light">
              {adminContent.designSystem.actions.light}
            </ButtonAnimated>
          </div>
        </div>
      </section>

      <section className={SECTION} id="design-system-cards">
        <SectionIntroduction {...adminContent.designSystem.sections.cards} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-4">
          {(["surface", "sage", "inverse"] as const).map((tone) => {
            const card = adminContent.designSystem.cards[tone];
            return (
              <PublicCard key={tone} className="min-h-40 p-6 shadow-none" tone={tone}>
                <CardHeader className="p-0">
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </PublicCard>
            );
          })}
        </div>
      </section>

      <section className={SECTION} id="design-system-alerts">
        <SectionIntroduction {...adminContent.designSystem.sections.alerts} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatusAlert label={adminContent.designSystem.alerts.default} />
          <StatusAlert label={adminContent.designSystem.alerts.success} variant="success" />
          <StatusAlert label={adminContent.designSystem.alerts.warning} variant="warning" />
          <StatusAlert label={adminContent.designSystem.alerts.danger} variant="destructive" />
        </div>
      </section>

      <section className={SECTION}>
        <SectionIntroduction {...adminContent.designSystem.sections.icons} />
        <div className={ROW}>
          {(["sage", "surface", "inverse"] as const).map((tone) => (
            <div key={tone} className="flex items-center gap-3">
              <IconBadge tone={tone}>
                <ShieldCheck aria-hidden="true" strokeWidth={1.5} />
              </IconBadge>
              <Text size="sm">{adminContent.designSystem.iconLabel}</Text>
            </div>
          ))}
        </div>
      </section>
    </div>
  </main>
);
