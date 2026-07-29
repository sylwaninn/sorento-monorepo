import { useState } from "react";
import { useSearchParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, DateField, Label } from "@heroui/react";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { activationContent } from "@/features/activation/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { repositories } from "@/lib/repositories";

export const ActivateTrustedContactPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [deathDate, setDeathDate] = useState<DateValue | null>(null);

  const resolveQuery = useQuery({
    queryKey: ["resolve-trusted-contact-activation", token],
    queryFn: () => repositories.trustedContacts.resolveActivation(token),
    enabled: token.length > 0,
    retry: false,
  });

  // Nothing switches over here: this opens the 48-hour grace period, and the screen says so
  // before the button, not after it.
  const requestActivation = useAppMutation({
    mutationFn: (date: string) => repositories.trustedContacts.requestActivation(token, date),
  });

  const submit = () => {
    if (deathDate) requestActivation.mutate(deathDate.toString());
  };
  const effectiveAt = requestActivation.data?.effectiveAt ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{activationContent.activate.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          {resolveQuery.isPending ? (
            <InlineLoader />
          ) : resolveQuery.isError || !resolveQuery.data ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{activationContent.activate.invalidTitle}</Alert.Title>
                <Alert.Description>
                  {activationContent.activate.invalidDescription}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : resolveQuery.data.hasPendingActivation ? (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{activationContent.activate.alreadyPendingTitle}</Alert.Title>
                <Alert.Description>
                  {activationContent.activate.alreadyPendingDescription}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : effectiveAt ? (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  {activationContent.activate.submitted}{" "}
                  {activationContent.activate.effectiveAtPrefix}{" "}
                  {new Date(effectiveAt).toLocaleString("fr-FR")}.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <>
              <p>
                {activationContent.activate.descriptionPrefix} {resolveQuery.data.subjectFirstName}{" "}
                {resolveQuery.data.subjectLastName}.
              </p>

              <Alert status="default">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{activationContent.activate.notice}</Alert.Description>
                </Alert.Content>
              </Alert>

              <ErrorAlert message={requestActivation.errorMessage} />

              <DateField
                maxValue={today(getLocalTimeZone())}
                value={deathDate}
                onChange={(v) => setDeathDate(v ?? null)}
              >
                <Label>{activationContent.activate.deathDateLabel}</Label>
                <DateField.Group>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                </DateField.Group>
              </DateField>

              <Button
                variant="primary"
                fullWidth
                isDisabled={!deathDate}
                isPending={requestActivation.isPending}
                onPress={submit}
              >
                {activationContent.activate.submitButton}
              </Button>
            </>
          )}
        </Card.Content>
        <Card.Footer>
          <RouterLink className="link text-sm" to="/">
            {sharedContent.backHome}
          </RouterLink>
        </Card.Footer>
      </Card>
    </div>
  );
};
