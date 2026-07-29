import { Alert } from "@heroui/react";

export interface CautionNoticeProps {
  /**
   * The prudent wording carried by the catalog row ("les personnes dans une situation comme la
   * vôtre peuvent avoir droit à…"). Required and never defaulted: the UI must not be able to
   * state an entitlement of its own.
   */
  cautionText: string;
}

export const CautionNotice = ({ cautionText }: CautionNoticeProps) => (
  <Alert status="default">
    <Alert.Indicator />
    <Alert.Content>
      <Alert.Description>{cautionText}</Alert.Description>
    </Alert.Content>
  </Alert>
);
