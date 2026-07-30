import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { extractVariables, resolveLetterVariables } from "@sorento/core";
import type { Dossier, LetterTemplate } from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

// Variables the dossier itself can answer; anything else in the template is a manual field.
const deriveAutoValues = (dossier: Dossier): Record<string, string> => ({
  deceasedName: `${dossier.subjectFirstName} ${dossier.subjectLastName}`,
  deathDate: dossier.deathDate ?? "",
});

const fieldLabel = (name: string): string =>
  name === "senderName" ? dossierContent.procedureDetail.letter.senderNameLabel : name;

export interface LetterTabProps {
  dossierId: string;
  procedureId: string;
  dossier: Dossier | null;
  canGenerate: boolean;
}

export const LetterTab = ({ dossierId, procedureId, dossier, canGenerate }: LetterTabProps) => {
  const templatesQuery = useQuery({
    queryKey: queryKeys.catalog.letterTemplates(procedureId),
    queryFn: () => repositories.catalog.listLetterTemplates(procedureId),
  });

  if (templatesQuery.isPending) return <InlineLoader />;

  const template = templatesQuery.data?.[0];
  if (!template || !dossier) {
    return (
      <Card>
        <CardContent className="text-muted py-6 text-center text-sm">
          {dossierContent.procedureDetail.letter.noTemplate}
        </CardContent>
      </Card>
    );
  }

  return (
    <LetterEditor
      dossierId={dossierId}
      procedureId={procedureId}
      template={template}
      autoValues={deriveAutoValues(dossier)}
      canGenerate={canGenerate}
    />
  );
};

interface LetterEditorProps {
  dossierId: string;
  procedureId: string;
  template: LetterTemplate;
  autoValues: Record<string, string>;
  canGenerate: boolean;
}

const LetterEditor = ({
  dossierId,
  procedureId,
  template,
  autoValues,
  canGenerate,
}: LetterEditorProps) => {
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  const manualFields = useMemo(
    () => extractVariables(template.bodyTemplate).filter((name) => !(name in autoValues)),
    [template.bodyTemplate, autoValues],
  );

  const { body, missingVariables } = resolveLetterVariables(template.bodyTemplate, {
    ...autoValues,
    ...manualValues,
  });

  // The PDF is produced in the browser, so the activity entry is the one event with no
  // trigger behind it; the RPC still stamps the actor server-side.
  const generate = useAppMutation({
    mutationFn: async () => {
      const document = new jsPDF();
      document.text(document.splitTextToSize(body, 180), 15, 20);
      document.save(`${template.title}.pdf`);
      await repositories.activityLog.recordLetterGeneration(dossierId, procedureId);
    },
    invalidates: [queryKeys.dossiers.activity(dossierId, procedureId)],
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        {/* Non-dismissible and above the button: this is a template to review and sign. */}
        <Alert>
          <AlertIndicator />
          <AlertDescription>{dossierContent.procedureDetail.letter.notice}</AlertDescription>
        </Alert>

        {manualFields.map((name) => (
          <Field>
            <FieldLabel htmlFor="name">{fieldLabel(name)}</FieldLabel>
            <Input
              id="name"
              value={manualValues[name] ?? ""}
              onChange={(event) =>
                setManualValues((previous) => ({ ...previous, [name]: event.target.value }))
              }
            />
          </Field>
        ))}

        <pre className="whitespace-pre-wrap rounded-md border p-4 text-sm">{body}</pre>

        {missingVariables.length > 0 ? (
          <Alert variant="warning">
            <AlertIndicator />
            <AlertDescription>
              {dossierContent.procedureDetail.letter.missingVariables} {missingVariables.join(", ")}
            </AlertDescription>
          </Alert>
        ) : null}

        <ErrorAlert message={generate.errorMessage} />

        <Button
          variant="default"
          disabled={!canGenerate}
          pending={generate.isPending}
          onClick={() => generate.mutate(undefined)}
        >
          {dossierContent.procedureDetail.letter.downloadButton}
        </Button>
      </CardContent>
    </Card>
  );
};
