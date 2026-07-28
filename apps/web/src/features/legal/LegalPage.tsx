import { Link as RouterLink } from "react-router";
import { Alert, Card, Typography } from "@heroui/react";
import { sharedContent } from "@/components/content";
import { legalContent } from "@/features/legal/content";

interface LegalDocument {
  title: string;
  sections: ReadonlyArray<{ title: string; paragraphs: readonly string[] }>;
}

const LegalPage = ({ document }: { document: LegalDocument }) => (
  <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4 py-12">
    <div className="flex items-center justify-between">
      <Typography.Heading level={1}>{document.title}</Typography.Heading>
      <RouterLink className="link text-sm" to="/">
        {sharedContent.back}
      </RouterLink>
    </div>

    <Alert status="warning">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{legalContent.reviewBanner}</Alert.Description>
      </Alert.Content>
    </Alert>

    {document.sections.map((section) => (
      <Card key={section.title}>
        <Card.Header>
          <Card.Title>{section.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {section.paragraphs.map((paragraph) => (
            <Typography.Paragraph key={paragraph} size="sm">
              {paragraph}
            </Typography.Paragraph>
          ))}
        </Card.Content>
      </Card>
    ))}
  </div>
);

export const LegalNoticePage = () => <LegalPage document={legalContent.legalNotice} />;
export const PrivacyPage = () => <LegalPage document={legalContent.privacy} />;
export const TermsPage = () => <LegalPage document={legalContent.terms} />;
