import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";

export interface CautionNoticeProps {
  /**
   * The prudent wording carried by the catalog row ("les personnes dans une situation comme la
   * vôtre peuvent avoir droit à…"). Required and never defaulted: the UI must not be able to
   * state an entitlement of its own.
   */
  cautionText: string;
}

export const CautionNotice = ({ cautionText }: CautionNoticeProps) => (
  <Alert>
    <AlertIndicator />
    <AlertDescription>{cautionText}</AlertDescription>
  </Alert>
);
