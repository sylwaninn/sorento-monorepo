import {
  DateField,
  Description,
  FieldError,
  Input,
  Label,
  NumberField,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";
import type { QuestionDefinition } from "@sorento/core";
import type { AnswerValue } from "@sorento/domain";

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

export const QuestionField = ({
  question,
  content,
  value,
  error,
  onChange,
}: QuestionFieldProps) => {
  switch (question.type) {
    case "text":
      return (
        <TextField
          isRequired
          name={question.id}
          value={String(value ?? "")}
          onChange={onChange}
          isInvalid={Boolean(error)}
        >
          <Label>{content.title}</Label>
          <Input {...(content.placeholder !== undefined && { placeholder: content.placeholder })} />
          {error ? <FieldError>{error}</FieldError> : null}
        </TextField>
      );

    case "number":
      return (
        <NumberField
          isRequired
          name={question.id}
          minValue={0}
          maxValue={130}
          {...(typeof value === "number" && { value })}
          onChange={(v) => v !== undefined && onChange(v)}
          isInvalid={Boolean(error)}
        >
          <Label>{content.title}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input />
            <NumberField.IncrementButton />
          </NumberField.Group>
          {error ? <FieldError>{error}</FieldError> : null}
        </NumberField>
      );

    case "date": {
      const dateValue: DateValue | null =
        typeof value === "string" && value ? parseDate(value) : null;
      return (
        <DateField
          isRequired
          name={question.id}
          maxValue={today(getLocalTimeZone())}
          value={dateValue}
          onChange={(v) => v && onChange(v.toString())}
          isInvalid={Boolean(error)}
        >
          <Label>{content.title}</Label>
          <DateField.Group>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>
          {error ? <FieldError>{error}</FieldError> : <Description>jj/mm/aaaa</Description>}
        </DateField>
      );
    }

    case "boolean": {
      const options = content.options ?? { true: "Oui", false: "Non" };
      return (
        <RadioGroup
          isRequired
          name={question.id}
          value={typeof value === "boolean" ? String(value) : null}
          onChange={(v) => onChange(v === "true")}
          isInvalid={Boolean(error)}
        >
          <Label>{content.title}</Label>
          {Object.entries(options).map(([optionValue, label]) => (
            <Radio key={optionValue} value={optionValue}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {label}
              </Radio.Content>
            </Radio>
          ))}
          {error ? <FieldError>{error}</FieldError> : null}
        </RadioGroup>
      );
    }

    case "single_choice":
    default: {
      const options = content.options ?? {};
      return (
        <RadioGroup
          isRequired
          name={question.id}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          isInvalid={Boolean(error)}
        >
          <Label>{content.title}</Label>
          {Object.entries(options).map(([optionValue, label]) => (
            <Radio key={optionValue} value={optionValue}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {label}
              </Radio.Content>
            </Radio>
          ))}
          {error ? <FieldError>{error}</FieldError> : null}
        </RadioGroup>
      );
    }
  }
};
