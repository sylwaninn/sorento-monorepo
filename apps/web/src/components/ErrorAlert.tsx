import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";

export interface ErrorAlertProps {
  /** Already translated for a human. Renders nothing when there is nothing to report. */
  message: string | null;
}

export const ErrorAlert = ({ message }: ErrorAlertProps) =>
  message === null ? null : (
    <Alert variant="destructive">
      <AlertIndicator />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
