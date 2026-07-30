import type { QuestionDefinition } from "@sorento/core";
import type { AnswerValue } from "@sorento/domain";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { todayIso } from "@/lib/dates";

export interface QuestionContent {
  title: string;
  placeholder?: string;
  options?: Record<string, string>;
}

interface QuestionFieldProps {
  question: QuestionDefinition;
  content: QuestionContent;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue) => void;
}

interface ChoiceFieldProps {
  id: string;
  title: string;
  options: Record<string, string>;
  selected: string | undefined;
  error: string | undefined;
  onSelect: (option: string) => void;
}

const ChoiceField = ({ id, title, options, selected, error, onSelect }: ChoiceFieldProps) => (
  <Field>
    <FieldLabel htmlFor={id}>{title}</FieldLabel>
    <RadioGroup
      aria-invalid={Boolean(error)}
      id={id}
      name={id}
      onValueChange={onSelect}
      required
      value={selected ?? ""}
    >
      {Object.entries(options).map(([option, label]) => (
        <Field key={option} orientation="horizontal">
          <RadioGroupItem id={`${id}-${option}`} value={option} />
          <FieldLabel htmlFor={`${id}-${option}`}>{label}</FieldLabel>
        </Field>
      ))}
    </RadioGroup>
    {error ? <FieldError>{error}</FieldError> : null}
  </Field>
);

const BOOLEAN_OPTIONS = { true: "Oui", false: "Non" };

export const QuestionField = ({
  question,
  content,
  value,
  error,
  onChange,
}: QuestionFieldProps) => {
  switch (question.type) {
    case "number":
      return (
        <Field>
          <FieldLabel htmlFor={question.id}>{content.title}</FieldLabel>
          <Input
            aria-invalid={Boolean(error)}
            id={question.id}
            max={130}
            min={0}
            name={question.id}
            onChange={(event) => event.target.value !== "" && onChange(Number(event.target.value))}
            required
            type="number"
            value={typeof value === "number" ? value : ""}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      );

    case "date":
      return (
        <Field>
          <FieldLabel htmlFor={question.id}>{content.title}</FieldLabel>
          <Input
            aria-invalid={Boolean(error)}
            id={question.id}
            max={todayIso()}
            name={question.id}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            required
            type="date"
            value={typeof value === "string" ? value : ""}
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>jj/mm/aaaa</FieldDescription>
          )}
        </Field>
      );

    case "boolean":
      return (
        <ChoiceField
          error={error}
          id={question.id}
          onSelect={(option) => onChange(option === "true")}
          options={content.options ?? BOOLEAN_OPTIONS}
          selected={typeof value === "boolean" ? String(value) : undefined}
          title={content.title}
        />
      );

    case "single_choice":
      return (
        <ChoiceField
          error={error}
          id={question.id}
          onSelect={onChange}
          options={content.options ?? {}}
          selected={typeof value === "string" ? value : undefined}
          title={content.title}
        />
      );

    case "text":
    default:
      return (
        <Field>
          <FieldLabel htmlFor={question.id}>{content.title}</FieldLabel>
          <Input
            aria-invalid={Boolean(error)}
            id={question.id}
            name={question.id}
            onChange={(event) => onChange(event.target.value)}
            required
            value={String(value ?? "")}
            {...(content.placeholder !== undefined && { placeholder: content.placeholder })}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      );
  }
};
