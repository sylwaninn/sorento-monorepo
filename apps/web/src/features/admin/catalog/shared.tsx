import { useId } from "react";
import { timeWindowSchema, type TimeWindow } from "@sorento/domain";
import { adminContent } from "@/features/admin/content";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sharedContent } from "@/components/content";

export const TIME_WINDOWS: TimeWindow[] = ["24h", "7d", "30d", "6m"];

export const TimeWindowSelect = ({
  value,
  onChange,
}: {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
}) => {
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{adminContent.catalog.procedures.timeWindowLabel}</FieldLabel>
      <Select value={value} onValueChange={(next) => onChange(timeWindowSchema.parse(next))}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_WINDOWS.map((timeWindow) => (
            <SelectItem key={timeWindow} value={timeWindow}>
              {adminContent.timeWindowLabels[timeWindow]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
};

export const DeleteDialog = ({ label, onConfirm }: { label: string; onConfirm: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm">
        {adminContent.catalog.deleteButton}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="sm:max-w-100">
      <AlertDialogHeader>
        <AlertDialogTitle>{adminContent.catalog.deleteConfirmTitle}</AlertDialogTitle>
        <AlertDialogDescription>
          {adminContent.catalog.deleteConfirmDescription} ({label})
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{sharedContent.cancel}</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>
          {adminContent.catalog.deleteConfirmButton}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
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
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </Field>
  );
};
