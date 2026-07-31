import { useState, type FormEvent } from "react";
import { procedureInputSchema, type Procedure, type ProcedureInput } from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { adminContent } from "@/features/admin/content";
import { DateFieldPicker, TimeWindowSelect } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { todayIso } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

// The admin list and the list every dossier reads are two cache entries of the same data.
// Declared here rather than in ProceduresTab: the tab imports this form, so the other direction
// would close an import cycle.
export const INVALIDATES = [queryKeys.catalog.allProcedures(), queryKeys.catalog.procedures()];

const EMPTY_PROCEDURE_INPUT: ProcedureInput = {
  code: "",
  title: "",
  description: "",
  organization: "",
  recipientAddress: null,
  timeWindow: "30d",
  delayDays: null,
  referenceProfession: null,
  sourceUrl: "",
  lastVerifiedDate: todayIso(),
  active: true,
};

export const ProcedureForm = ({
  procedure,
  onDone,
  onCancel,
}: {
  procedure: Procedure | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const c = adminContent.catalog.procedures;
  const [input, setInput] = useState<ProcedureInput>(
    procedure
      ? {
          code: procedure.code,
          title: procedure.title,
          description: procedure.description,
          organization: procedure.organization,
          recipientAddress: procedure.recipientAddress,
          timeWindow: procedure.timeWindow,
          delayDays: procedure.delayDays,
          referenceProfession: procedure.referenceProfession,
          sourceUrl: procedure.sourceUrl,
          lastVerifiedDate: procedure.lastVerifiedDate,
          active: procedure.active,
        }
      : EMPTY_PROCEDURE_INPUT,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAppMutation({
    mutationFn: (payload: ProcedureInput) =>
      procedure
        ? repositories.catalog.updateProcedure(procedure.id, payload)
        : repositories.catalog.createProcedure(payload),
    invalidates: INVALIDATES,
    onSuccess: onDone,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = procedureInputSchema.safeParse(input);
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

          <Field>
            <FieldLabel htmlFor="code">{c.codeLabel}</FieldLabel>
            <Input
              id="code"
              required
              value={input.code}
              onChange={(event) => setInput({ ...input, code: event.target.value })}
              aria-invalid={Boolean(errors["code"])}
            />
            {errors["code"] ? <FieldError>{errors["code"]}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="title">{c.titleLabel}</FieldLabel>
            <Input
              id="title"
              required
              value={input.title}
              onChange={(event) => setInput({ ...input, title: event.target.value })}
              aria-invalid={Boolean(errors["title"])}
            />
            {errors["title"] ? <FieldError>{errors["title"]}</FieldError> : null}
          </Field>

          <div className="flex flex-col gap-2">
            <Label htmlFor="procedure-description">{c.descriptionLabel}</Label>
            <Textarea
              id="procedure-description"
              aria-label={c.descriptionLabel}
              value={input.description}
              onChange={(event) => setInput({ ...input, description: event.target.value })}
            />
            {errors["description"] ? <FieldError>{errors["description"]}</FieldError> : null}
          </div>

          <Field>
            <FieldLabel htmlFor="organization">{c.organizationLabel}</FieldLabel>
            <Input
              id="organization"
              required
              value={input.organization}
              onChange={(event) => setInput({ ...input, organization: event.target.value })}
              aria-invalid={Boolean(errors["organization"])}
            />
            {errors["organization"] ? <FieldError>{errors["organization"]}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="recipientAddress">{c.recipientAddressLabel}</FieldLabel>
            <Input
              id="recipientAddress"
              value={input.recipientAddress ?? ""}
              onChange={(event) =>
                setInput({ ...input, recipientAddress: event.target.value || null })
              }
            />
          </Field>

          <TimeWindowSelect
            value={input.timeWindow}
            onChange={(timeWindow) => setInput({ ...input, timeWindow })}
          />

          <Field>
            <FieldLabel htmlFor="delayDays">{c.delayDaysLabel}</FieldLabel>
            <Input
              id="delayDays"
              value={input.delayDays !== null ? String(input.delayDays) : ""}
              onChange={(event) =>
                setInput({
                  ...input,
                  delayDays: event.target.value ? Number(event.target.value) : null,
                })
              }
              type="number"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="referenceProfession">{c.referenceProfessionLabel}</FieldLabel>
            <Input
              id="referenceProfession"
              value={input.referenceProfession ?? ""}
              onChange={(event) =>
                setInput({ ...input, referenceProfession: event.target.value || null })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="sourceUrl">{c.sourceUrlLabel}</FieldLabel>
            <Input
              id="sourceUrl"
              required
              value={input.sourceUrl}
              onChange={(event) => setInput({ ...input, sourceUrl: event.target.value })}
              aria-invalid={Boolean(errors["sourceUrl"])}
              type="url"
            />
            {errors["sourceUrl"] ? <FieldError>{errors["sourceUrl"]}</FieldError> : null}
          </Field>

          <DateFieldPicker
            label={c.lastVerifiedDateLabel}
            value={input.lastVerifiedDate}
            onChange={(value) => setInput({ ...input, lastVerifiedDate: value })}
          />

          <Field orientation="horizontal">
            <Checkbox
              checked={input.active}
              id="active"
              onCheckedChange={(checked) => setInput({ ...input, active: checked === true })}
            />
            <FieldLabel htmlFor="active">{c.activeLabel}</FieldLabel>
          </Field>
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
