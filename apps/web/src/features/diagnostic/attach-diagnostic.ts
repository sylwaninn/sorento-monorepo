import { applicableProcedures, isDiagnosticComplete } from "@sorento/core";
import {
  AnswerRepository,
  CatalogRepository,
  DossierRepository,
  TrackingRepository,
} from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";
import {
  clearAnswersFromSession,
  loadAnswersFromSession,
} from "@/features/diagnostic/diagnostic-session";

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { firstName: trimmed || "Dossier", lastName: "-" };
  return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) };
};

// Turns a completed anonymous diagnostic (kept in sessionStorage) into a real dossier for
// the now-authenticated user: creates the dossier, persists the raw answers, and seeds
// tracking rows for every applicable procedure.
export const attachDiagnosticFromSession = async (): Promise<string | null> => {
  const answers = loadAnswersFromSession();
  if (!isDiagnosticComplete(answers)) return null;

  const { firstName, lastName } = splitFullName(String(answers["fullName"] ?? ""));
  const dossierRepository = new DossierRepository(supabase);
  const dossier = await dossierRepository.create({
    subjectFirstName: firstName,
    subjectLastName: lastName,
    status: "PREPARATION",
  });

  if (answers["mode"] === "death" && typeof answers["deathDate"] === "string") {
    await dossierRepository.activate(dossier.id, answers["deathDate"]);
  }

  await new AnswerRepository(supabase).save(dossier.id, answers);

  const catalogRepository = new CatalogRepository(supabase);
  const [procedures, conditions] = await Promise.all([
    catalogRepository.listProcedures(),
    catalogRepository.listConditions(),
  ]);
  const applicable = applicableProcedures(procedures, conditions, answers);

  const trackingRepository = new TrackingRepository(supabase);
  await Promise.all(
    applicable.map((procedure) => trackingRepository.createForProcedure(dossier.id, procedure.id)),
  );

  clearAnswersFromSession();
  return dossier.id;
};
