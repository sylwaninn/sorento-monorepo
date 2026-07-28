import type { Benefit, Procedure, TimeWindow, Tracking, TrackingStatus } from "@sorento/domain";
import type { CalendarDate } from "#core/calendar-date";
import { calculateDueDate } from "#core/deadlines";

/**
 * Tracking targets either a procedure or a benefit, never both. This normalises the two into
 * the single shape the journey screens render, carrying the catalog provenance every display
 * component is required to show (source, verification date, caution wording).
 */
export interface TrackableItem {
  kind: "procedure" | "benefit";
  id: string;
  title: string;
  organization: string;
  timeWindow: TimeWindow;
  delayDays: number | null;
  sourceUrl: string;
  lastVerifiedDate: CalendarDate;
  referenceProfession: string | null;
  /** Benefits carry the mandatory prudent wording; procedures state no entitlement. */
  cautionText: string | null;
}

export interface TrackedItem {
  tracking: Tracking;
  item: TrackableItem;
  dueDate: CalendarDate | null;
}

const fromProcedure = (procedure: Procedure): TrackableItem => ({
  kind: "procedure",
  id: procedure.id,
  title: procedure.title,
  organization: procedure.organization,
  timeWindow: procedure.timeWindow,
  delayDays: procedure.delayDays,
  sourceUrl: procedure.sourceUrl,
  lastVerifiedDate: procedure.lastVerifiedDate,
  referenceProfession: procedure.referenceProfession,
  cautionText: null,
});

const fromBenefit = (benefit: Benefit): TrackableItem => ({
  kind: "benefit",
  id: benefit.id,
  title: benefit.title,
  organization: benefit.organization,
  timeWindow: benefit.timeWindow,
  delayDays: null,
  sourceUrl: benefit.sourceUrl,
  lastVerifiedDate: benefit.lastVerifiedDate,
  referenceProfession: null,
  cautionText: benefit.cautionText,
});

export const buildTrackableItemsById = (
  procedures: readonly Procedure[],
  benefits: readonly Benefit[],
): Map<string, TrackableItem> =>
  new Map([
    ...procedures.map((procedure): [string, TrackableItem] => [
      procedure.id,
      fromProcedure(procedure),
    ]),
    ...benefits.map((benefit): [string, TrackableItem] => [benefit.id, fromBenefit(benefit)]),
  ]);

export const SETTLED_STATUSES: readonly TrackingStatus[] = ["done", "not_applicable"];

export const isSettled = (tracking: Tracking): boolean =>
  SETTLED_STATUSES.includes(tracking.status);

/**
 * Joins the tracking rows to their catalog entry and resolves each due date. Entries whose
 * catalog item has disappeared are dropped rather than rendered half-empty.
 */
export const buildTrackedItems = (
  trackingEntries: readonly Tracking[],
  itemsById: ReadonlyMap<string, TrackableItem>,
  deathDate: CalendarDate | null,
): TrackedItem[] =>
  trackingEntries.flatMap((tracking) => {
    const itemId = tracking.procedureId ?? tracking.benefitId;
    // Stryker disable next-line ConditionalExpression: equivalent mutant. The null branch only
    // satisfies the Map's string key type; get(null) would return undefined all the same, so
    // no test can distinguish the two.
    const item = itemId === null ? undefined : itemsById.get(itemId);
    if (!item) return [];

    return [
      {
        tracking,
        item,
        dueDate:
          tracking.dueDate ?? (deathDate === null ? null : calculateDueDate(item, deathDate)),
      },
    ];
  });
