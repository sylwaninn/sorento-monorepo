import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorAlert } from "@/components/ErrorAlert";
import { sharedContent } from "@/components/content";
import { accountContent } from "@/features/account/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
        <CardHeader>
          <CardTitle>{accountContent.dataExport.title}</CardTitle>
          <CardDescription>{accountContent.dataExport.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorAlert message={exportData.errorMessage} />
        </CardContent>
        <CardFooter>
          <Button
            variant="ghost"
            pending={exportData.isPending}
            onClick={() => exportData.mutate(undefined)}
          >
            {accountContent.dataExport.button}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{accountContent.deleteAccount.title}</CardTitle>
          <CardDescription>{accountContent.deleteAccount.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {blocked ? (
            <Alert variant="warning">
              <AlertIndicator />
              <AlertDescription>
                {accountContent.deleteAccount.ownedDossiersWarning}
              </AlertDescription>
            </Alert>
          ) : null}
          <ErrorAlert message={deleteAccount.errorMessage} />
        </CardContent>
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={blocked || ownedDossiers.isPending}>
                {accountContent.deleteAccount.button}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-105">
              <AlertDialogHeader>
                <AlertDialogTitle>{accountContent.deleteAccount.confirmTitle}</AlertDialogTitle>
              </AlertDialogHeader>
              {/* The warning belongs before the irreversible action, not after it. */}
              <AlertDialogDescription>
                {accountContent.deleteAccount.confirmDescription}
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>{sharedContent.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={deleteAccount.isPending}
                  onClick={() => deleteAccount.mutate(undefined)}
                >
                  {accountContent.deleteAccount.confirmButton}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </>
  );
};
