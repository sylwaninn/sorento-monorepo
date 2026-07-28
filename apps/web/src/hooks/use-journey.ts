import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  buildTrackableItemsById,
  buildTrackedItems,
  completionPercentage,
  focusItems,
  groupByTimeWindow,
  isSettled,
  isTimeWindowSettled,
  nextDueDate,
  toCalendarDate,
  type CalendarDate,
  type TimeWindowGroup,
  type TrackedItem,
} from "@sorento/core";
import type { Dossier } from "@sorento/domain";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";

export interface JourneyGroup extends TimeWindowGroup<TrackedItem> {
  /** Fully handled windows fold away with a reassuring message instead of a red list. */
  settled: boolean;
}

export interface Journey {
  isLoading: boolean;
  items: TrackedItem[];
  groups: JourneyGroup[];
  /** Two or three items at most: never the wall of thirty tasks. */
  focus: TrackedItem[];
  nextDueDate: CalendarDate | null;
  completionPercentage: number;
  today: CalendarDate;
  /**
   * Comments per procedure. Not "unread": V1 stores no per-user read marker, so the badge
   * states the discussion volume rather than pretending to know what you have seen.
   */
  commentCountByProcedureId: Map<string, number>;
}

/**
 * The journey of a dossier, assembled: tracking rows joined to the catalog, due dates resolved
 * against the death date, then grouped, prioritised and summarised by packages/core. The
 * screens receive a finished result and decide nothing about eligibility or deadlines.
 */
export const useJourney = (
  dossierId: string,
  dossier: Dossier | null,
  assignedTo?: string | null,
): Journey => {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.dossiers.tracking(dossierId),
        queryFn: () => repositories.tracking.listForDossier(dossierId),
        enabled: dossierId !== "",
      },
      {
        queryKey: queryKeys.catalog.procedures(),
        queryFn: () => repositories.catalog.listProcedures(),
      },
      {
        queryKey: queryKeys.catalog.benefits(),
        queryFn: () => repositories.catalog.listBenefits(),
      },
      {
        queryKey: queryKeys.dossiers.comments(dossierId),
        queryFn: () => repositories.comments.listForDossier(dossierId),
        enabled: dossierId !== "",
      },
    ],
  });

  const [trackingQuery, proceduresQuery, benefitsQuery, commentsQuery] = results;
  const isLoading = results.some((result) => result.isPending);

  // Injected clock: core never reads the current time itself.
  const today = toCalendarDate(new Date());

  return useMemo(() => {
    const itemsById = buildTrackableItemsById(
      proceduresQuery?.data ?? [],
      benefitsQuery?.data ?? [],
    );
    const allItems = buildTrackedItems(
      trackingQuery?.data ?? [],
      itemsById,
      dossier?.deathDate ?? null,
    );
    const items =
      assignedTo === undefined || assignedTo === null
        ? allItems
        : allItems.filter((entry) => entry.tracking.assignedTo === assignedTo);

    const groups = groupByTimeWindow(
      items.map((entry) => ({
        ...entry,
        timeWindow: entry.item.timeWindow,
        delayDays: entry.item.delayDays,
      })),
    ).map((group): JourneyGroup => ({
      ...group,
      settled: isTimeWindowSettled(group, (entry) => isSettled(entry.tracking)),
    }));

    const commentCountByProcedureId = new Map<string, number>();
    for (const comment of commentsQuery?.data ?? []) {
      if (comment.procedureId === null || comment.deletedAt !== null) continue;
      commentCountByProcedureId.set(
        comment.procedureId,
        (commentCountByProcedureId.get(comment.procedureId) ?? 0) + 1,
      );
    }

    return {
      isLoading,
      items,
      groups,
      focus: focusItems({
        items,
        isDone: (entry) => isSettled(entry.tracking),
        dueDateOf: (entry) => entry.dueDate,
      }),
      nextDueDate: nextDueDate(
        items,
        (entry) => isSettled(entry.tracking),
        (entry) => entry.dueDate,
      ),
      // Progress is measured on the whole dossier, not the filtered view.
      completionPercentage: completionPercentage(allItems, (entry) => isSettled(entry.tracking)),
      today,
      commentCountByProcedureId,
    };
  }, [
    trackingQuery?.data,
    proceduresQuery?.data,
    benefitsQuery?.data,
    commentsQuery?.data,
    dossier?.deathDate,
    assignedTo,
    isLoading,
    today,
  ]);
};
