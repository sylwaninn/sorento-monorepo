import { Alert } from "@heroui/react";

export interface ErrorAlertProps {
  /** Already translated for a human. Renders nothing when there is nothing to report. */
  message: string | null;
}

export const ErrorAlert = ({ message }: ErrorAlertProps) =>
  message === null ? null : (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
