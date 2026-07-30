import { linkVariants } from "@/components/ui/link";
import { useState, type FormEvent } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { contractInputSchema, type Contract, type ContractInput } from "@sorento/domain";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { sharedContent } from "@/components/content";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { fieldErrors } from "@/lib/zod-form-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

export const ContractsPage = () => {
  const { dossierId = "" } = useParams();
  const access = useDossier(dossierId);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const contractsQuery = useQuery({
    queryKey: queryKeys.dossiers.contracts(dossierId),
    queryFn: () => repositories.contracts.listForDossier(dossierId),
  });

  const remove = useAppMutation({
    mutationFn: (contractId: string) => repositories.contracts.delete(contractId),
    invalidates: [queryKeys.dossiers.contracts(dossierId)],
  });

  if (access.isLoading || contractsQuery.isPending) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
      <div className="flex items-center justify-between">
        <Heading level={1}>{dossierContent.contracts.title}</Heading>
        <RouterLink className={linkVariants()} to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <ErrorAlert message={remove.errorMessage} />

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {contractsQuery.data && contractsQuery.data.length > 0 ? (
            contractsQuery.data.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Text className="font-medium">
                    {contract.contractType} · {contract.company}
                  </Text>
                  {contract.contractNumber ? (
                    <Text size="sm" tone="muted">
                      {contract.contractNumber}
                    </Text>
                  ) : null}
                  {contract.knownBeneficiaries ? (
                    <Text size="sm" tone="muted">
                      {contract.knownBeneficiaries}
                    </Text>
                  ) : null}
                </div>
                {access.can("contracts:edit") ? (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(contract);
                        setIsFormOpen(true);
                      }}
                    >
                      {dossierContent.contracts.editButton}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate(contract.id)}>
                      {dossierContent.contracts.deleteButton}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <Text tone="muted" size="sm">
              {dossierContent.contracts.empty}
            </Text>
          )}
        </CardContent>
      </Card>

      {access.can("contracts:edit") ? (
        isFormOpen ? (
          <ContractForm
            dossierId={dossierId}
            contract={editing}
            onDone={() => {
              setIsFormOpen(false);
              setEditing(null);
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setEditing(null);
            }}
          />
        ) : (
          <Button variant="default" onClick={() => setIsFormOpen(true)}>
            {dossierContent.contracts.addButton}
          </Button>
        )
      ) : null}
    </div>
  );
};

const ContractForm = ({
  dossierId,
  contract,
  onDone,
  onCancel,
}: {
  dossierId: string;
  contract: Contract | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const [contractType, setContractType] = useState(contract?.contractType ?? "");
  const [company, setCompany] = useState(contract?.company ?? "");
  const [contractNumber, setContractNumber] = useState(contract?.contractNumber ?? "");
  const [knownBeneficiaries, setKnownBeneficiaries] = useState(contract?.knownBeneficiaries ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAppMutation({
    mutationFn: (input: ContractInput) =>
      contract
        ? repositories.contracts.update(contract.id, input)
        : repositories.contracts.create(dossierId, input),
    invalidates: [queryKeys.dossiers.contracts(dossierId)],
    onSuccess: onDone,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = contractInputSchema.safeParse({
      contractType,
      company,
      contractNumber: contractNumber || undefined,
      knownBeneficiaries: knownBeneficiaries || undefined,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <ErrorAlert message={save.errorMessage} />

          <Field>
            <FieldLabel htmlFor="contractType">{dossierContent.contracts.typeLabel}</FieldLabel>
            <Input
              id="contractType"
              name="contractType"
              required
              value={contractType}
              onChange={(event) => setContractType(event.target.value)}
              aria-invalid={Boolean(errors["contractType"])}
              placeholder={dossierContent.contracts.typePlaceholder}
            />
            {errors["contractType"] ? <FieldError>{errors["contractType"]}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="company">{dossierContent.contracts.companyLabel}</FieldLabel>
            <Input
              id="company"
              name="company"
              required
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              aria-invalid={Boolean(errors["company"])}
            />
            {errors["company"] ? <FieldError>{errors["company"]}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="contractNumber">
              {dossierContent.contracts.contractNumberLabel}
            </FieldLabel>
            <Input
              id="contractNumber"
              name="contractNumber"
              value={contractNumber}
              onChange={(event) => setContractNumber(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="knownBeneficiaries">
              {dossierContent.contracts.beneficiariesLabel}
            </FieldLabel>
            <Input
              id="knownBeneficiaries"
              name="knownBeneficiaries"
              value={knownBeneficiaries}
              onChange={(event) => setKnownBeneficiaries(event.target.value)}
            />
          </Field>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" variant="default" pending={save.isPending}>
            {dossierContent.contracts.saveButton}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {dossierContent.contracts.cancelButton}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
