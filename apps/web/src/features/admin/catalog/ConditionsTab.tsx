import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  FieldError,
  Form,
  Label,
  ListBox,
  Select,
  TextArea,
  Typography,
} from "@heroui/react";
import {
  conditionInputSchema,
  type Benefit,
  type Condition,
  type ConditionInput,
  type Procedure,
} from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { adminContent } from "@/features/admin/content";
import { DeleteDialog } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";

// The admin list and the list every dossier reads are two cache entries of the same data.
const INVALIDATES = [queryKeys.catalog.conditions(), queryKeys.catalog.conditions()];

export const ConditionsTab = () => {
  const [editing, setEditing] = useState<Condition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const conditionsQuery = useQuery({
    queryKey: queryKeys.catalog.conditions(),
    queryFn: () => repositories.catalog.listConditions(),
  });
  const proceduresQuery = useQuery({
    queryKey: queryKeys.catalog.conditions(),
    queryFn: () => repositories.catalog.listAllProcedures(),
  });
  const benefitsQuery = useQuery({
    queryKey: queryKeys.catalog.conditions(),
    queryFn: () => repositories.catalog.listAllBenefits(),
  });

  const remove = useAppMutation({
    mutationFn: (id: string) => repositories.catalog.deleteCondition(id),
    invalidates: INVALIDATES,
  });

  const isLoading =
    conditionsQuery.isPending || proceduresQuery.isPending || benefitsQuery.isPending;
  if (isLoading) {
    return <InlineLoader />;
  }

  const proceduresById = new Map((proceduresQuery.data ?? []).map((p) => [p.id, p]));
  const benefitsById = new Map((benefitsQuery.data ?? []).map((b) => [b.id, b]));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Card.Content className="flex flex-col gap-3 py-4">
          {conditionsQuery.data && conditionsQuery.data.length > 0 ? (
            conditionsQuery.data.map((condition) => {
              const targetLabel = condition.procedureId
                ? (proceduresById.get(condition.procedureId)?.title ?? condition.procedureId)
                : (benefitsById.get(condition.benefitId ?? "")?.title ?? condition.benefitId);
              return (
                <div
                  key={condition.id}
                  className="flex items-center justify-between gap-3 border-b pb-3"
                >
                  <div className="flex flex-col">
                    <Typography weight="medium">
                      {condition.procedureId
                        ? adminContent.catalog.conditions.targetProcedure
                        : adminContent.catalog.conditions.targetBenefit}{" "}
                      — {targetLabel}
                    </Typography>
                    <span className="text-muted max-w-md truncate text-sm">
                      {JSON.stringify(condition.expression)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setEditing(condition);
                        setIsFormOpen(true);
                      }}
                    >
                      {adminContent.catalog.editButton}
                    </Button>
                    <DeleteDialog
                      label={String(targetLabel)}
                      onConfirm={() => remove.mutate(condition.id)}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              {adminContent.catalog.conditions.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
      </Card>

      {isFormOpen ? (
        <ConditionForm
          condition={editing}
          procedures={proceduresQuery.data ?? []}
          benefits={benefitsQuery.data ?? []}
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

const ConditionForm = ({
  condition,
  procedures,
  benefits,
  onDone,
  onCancel,
}: {
  condition: Condition | null;
  procedures: Procedure[];
  benefits: Benefit[];
  onDone: () => void;
  onCancel: () => void;
}) => {
  const c = adminContent.catalog.conditions;
  const [targetType, setTargetType] = useState<"procedure" | "benefit">(
    condition?.benefitId ? "benefit" : "procedure",
  );
  const [targetId, setTargetId] = useState<string>(
    condition?.procedureId ?? condition?.benefitId ?? "",
  );
  const [expressionText, setExpressionText] = useState(
    condition ? JSON.stringify(condition.expression, null, 2) : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAppMutation({
    mutationFn: (payload: ConditionInput) =>
      condition
        ? repositories.catalog.updateCondition(condition.id, payload)
        : repositories.catalog.createCondition(payload),
    invalidates: INVALIDATES,
    onSuccess: onDone,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let expression: ConditionInput["expression"];
    try {
      expression = JSON.parse(expressionText);
    } catch {
      setErrors({ expression: c.expressionInvalid });
      return;
    }

    const input: ConditionInput = {
      procedureId: targetType === "procedure" ? targetId || null : null,
      benefitId: targetType === "benefit" ? targetId || null : null,
      expression,
    };
    const parsed = conditionInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  const targets = targetType === "procedure" ? procedures : benefits;

  return (
    <Card>
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          <ErrorAlert message={save.errorMessage} />

          <Select
            value={targetType}
            onChange={(value) => {
              setTargetType(value as "procedure" | "benefit");
              setTargetId("");
            }}
          >
            <Label>{c.targetLabel}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="procedure" textValue={c.targetProcedure}>
                  {c.targetProcedure}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="benefit" textValue={c.targetBenefit}>
                  {c.targetBenefit}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Select value={targetId} onChange={(value) => setTargetId(value as string)}>
            <Label>{targetType === "procedure" ? c.targetProcedure : c.targetBenefit}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {targets.map((target) => (
                  <ListBox.Item key={target.id} id={target.id} textValue={target.title}>
                    {target.title}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <div className="flex flex-col gap-2">
            <Label htmlFor="condition-expression">{c.expressionLabel}</Label>
            <TextArea
              id="condition-expression"
              aria-label={c.expressionLabel}
              className="font-mono text-xs"
              placeholder={c.expressionPlaceholder}
              value={expressionText}
              onChange={(event) => setExpressionText(event.target.value)}
            />
            {errors["expression"] ? <FieldError>{errors["expression"]}</FieldError> : null}
          </div>
        </Card.Content>
        <Card.Footer className="flex gap-2">
          <Button type="submit" variant="primary" isPending={save.isPending} isDisabled={!targetId}>
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
