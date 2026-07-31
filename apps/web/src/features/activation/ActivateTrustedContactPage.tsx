import { CenteredShell } from "@/layout/CenteredShell";
import { linkVariants } from "@/components/ui/link";
import { useState } from "react";
import { todayIso } from "@/lib/dates";
import { useSearchParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { activationContent } from "@/features/activation/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

export const ActivateTrustedContactPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [deathDate, setDeathDate] = useState("");

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
    if (deathDate) requestActivation.mutate(deathDate);
  };
  const effectiveAt = requestActivation.data?.effectiveAt ?? null;

  return (
    <CenteredShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{activationContent.activate.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {resolveQuery.isPending ? (
            <InlineLoader />
          ) : resolveQuery.isError || !resolveQuery.data ? (
            <Alert variant="destructive">
              <AlertIndicator />
              <AlertTitle>{activationContent.activate.invalidTitle}</AlertTitle>
              <AlertDescription>{activationContent.activate.invalidDescription}</AlertDescription>
            </Alert>
          ) : resolveQuery.data.hasPendingActivation ? (
            <Alert variant="warning">
              <AlertIndicator />
              <AlertTitle>{activationContent.activate.alreadyPendingTitle}</AlertTitle>
              <AlertDescription>
                {activationContent.activate.alreadyPendingDescription}
              </AlertDescription>
            </Alert>
          ) : effectiveAt ? (
            <Alert variant="success">
              <AlertIndicator />
              <AlertDescription>
                {activationContent.activate.submitted}{" "}
                {activationContent.activate.effectiveAtPrefix}{" "}
                {new Date(effectiveAt).toLocaleString("fr-FR")}.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p>
                {activationContent.activate.descriptionPrefix} {resolveQuery.data.subjectFirstName}{" "}
                {resolveQuery.data.subjectLastName}.
              </p>

              <Alert>
                <AlertIndicator />
                <AlertDescription>{activationContent.activate.notice}</AlertDescription>
              </Alert>

              <ErrorAlert message={requestActivation.errorMessage} />

              <Field>
                <FieldLabel htmlFor="deathDate">
                  {activationContent.activate.deathDateLabel}
                </FieldLabel>
                <Input
                  id="deathDate"
                  max={todayIso()}
                  name="deathDate"
                  onChange={(event) => setDeathDate(event.target.value)}
                  type="date"
                  value={deathDate}
                />
              </Field>

              <Button
                variant="default"
                className="w-full"
                disabled={!deathDate}
                pending={requestActivation.isPending}
                onClick={submit}
              >
                {activationContent.activate.submitButton}
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter>
          <RouterLink className={linkVariants()} to="/">
            {sharedContent.backHome}
          </RouterLink>
        </CardFooter>
      </Card>
    </CenteredShell>
  );
};
