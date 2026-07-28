import { parseDate, type DateValue } from "@internationalized/date";
import { AlertDialog, Button, DateField, Label, ListBox, Select } from "@heroui/react";
import { timeWindowSchema, type TimeWindow } from "@sorento/domain";
import { adminContent } from "@/features/admin/content";

export const TIME_WINDOWS: TimeWindow[] = ["24h", "7d", "30d", "6m"];

export const TimeWindowSelect = ({
  value,
  onChange,
}: {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
}) => (
  <Select value={value} onChange={(v) => onChange(timeWindowSchema.parse(v))}>
    <Label>{adminContent.catalog.procedures.timeWindowLabel}</Label>
    <Select.Trigger>
      <Select.Value />
      <Select.Indicator />
    </Select.Trigger>
    <Select.Popover>
      <ListBox>
        {TIME_WINDOWS.map((timeWindow) => (
          <ListBox.Item
            key={timeWindow}
            id={timeWindow}
            textValue={adminContent.timeWindowLabels[timeWindow]}
          >
            {adminContent.timeWindowLabels[timeWindow]}
            <ListBox.ItemIndicator />
          </ListBox.Item>
        ))}
      </ListBox>
    </Select.Popover>
  </Select>
);

export const DeleteDialog = ({ label, onConfirm }: { label: string; onConfirm: () => void }) => (
  <AlertDialog>
    <Button variant="ghost" size="sm">
      {adminContent.catalog.deleteButton}
    </Button>
    <AlertDialog.Backdrop>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>{adminContent.catalog.deleteConfirmTitle}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>
              {adminContent.catalog.deleteConfirmDescription} ({label})
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary">
              Annuler
            </Button>
            <Button slot="close" variant="danger" onPress={onConfirm}>
              {adminContent.catalog.deleteConfirmButton}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </AlertDialog>
);

export const DateFieldPicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const dateValue: DateValue | null = value ? parseDate(value) : null;
  return (
    <DateField value={dateValue} onChange={(v) => v && onChange(v.toString())}>
      <Label>{label}</Label>
      <DateField.Group>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
      </DateField.Group>
    </DateField>
  );
};
