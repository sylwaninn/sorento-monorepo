import { Link as RouterLink } from "react-router";
import { Alert, Button, Card, Typography } from "@heroui/react";
import { sharedContent } from "@/components/content";
import { landingContent } from "@/features/landing/content";

const LEGAL_LINKS = [
  { to: "/mentions-legales", label: landingContent.footer.legalNotice },
  { to: "/confidentialite", label: landingContent.footer.privacy },
  { to: "/conditions-generales", label: landingContent.footer.terms },
] as const;

export const LandingPage = () => (
  <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 p-4 py-12">
    <header className="flex flex-col gap-4">
      <Typography.Heading level={1}>{landingContent.hero.title}</Typography.Heading>
      <Typography.Paragraph>{landingContent.hero.subtitle}</Typography.Paragraph>

      <div className="flex flex-col items-start gap-2">
        <RouterLink to="/diagnostic">
          <Button variant="primary" size="lg">
            {landingContent.hero.cta}
          </Button>
        </RouterLink>
        <Typography type="body-sm" color="muted">
          {landingContent.hero.ctaHint}
        </Typography>
      </div>

      {/* Required and above the fold: this service informs, it does not advise. */}
      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{sharedContent.legalNotice}</Alert.Description>
        </Alert.Content>
      </Alert>
    </header>

    <section className="flex flex-col gap-4">
      <Typography.Heading level={2}>{landingContent.howItWorks.title}</Typography.Heading>
      <div className="flex flex-col gap-3">
        {landingContent.howItWorks.steps.map((step, index) => (
          <Card key={step.title}>
            <Card.Header>
              <Card.Title>
                {index + 1}. {step.title}
              </Card.Title>
              <Card.Description>{step.description}</Card.Description>
            </Card.Header>
          </Card>
        ))}
      </div>
    </section>

    <section className="flex flex-col gap-4">
      <Typography.Heading level={2}>{landingContent.scope.title}</Typography.Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <Card.Content className="flex flex-col gap-2 py-4">
            {landingContent.scope.does.map((item) => (
              <Typography key={item} type="body-sm">
                {item}
              </Typography>
            ))}
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="flex flex-col gap-2 py-4">
            {landingContent.scope.doesNot.map((item) => (
              <Typography key={item} type="body-sm" color="muted">
                {item}
              </Typography>
            ))}
          </Card.Content>
        </Card>
      </div>
    </section>

    <section className="flex flex-col gap-4">
      <Typography.Heading level={2}>{landingContent.reassurance.title}</Typography.Heading>
      <div className="flex flex-col gap-3">
        {landingContent.reassurance.points.map((point) => (
          <Card key={point.title}>
            <Card.Header>
              <Card.Title>{point.title}</Card.Title>
              <Card.Description>{point.description}</Card.Description>
            </Card.Header>
          </Card>
        ))}
      </div>
    </section>

    <footer className="flex flex-col gap-4 border-t pt-6">
      <div className="flex flex-wrap gap-3">
        <RouterLink to="/inscription">
          <Button variant="primary">{landingContent.footer.signup}</Button>
        </RouterLink>
        <RouterLink to="/connexion">
          <Button variant="ghost">{landingContent.footer.login}</Button>
        </RouterLink>
      </div>
      <div className="flex flex-wrap gap-4">
        {LEGAL_LINKS.map((link) => (
          <RouterLink key={link.to} className="link text-sm" to={link.to}>
            {link.label}
          </RouterLink>
        ))}
      </div>
    </footer>
  </div>
);
