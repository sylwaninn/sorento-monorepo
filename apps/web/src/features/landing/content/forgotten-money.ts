export const forgottenMoneyContent = {
  title: "Des aides et des capitaux existent peut-être pour votre famille.",
  description:
    "Capital décès, pension de réversion, allocation de veuvage, aides pour les enfants, assurance-vie ou comptes inactifs : beaucoup restent non réclamés, faute d’être connus. Sorento vous indique les pistes pertinentes, leurs conditions et le service officiel à saisir.",
  items: [
    { id: "death-capital", name: "Capital décès", source: "Assurance Maladie" },
    { id: "survivor-pension", name: "Pension de réversion", source: "Info Retraite" },
    {
      id: "widowhood-allowance",
      name: "Allocation de veuvage",
      source: "Assurance retraite",
    },
    { id: "life-insurance", name: "Assurance-vie", source: "AGIRA" },
    { id: "inactive-accounts", name: "Comptes inactifs", source: "Ciclade" },
    {
      id: "family-support",
      name: "Allocation de soutien familial",
      source: "CAF",
    },
    { id: "job-centre-benefit", name: "Allocation décès", source: "France Travail" },
    {
      id: "beneficiary-annuity",
      name: "Rente d’ayant droit",
      source: "Assurance Maladie",
    },
  ],
  streamLabel: "Aides et capitaux à vérifier",
  cta: "Vérifier ce qui peut me concerner",
} as const;

export type ForgottenMoneyId = (typeof forgottenMoneyContent)["items"][number]["id"];
