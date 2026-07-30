import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// The admin list and the list every dossier reads are two cache entries of the same data.
const INVALIDATES = [queryKeys.catalog.conditions()];

const targetTypeSchema = z.enum(["procedure", "benefit"]);

export const ConditionsTab = () => {
  const [editing, setEditing] = useState<Condition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const conditionsQuery = useQuery({
    queryKey: queryKeys.catalog.conditions(),
    queryFn: () => repositories.catalog.listConditions(),
  });
  const proceduresQuery = useQuery({
    queryKey: queryKeys.catalog.allProcedures(),
    queryFn: () => repositories.catalog.listAllProcedures(),
  });
  const benefitsQuery = useQuery({
    queryKey: queryKeys.catalog.allBenefits(),
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
        <CardContent className="flex flex-col gap-3 py-4">
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
                    <Text className="font-medium">
                      {condition.procedureId
                        ? adminContent.catalog.conditions.targetProcedure
                        : adminContent.catalog.conditions.targetBenefit}{" "}
                      : {targetLabel}
                    </Text>
                    <span className="text-muted max-w-md truncate text-sm">
                      {JSON.stringify(condition.expression)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
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
            <Text tone="muted" size="sm">
              {adminContent.catalog.conditions.empty}
            </Text>
          )}
        </CardContent>
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
  // The trigger is what carries the name, so the visible label has to point at it.
  const targetTypeFieldId = useId();
  const targetFieldId = useId();

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
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <ErrorAlert message={save.errorMessage} />

          <Select
            value={targetType}
            onValueChange={(value) => {
              setTargetType(targetTypeSchema.parse(value));
              setTargetId("");
            }}
          >
            <Label htmlFor={targetTypeFieldId}>{c.targetLabel}</Label>
            <SelectTrigger id={targetTypeFieldId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="procedure" textValue={c.targetProcedure}>
                {c.targetProcedure}
              </SelectItem>
              <SelectItem value="benefit" textValue={c.targetBenefit}>
                {c.targetBenefit}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={targetId} onValueChange={(value) => setTargetId(String(value))}>
            <Label htmlFor={targetFieldId}>
              {targetType === "procedure" ? c.targetProcedure : c.targetBenefit}
            </Label>
            <SelectTrigger id={targetFieldId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((target) => (
                <SelectItem key={target.id} value={target.id} textValue={target.title}>
                  {target.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-2">
            <Label htmlFor="condition-expression">{c.expressionLabel}</Label>
            <Textarea
              id="condition-expression"
              aria-label={c.expressionLabel}
              className="font-mono text-xs"
              placeholder={c.expressionPlaceholder}
              value={expressionText}
              onChange={(event) => setExpressionText(event.target.value)}
            />
            {errors["expression"] ? <FieldError>{errors["expression"]}</FieldError> : null}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" variant="default" pending={save.isPending} disabled={!targetId}>
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
