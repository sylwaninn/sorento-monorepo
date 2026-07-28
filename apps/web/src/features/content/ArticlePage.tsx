import { useParams, Link as RouterLink } from "react-router";
import { Alert, Button, Card, Typography } from "@heroui/react";
import { sharedContent } from "@/components/content";
import { contentPagesContent } from "@/features/content/content";

/**
 * E04 shell. The editorial content itself is not part of this build; the route, the layout
 * and the closing call to action exist so an article only has to be dropped into the
 * catalogue of pages, and so no article can ship without the general-information notice.
 */
export const ArticlePage = () => {
  const { slug = "" } = useParams();
  const article = contentPagesContent.articles[slug];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4 py-12">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>
          {article?.title ?? contentPagesContent.notFoundTitle}
        </Typography.Heading>
        <RouterLink className="link text-sm" to="/">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{sharedContent.legalNotice}</Alert.Description>
        </Alert.Content>
      </Alert>

      <Card>
        <Card.Content className="flex flex-col gap-3 py-4">
          {(article?.paragraphs ?? [contentPagesContent.notFoundBody]).map((paragraph) => (
            <Typography.Paragraph key={paragraph}>{paragraph}</Typography.Paragraph>
          ))}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>{contentPagesContent.cta.title}</Card.Title>
          <Card.Description>{contentPagesContent.cta.description}</Card.Description>
        </Card.Header>
        <Card.Footer>
          <RouterLink to="/diagnostic">
            <Button variant="primary">{contentPagesContent.cta.button}</Button>
          </RouterLink>
        </Card.Footer>
      </Card>
    </div>
  );
};
