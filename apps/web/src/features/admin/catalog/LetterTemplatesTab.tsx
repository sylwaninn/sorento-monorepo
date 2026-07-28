import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  ListBox,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
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
        <Card.Content className="flex flex-col gap-3 py-4">
          {templatesQuery.data && templatesQuery.data.length > 0 ? (
            templatesQuery.data.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Typography weight="medium">{template.title}</Typography>
                  <Typography type="body-sm" color="muted">
                    {proceduresById.get(template.procedureId)?.title ?? template.procedureId}
                  </Typography>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => {
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
            <Typography.Paragraph color="muted" size="sm">
              {adminContent.catalog.letterTemplates.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
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
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          <ErrorAlert message={save.errorMessage} />

          <Select value={procedureId} onChange={(value) => setProcedureId(value as string)}>
            <Label>{c.procedureLabel}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {procedures.map((procedure) => (
                  <ListBox.Item key={procedure.id} id={procedure.id} textValue={procedure.title}>
                    {procedure.title}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <TextField
            isRequired
            value={title}
            onChange={setTitle}
            isInvalid={Boolean(errors["title"])}
          >
            <Label>{c.titleLabel}</Label>
            <Input />
            {errors["title"] ? <FieldError>{errors["title"]}</FieldError> : null}
          </TextField>

          <div className="flex flex-col gap-2">
            <Label htmlFor="letter-body">{c.bodyTemplateLabel}</Label>
            <TextArea
              id="letter-body"
              aria-label={c.bodyTemplateLabel}
              value={bodyTemplate}
              onChange={(event) => setBodyTemplate(event.target.value)}
            />
            {errors["bodyTemplate"] ? <FieldError>{errors["bodyTemplate"]}</FieldError> : null}
          </div>

          <TextField value={variablesText} onChange={setVariablesText}>
            <Label>{c.variablesLabel}</Label>
            <Input placeholder="senderName, recipientName" />
          </TextField>

          <TextField value={sourceUrl} onChange={setSourceUrl}>
            <Label>{c.sourceUrlLabel}</Label>
            <Input type="url" />
          </TextField>

          <DateFieldPicker
            label={c.lastVerifiedDateLabel}
            value={lastVerifiedDate}
            onChange={setLastVerifiedDate}
          />
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
