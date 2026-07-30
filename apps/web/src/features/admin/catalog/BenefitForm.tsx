import { INVALIDATES } from "@/features/admin/catalog/BenefitsTab";
import { useState, type FormEvent } from "react";
import { benefitInputSchema, type Benefit, type BenefitInput } from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { adminContent } from "@/features/admin/content";
import { DateFieldPicker, TimeWindowSelect } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

const EMPTY_BENEFIT_INPUT: BenefitInput = {
  code: "",
  title: "",
  mainCondition: "",
  estimatedAmount: null,
  organization: "",
  formUrl: "",
  cautionText: "",
  timeWindow: "30d",
  sourceUrl: "",
  lastVerifiedDate: new Date().toISOString().slice(0, 10),
  active: true,
};

export const BenefitForm = ({
  benefit,
  onDone,
  onCancel,
}: {
  benefit: Benefit | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const c = adminContent.catalog.benefits;
  const [input, setInput] = useState<BenefitInput>(
    benefit
      ? {
          code: benefit.code,
          title: benefit.title,
          mainCondition: benefit.mainCondition,
          estimatedAmount: benefit.estimatedAmount,
          organization: benefit.organization,
          formUrl: benefit.formUrl,
          cautionText: benefit.cautionText,
          timeWindow: benefit.timeWindow,
          sourceUrl: benefit.sourceUrl,
          lastVerifiedDate: benefit.lastVerifiedDate,
          active: benefit.active,
        }
      : EMPTY_BENEFIT_INPUT,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAppMutation({
    mutationFn: (payload: BenefitInput) =>
      benefit
        ? repositories.catalog.updateBenefit(benefit.id, payload)
        : repositories.catalog.createBenefit(payload),
    invalidates: INVALIDATES,
    onSuccess: onDone,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = benefitInputSchema.safeParse(input);
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

          <Field>
            <FieldLabel htmlFor="mainCondition">{c.mainConditionLabel}</FieldLabel>
            <Input
              id="mainCondition"
              required
              value={input.mainCondition}
              onChange={(event) => setInput({ ...input, mainCondition: event.target.value })}
              aria-invalid={Boolean(errors["mainCondition"])}
            />
            {errors["mainCondition"] ? <FieldError>{errors["mainCondition"]}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="estimatedAmount">{c.estimatedAmountLabel}</FieldLabel>
            <Input
              id="estimatedAmount"
              value={input.estimatedAmount ?? ""}
              onChange={(event) =>
                setInput({ ...input, estimatedAmount: event.target.value || null })
              }
            />
          </Field>

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
            <FieldLabel htmlFor="formUrl">{c.formUrlLabel}</FieldLabel>
            <Input
              id="formUrl"
              required
              value={input.formUrl}
              onChange={(event) => setInput({ ...input, formUrl: event.target.value })}
              aria-invalid={Boolean(errors["formUrl"])}
              type="url"
            />
            {errors["formUrl"] ? <FieldError>{errors["formUrl"]}</FieldError> : null}
          </Field>

          <div className="flex flex-col gap-2">
            <Label htmlFor="benefit-caution">{c.cautionTextLabel}</Label>
            <Textarea
              id="benefit-caution"
              aria-label={c.cautionTextLabel}
              value={input.cautionText}
              onChange={(event) => setInput({ ...input, cautionText: event.target.value })}
            />
            {errors["cautionText"] ? <FieldError>{errors["cautionText"]}</FieldError> : null}
          </div>

          <TimeWindowSelect
            value={input.timeWindow}
            onChange={(timeWindow) => setInput({ ...input, timeWindow })}
          />

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
