import { linkVariants } from "@/components/ui/link";
import { useParams, Link as RouterLink } from "react-router";
import { sharedContent } from "@/components/content";
import { contentPagesContent } from "@/features/content/content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Heading, Text } from "@/components/ui/typography";

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
        <Heading level={1}>{article?.title ?? contentPagesContent.notFoundTitle}</Heading>
        <RouterLink className={linkVariants()} to="/">
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert>
        <AlertIndicator />
        <AlertDescription>{sharedContent.legalNotice}</AlertDescription>
      </Alert>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {(article?.paragraphs ?? [contentPagesContent.notFoundBody]).map((paragraph) => (
            <Text key={paragraph}>{paragraph}</Text>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{contentPagesContent.cta.title}</CardTitle>
          <CardDescription>{contentPagesContent.cta.description}</CardDescription>
        </CardHeader>
        <CardFooter>
          <RouterLink to="/diagnostic">
            <Button variant="default">{contentPagesContent.cta.button}</Button>
          </RouterLink>
        </CardFooter>
      </Card>
    </div>
  );
};
