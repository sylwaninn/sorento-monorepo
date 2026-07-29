import { rest } from "#e2e/support/backend";

/**
 * What the dossier workspace journey needs to know about the catalog before it can click.
 *
 * Procedure and benefit titles are catalog data, not application copy: they live in the database
 * rather than under apps/web/src, so mirrors(...) cannot compare them and a literal copied into
 * the journey would be a copy nothing guards. The journey therefore reads them back by `code`,
 * which supabase/seed.sql documents as the stable identifier, and then clicks on the title a user
 * would see. Nothing here writes anything: the user's own actions all go through the browser.
 */

interface ProcedureRow {
  id: string;
  title: string;
  source_url: string;
  last_verified_date: string;
}

interface BenefitRow {
  id: string;
  title: string;
  caution_text: string;
  source_url: string;
  last_verified_date: string;
}

export interface CatalogProcedure {
  id: string;
  title: string;
  sourceUrl: string;
  verifiedOn: string;
}

export interface CatalogBenefit {
  id: string;
  title: string;
  cautionText: string;
  verifiedOn: string;
}

/** The date format CatalogNotice renders, so a journey can assert the line a user reads. */
export const frenchDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`not an ISO date: ${isoDate}`);
  }
  return `${day}/${month}/${year}`;
};

const first = <T>(rows: T[], what: string): T => {
  const row = rows[0];
  if (row === undefined) throw new Error(`the catalog has no ${what}`);
  return row;
};

export const catalogProcedure = async (code: string): Promise<CatalogProcedure> => {
  const rows = await rest<ProcedureRow[]>(
    `/rest/v1/procedures?select=id,title,source_url,last_verified_date&code=eq.${code}`,
  );
  const row = first(rows, `procedure "${code}"`);
  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url,
    verifiedOn: frenchDate(row.last_verified_date),
  };
};

/** Every benefit in the catalog, so a journey can assert provenance on the ones it sees. */
export const catalogBenefits = async (): Promise<CatalogBenefit[]> => {
  const rows = await rest<BenefitRow[]>(
    "/rest/v1/benefits?select=id,title,caution_text,source_url,last_verified_date",
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    cautionText: row.caution_text,
    verifiedOn: frenchDate(row.last_verified_date),
  }));
};

/** The letter template's own title, which is also the name of the PDF the browser produces. */
export const letterTemplateTitle = async (procedureId: string): Promise<string> => {
  const rows = await rest<{ title: string }[]>(
    `/rest/v1/letter_templates?select=title&procedure_id=eq.${procedureId}`,
  );
  return first(rows, `letter template for procedure ${procedureId}`).title;
};

/**
 * A minimal but genuine PDF, built in memory. The repository refuses an empty file and the
 * bucket only accepts the declared mime types, so an arbitrary buffer would test the refusal
 * rather than the upload.
 */
export const smallPdf = (): Buffer =>
  Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n" +
      "trailer<</Root 1 0 R>>\n%%EOF\n",
    "utf8",
  );

/** The percentage the dashboard's progress line states, read back as a number. */
export const percentageIn = (progressLine: string): number => {
  const matched = /(\d+)\s*%/.exec(progressLine);
  if (matched === null || matched[1] === undefined) {
    throw new Error(`no percentage in "${progressLine}"`);
  }
  return Number(matched[1]);
};
