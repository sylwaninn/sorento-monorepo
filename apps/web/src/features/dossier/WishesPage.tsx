import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Label, TextArea, Typography } from "@heroui/react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";

export const WishesPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);

  const wishesQuery = useQuery({
    queryKey: queryKeys.dossiers.wishes(dossierId),
    queryFn: () => repositories.preparationWishes.getForDossier(dossierId),
  });

  const [funeralWishes, setFuneralWishes] = useState("");
  const [peopleToNotify, setPeopleToNotify] = useState("");
  const [documentLocation, setDocumentLocation] = useState("");

  const save = useAppMutation({
    mutationFn: () =>
      repositories.preparationWishes.upsert(dossierId, {
        funeralWishes: funeralWishes || undefined,
        peopleToNotify: peopleToNotify || undefined,
        documentLocation: documentLocation || undefined,
      }),
    invalidates: [queryKeys.dossiers.wishes(dossierId)],
  });

  useEffect(() => {
    if (wishesQuery.data) {
      setFuneralWishes(wishesQuery.data.funeralWishes ?? "");
      setPeopleToNotify(wishesQuery.data.peopleToNotify ?? "");
      setDocumentLocation(wishesQuery.data.documentLocation ?? "");
    }
  }, [wishesQuery.data]);

  if (access.isLoading || wishesQuery.isPending) {
    return <PageLoader />;
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(undefined);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Typography.Heading level={1}>{dossierContent.wishes.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{dossierContent.wishes.notice}</Alert.Description>
        </Alert.Content>
      </Alert>

      <Card>
        <Form onSubmit={onSubmit}>
          <Card.Content className="flex flex-col gap-4">
            <ErrorAlert message={save.errorMessage} />
            {save.isSuccess ? (
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{dossierContent.wishes.saved}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="funeral-wishes">{dossierContent.wishes.funeralWishesLabel}</Label>
              <TextArea
                id="funeral-wishes"
                disabled={!access.can("wishes:edit")}
                aria-label={dossierContent.wishes.funeralWishesLabel}
                value={funeralWishes}
                onChange={(event) => setFuneralWishes(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="people-to-notify">{dossierContent.wishes.peopleToNotifyLabel}</Label>
              <TextArea
                id="people-to-notify"
                disabled={!access.can("wishes:edit")}
                aria-label={dossierContent.wishes.peopleToNotifyLabel}
                value={peopleToNotify}
                onChange={(event) => setPeopleToNotify(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="document-location">
                {dossierContent.wishes.documentLocationLabel}
              </Label>
              <TextArea
                id="document-location"
                disabled={!access.can("wishes:edit")}
                aria-label={dossierContent.wishes.documentLocationLabel}
                value={documentLocation}
                onChange={(event) => setDocumentLocation(event.target.value)}
              />
            </div>
          </Card.Content>
          {access.can("wishes:edit") ? (
            <Card.Footer>
              <Button type="submit" variant="primary" isPending={save.isPending}>
                {dossierContent.wishes.saveButton}
              </Button>
            </Card.Footer>
          ) : null}
        </Form>
      </Card>
    </div>
  );
};
