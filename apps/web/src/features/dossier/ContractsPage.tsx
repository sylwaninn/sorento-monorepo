import { useState, type FormEvent } from "react";
import { useParams, Link as RouterLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, FieldError, Form, Input, Label, TextField, Typography } from "@heroui/react";
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
        <Typography.Heading level={1}>{dossierContent.contracts.title}</Typography.Heading>
        <RouterLink className="link text-sm" to={`/dossiers/${dossierId}`}>
          {sharedContent.back}
        </RouterLink>
      </div>

      <ErrorAlert message={remove.errorMessage} />

      <Card>
        <Card.Content className="flex flex-col gap-3 py-4">
          {contractsQuery.data && contractsQuery.data.length > 0 ? (
            contractsQuery.data.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Typography weight="medium">
                    {contract.contractType} · {contract.company}
                  </Typography>
                  {contract.contractNumber ? (
                    <Typography type="body-sm" color="muted">
                      {contract.contractNumber}
                    </Typography>
                  ) : null}
                  {contract.knownBeneficiaries ? (
                    <Typography type="body-sm" color="muted">
                      {contract.knownBeneficiaries}
                    </Typography>
                  ) : null}
                </div>
                {access.can("contracts:edit") ? (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setEditing(contract);
                        setIsFormOpen(true);
                      }}
                    >
                      {dossierContent.contracts.editButton}
                    </Button>
                    <Button variant="ghost" size="sm" onPress={() => remove.mutate(contract.id)}>
                      {dossierContent.contracts.deleteButton}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <Typography.Paragraph color="muted" size="sm">
              {dossierContent.contracts.empty}
            </Typography.Paragraph>
          )}
        </Card.Content>
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
          <Button variant="primary" onPress={() => setIsFormOpen(true)}>
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
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          <ErrorAlert message={save.errorMessage} />

          <TextField
            isRequired
            name="contractType"
            value={contractType}
            onChange={setContractType}
            isInvalid={Boolean(errors["contractType"])}
          >
            <Label>{dossierContent.contracts.typeLabel}</Label>
            <Input placeholder={dossierContent.contracts.typePlaceholder} />
            {errors["contractType"] ? <FieldError>{errors["contractType"]}</FieldError> : null}
          </TextField>

          <TextField
            isRequired
            name="company"
            value={company}
            onChange={setCompany}
            isInvalid={Boolean(errors["company"])}
          >
            <Label>{dossierContent.contracts.companyLabel}</Label>
            <Input />
            {errors["company"] ? <FieldError>{errors["company"]}</FieldError> : null}
          </TextField>

          <TextField name="contractNumber" value={contractNumber} onChange={setContractNumber}>
            <Label>{dossierContent.contracts.contractNumberLabel}</Label>
            <Input />
          </TextField>

          <TextField
            name="knownBeneficiaries"
            value={knownBeneficiaries}
            onChange={setKnownBeneficiaries}
          >
            <Label>{dossierContent.contracts.beneficiariesLabel}</Label>
            <Input />
          </TextField>
        </Card.Content>
        <Card.Footer className="flex gap-2">
          <Button type="submit" variant="primary" isPending={save.isPending}>
            {dossierContent.contracts.saveButton}
          </Button>
          <Button variant="ghost" onPress={onCancel}>
            {dossierContent.contracts.cancelButton}
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
};
