import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  Checkbox,
  FieldError,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { procedureInputSchema, type Procedure, type ProcedureInput } from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { adminContent } from "@/features/admin/content";
import { DateFieldPicker, DeleteDialog, TimeWindowSelect } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";

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
  lastVerifiedDate: new Date().toISOString().slice(0, 10),
  active: true,
};

// The admin list and the list every dossier reads are two cache entries of the same data.
const INVALIDATES = [queryKeys.catalog.allProcedures(), queryKeys.catalog.procedures()];

export const ProceduresTab = () => {
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const proceduresQuery = useQuery({
    queryKey: queryKeys.catalog.allProcedures(),
    queryFn: () => repositories.catalog.listAllProcedures(),
  });

  const remove = useAppMutation({
    mutationFn: (id: string) => repositories.catalog.deleteProcedure(id),
    invalidates: INVALIDATES,
  });

  if (proceduresQuery.isPending) {
    return <InlineLoader />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Card.Content className="flex flex-col gap-3 py-4">
          {proceduresQuery.data && proceduresQuery.data.length > 0 ? (
            proceduresQuery.data.map((procedure) => (
              <div
                key={procedure.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Typography weight="medium">
                    {procedure.title}{" "}
                    {procedure.active ? "" : `(${adminContent.catalog.inactiveLabel})`}
                  </Typography>
                  <Typography type="body-sm" color="muted">
                    {procedure.code} — {procedure.organization}
                  </Typography>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setEditing(procedure);
                      setIsFormOpen(true);
                    }}
                  >
                    {adminContent.catalog.editButton}
                  </Button>
                  <DeleteDialog
                    label={procedure.title}
                    onConfirm={() => remove.mutate(procedure.id)}
                  />
                </div>
              </div>
            ))
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              {adminContent.catalog.procedures.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
      </Card>

      {isFormOpen ? (
        <ProcedureForm
          procedure={editing}
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
          variant="primary"
          onPress={() => {
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

const ProcedureForm = ({
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
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          <ErrorAlert message={save.errorMessage} />

          <TextField
            isRequired
            value={input.code}
            onChange={(v) => setInput({ ...input, code: v })}
            isInvalid={Boolean(errors["code"])}
          >
            <Label>{c.codeLabel}</Label>
            <Input />
            {errors["code"] ? <FieldError>{errors["code"]}</FieldError> : null}
          </TextField>

          <TextField
            isRequired
            value={input.title}
            onChange={(v) => setInput({ ...input, title: v })}
            isInvalid={Boolean(errors["title"])}
          >
            <Label>{c.titleLabel}</Label>
            <Input />
            {errors["title"] ? <FieldError>{errors["title"]}</FieldError> : null}
          </TextField>

          <div className="flex flex-col gap-2">
            <Label htmlFor="procedure-description">{c.descriptionLabel}</Label>
            <TextArea
              id="procedure-description"
              aria-label={c.descriptionLabel}
              value={input.description}
              onChange={(event) => setInput({ ...input, description: event.target.value })}
            />
            {errors["description"] ? <FieldError>{errors["description"]}</FieldError> : null}
          </div>

          <TextField
            isRequired
            value={input.organization}
            onChange={(v) => setInput({ ...input, organization: v })}
            isInvalid={Boolean(errors["organization"])}
          >
            <Label>{c.organizationLabel}</Label>
            <Input />
            {errors["organization"] ? <FieldError>{errors["organization"]}</FieldError> : null}
          </TextField>

          <TextField
            value={input.recipientAddress ?? ""}
            onChange={(v) => setInput({ ...input, recipientAddress: v || null })}
          >
            <Label>{c.recipientAddressLabel}</Label>
            <Input />
          </TextField>

          <TimeWindowSelect
            value={input.timeWindow}
            onChange={(timeWindow) => setInput({ ...input, timeWindow })}
          />

          <TextField
            value={input.delayDays !== null ? String(input.delayDays) : ""}
            onChange={(v) => setInput({ ...input, delayDays: v ? Number(v) : null })}
          >
            <Label>{c.delayDaysLabel}</Label>
            <Input type="number" />
          </TextField>

          <TextField
            value={input.referenceProfession ?? ""}
            onChange={(v) => setInput({ ...input, referenceProfession: v || null })}
          >
            <Label>{c.referenceProfessionLabel}</Label>
            <Input />
          </TextField>

          <TextField
            isRequired
            value={input.sourceUrl}
            onChange={(v) => setInput({ ...input, sourceUrl: v })}
            isInvalid={Boolean(errors["sourceUrl"])}
          >
            <Label>{c.sourceUrlLabel}</Label>
            <Input type="url" />
            {errors["sourceUrl"] ? <FieldError>{errors["sourceUrl"]}</FieldError> : null}
          </TextField>

          <DateFieldPicker
            label={c.lastVerifiedDateLabel}
            value={input.lastVerifiedDate}
            onChange={(value) => setInput({ ...input, lastVerifiedDate: value })}
          />

          <Checkbox isSelected={input.active} onChange={(active) => setInput({ ...input, active })}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {c.activeLabel}
            </Checkbox.Content>
          </Checkbox>
        </Card.Content>
        <Card.Footer className="flex gap-2">
          <Button type="submit" variant="primary" isPending={save.isPending}>
            {adminContent.catalog.saveButton}
          </Button>
          <Button variant="ghost" onPress={onCancel}>
            {adminContent.catalog.cancelButton}
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
};
