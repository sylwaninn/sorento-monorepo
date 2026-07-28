import { z } from "zod";
import { dossierStatusSchema } from "#domain/enums";

// Anonymized aggregate counts only: no dossier, user, or content identifiers. Matches
// get_admin_metrics() in the database, the one place the admin role reads across dossiers.
export const adminMetricsSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  totalDossiers: z.number().int().nonnegative(),
  dossiersByStatus: z.record(dossierStatusSchema, z.number().int().nonnegative()),
  activeTrustedContactDesignations: z.number().int().nonnegative(),
  trackingCompletionRatePercent: z.number().nonnegative(),
  activeCatalogProcedures: z.number().int().nonnegative(),
  activeCatalogBenefits: z.number().int().nonnegative(),
});
export type AdminMetrics = z.infer<typeof adminMetricsSchema>;
