import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  letterTemplateInputSchema,
  type LetterTemplate,
  type LetterTemplateInput,
  type Procedure,
} from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { adminContent } from "@/features/admin/content";
import { DateFieldPicker, DeleteDialog } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// The admin list and the list every dossier reads are two cache entries of the same data.
const INVALIDATES = [queryKeys.catalog.allLetterTemplates(), queryKeys.catalog.letterTemplates()];

export const LetterTemplatesTab = () => {
  const [editing, setEditing] = useState<LetterTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const templatesQuery = useQuery({
    queryKey: queryKeys.catalog.allLetterTemplates(),
    queryFn: () => repositories.catalog.listAllLetterTemplates(),
  });
  const proceduresQuery = useQuery({
    queryKey: queryKeys.catalog.allProcedures(),
    queryFn: () => repositories.catalog.listAllProcedures(),
  });

  const remove = useAppMutation({
    mutationFn: (id: string) => repositories.catalog.deleteLetterTemplate(id),
    invalidates: INVALIDATES,
  });

  const isLoading = templatesQuery.isPending || proceduresQuery.isPending;
  if (isLoading) {
    return <InlineLoader />;
  }

  const proceduresById = new Map((proceduresQuery.data ?? []).map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {templatesQuery.data && templatesQuery.data.length > 0 ? (
            templatesQuery.data.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Text className="font-medium">{template.title}</Text>
                  <Text size="sm" tone="muted">
                    {proceduresById.get(template.procedureId)?.title ?? template.procedureId}
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(template);
                      setIsFormOpen(true);
                    }}
                  >
                    {adminContent.catalog.editButton}
                  </Button>
                  <DeleteDialog
                    label={template.title}
                    onConfirm={() => remove.mutate(template.id)}
                  />
                </div>
              </div>
            ))
          ) : (
            <Text tone="muted" size="sm">
              {adminContent.catalog.letterTemplates.empty}
            </Text>
          )}
        </CardContent>
      </Card>

      {isFormOpen ? (
        <LetterTemplateForm
          template={editing}
          procedures={proceduresQuery.data ?? []}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onCancel={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
        />
      ) : (
        <Button
          variant="default"
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
        >
          {adminContent.catalog.addButton}
        </Button>
      )}
    </div>
  );
};

const LetterTemplateForm = ({
  template,
  procedures,
  onDone,
  onCancel,
}: {
  template: LetterTemplate | null;
  procedures: Procedure[];
  onDone: () => void;
  onCancel: () => void;
}) => {
  const c = adminContent.catalog.letterTemplates;
  const [procedureId, setProcedureId] = useState(template?.procedureId ?? procedures[0]?.id ?? "");
  const [title, setTitle] = useState(template?.title ?? "");
  const [bodyTemplate, setBodyTemplate] = useState(template?.bodyTemplate ?? "");
  const [variablesText, setVariablesText] = useState(template?.variables.join(", ") ?? "");
  const [sourceUrl, setSourceUrl] = useState(template?.sourceUrl ?? "");
  const [lastVerifiedDate, setLastVerifiedDate] = useState(
    template?.lastVerifiedDate ?? new Date().toISOString().slice(0, 10),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAppMutation({
    mutationFn: (payload: LetterTemplateInput) =>
      template
        ? repositories.catalog.updateLetterTemplate(template.id, payload)
        : repositories.catalog.createLetterTemplate(payload),
    invalidates: INVALIDATES,
    onSuccess: onDone,
  });

  // The trigger is what carries the name, so the visible label has to point at it.
  const procedureFieldId = useId();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: LetterTemplateInput = {
      procedureId,
      title,
      bodyTemplate,
      variables: variablesText
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
      sourceUrl: sourceUrl || null,
      lastVerifiedDate,
    };
    const parsed = letterTemplateInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <ErrorAlert message={save.errorMessage} />

          <Select value={procedureId} onValueChange={(value) => setProcedureId(String(value))}>
            <Label htmlFor={procedureFieldId}>{c.procedureLabel}</Label>
            <SelectTrigger id={procedureFieldId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {procedures.map((procedure) => (
                <SelectItem key={procedure.id} value={procedure.id} textValue={procedure.title}>
                  {procedure.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Field>
            <FieldLabel htmlFor="title">{c.titleLabel}</FieldLabel>
            <Input
              id="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={Boolean(errors["title"])}
            />
            {errors["title"] ? <FieldError>{errors["title"]}</FieldError> : null}
          </Field>

          <div className="flex flex-col gap-2">
            <Label htmlFor="letter-body">{c.bodyTemplateLabel}</Label>
            <Textarea
              id="letter-body"
              aria-label={c.bodyTemplateLabel}
              value={bodyTemplate}
              onChange={(event) => setBodyTemplate(event.target.value)}
            />
            {errors["bodyTemplate"] ? <FieldError>{errors["bodyTemplate"]}</FieldError> : null}
          </div>

          <Field>
            <FieldLabel htmlFor="variablesText">{c.variablesLabel}</FieldLabel>
            <Input
              id="variablesText"
              value={variablesText}
              onChange={(event) => setVariablesText(event.target.value)}
              placeholder="senderName, recipientName"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="sourceUrl">{c.sourceUrlLabel}</FieldLabel>
            <Input
              id="sourceUrl"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              type="url"
            />
          </Field>

          <DateFieldPicker
            label={c.lastVerifiedDateLabel}
            value={lastVerifiedDate}
            onChange={setLastVerifiedDate}
          />
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" variant="default" pending={save.isPending}>
            {adminContent.catalog.saveButton}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {adminContent.catalog.cancelButton}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
