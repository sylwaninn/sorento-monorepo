import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Checkbox,
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
import { benefitInputSchema, type Benefit, type BenefitInput } from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { InlineLoader } from "@/components/PageLoader";
import { adminContent } from "@/features/admin/content";
import { DateFieldPicker, DeleteDialog, TimeWindowSelect } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";

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

// The admin list and the list every dossier reads are two cache entries of the same data.
const INVALIDATES = [queryKeys.catalog.allBenefits(), queryKeys.catalog.benefits()];

export const BenefitsTab = () => {
  const [editing, setEditing] = useState<Benefit | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const benefitsQuery = useQuery({
    queryKey: queryKeys.catalog.allBenefits(),
    queryFn: () => repositories.catalog.listAllBenefits(),
  });

  const remove = useAppMutation({
    mutationFn: (id: string) => repositories.catalog.deleteBenefit(id),
    invalidates: INVALIDATES,
  });

  if (benefitsQuery.isPending) {
    return <InlineLoader />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Card.Content className="flex flex-col gap-3 py-4">
          {benefitsQuery.data && benefitsQuery.data.length > 0 ? (
            benefitsQuery.data.map((benefit) => (
              <div
                key={benefit.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Typography weight="medium">
                    {benefit.title}{" "}
                    {benefit.active ? "" : `(${adminContent.catalog.inactiveLabel})`}
                  </Typography>
                  <Typography type="body-sm" color="muted">
                    {benefit.code} — {benefit.organization}
                  </Typography>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setEditing(benefit);
                      setIsFormOpen(true);
                    }}
                  >
                    {adminContent.catalog.editButton}
                  </Button>
                  <DeleteDialog label={benefit.title} onConfirm={() => remove.mutate(benefit.id)} />
                </div>
              </div>
            ))
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              {adminContent.catalog.benefits.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
      </Card>

      {isFormOpen ? (
        <BenefitForm
          benefit={editing}
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

const BenefitForm = ({
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

          <TextField
            isRequired
            value={input.mainCondition}
            onChange={(v) => setInput({ ...input, mainCondition: v })}
            isInvalid={Boolean(errors["mainCondition"])}
          >
            <Label>{c.mainConditionLabel}</Label>
            <Input />
            {errors["mainCondition"] ? <FieldError>{errors["mainCondition"]}</FieldError> : null}
          </TextField>

          <TextField
            value={input.estimatedAmount ?? ""}
            onChange={(v) => setInput({ ...input, estimatedAmount: v || null })}
          >
            <Label>{c.estimatedAmountLabel}</Label>
            <Input />
          </TextField>

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
            isRequired
            value={input.formUrl}
            onChange={(v) => setInput({ ...input, formUrl: v })}
            isInvalid={Boolean(errors["formUrl"])}
          >
            <Label>{c.formUrlLabel}</Label>
            <Input type="url" />
            {errors["formUrl"] ? <FieldError>{errors["formUrl"]}</FieldError> : null}
          </TextField>

          <div className="flex flex-col gap-2">
            <Label htmlFor="benefit-caution">{c.cautionTextLabel}</Label>
            <TextArea
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
