import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDialog, Button, Card, Typography } from "@heroui/react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { sharedContent } from "@/components/content";
import { accountContent } from "@/features/account/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { repositories } from "@/lib/repositories";

const downloadJson = (payload: unknown, fileName: string): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/** E13: portability and erasure, side by side, with the consequences stated before the act. */
export const AccountDataCard = () => {
  const navigate = useNavigate();

  const ownedDossiers = useQuery({
    queryKey: ["account", "owned-dossiers"],
    queryFn: () => repositories.account.ownedDossierCount(),
  });

  const exportData = useAppMutation({
    mutationFn: async () => {
      const payload = await repositories.account.exportData();
      downloadJson(payload, accountContent.dataExport.fileName);
    },
  });

  const deleteAccount = useAppMutation({
    mutationFn: () => repositories.account.deleteAccount(),
    onSuccess: () => navigate("/"),
  });

  const blocked = (ownedDossiers.data ?? 0) > 0;

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>{accountContent.dataExport.title}</Card.Title>
          <Card.Description>{accountContent.dataExport.description}</Card.Description>
        </Card.Header>
        <Card.Content>
          <ErrorAlert message={exportData.errorMessage} />
        </Card.Content>
        <Card.Footer>
          <Button
            variant="ghost"
            isPending={exportData.isPending}
            onPress={() => exportData.mutate(undefined)}
          >
            {accountContent.dataExport.button}
          </Button>
        </Card.Footer>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>{accountContent.deleteAccount.title}</Card.Title>
          <Card.Description>{accountContent.deleteAccount.description}</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {blocked ? (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  {accountContent.deleteAccount.ownedDossiersWarning}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          <ErrorAlert message={deleteAccount.errorMessage} />
        </Card.Content>
        <Card.Footer>
          <AlertDialog>
            <Button variant="danger" isDisabled={blocked || ownedDossiers.isPending}>
              {accountContent.deleteAccount.button}
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[420px]">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>
                      {accountContent.deleteAccount.confirmTitle}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    {/* The warning belongs before the irreversible action, not after it. */}
                    <Typography.Paragraph size="sm">
                      {accountContent.deleteAccount.confirmDescription}
                    </Typography.Paragraph>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="ghost">
                      {sharedContent.cancel}
                    </Button>
                    <Button
                      slot="close"
                      variant="danger"
                      isPending={deleteAccount.isPending}
                      onPress={() => deleteAccount.mutate(undefined)}
                    >
                      {accountContent.deleteAccount.confirmButton}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </Card.Footer>
      </Card>
    </>
  );
};
