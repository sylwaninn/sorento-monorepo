import { PageShell } from "@/layout/PageShell";
import { useRef } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ALLOWED_MIME_TYPES } from "@sorento/domain";
import { useAuth } from "@/auth/useAuth";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PageLoader } from "@/components/PageLoader";
import { dossierContent } from "@/features/dossier/content";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useDossier } from "@/hooks/use-dossier";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";

const DEFAULT_CATEGORY = "general";

export const DocumentsPage = () => {
  const { dossierId = "" } = useParams();
  const { user } = useAuth();
  const access = useDossier(dossierId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const documentsQuery = useQuery({
    queryKey: queryKeys.dossiers.documents(dossierId),
    queryFn: () => repositories.documents.listForDossier(dossierId),
  });

  const invalidates = [
    queryKeys.dossiers.documents(dossierId),
    queryKeys.dossiers.activity(dossierId),
  ];

  const upload = useAppMutation({
    mutationFn: (file: File) => {
      if (!user) throw new Error("unauthenticated");
      return repositories.documents.upload(dossierId, DEFAULT_CATEGORY, file, user.id);
    },
    invalidates,
  });

  const remove = useAppMutation({
    mutationFn: (documentId: string) => repositories.documents.softDelete(documentId),
    invalidates,
  });

  // Files are never public: each download resolves a short-lived signed URL on demand.
  const download = useAppMutation({
    mutationFn: async ({
      storagePath,
      originalName,
    }: {
      storagePath: string;
      originalName: string;
    }) => {
      // The name has to be signed into the URL: storage answers from another origin, where the
      // anchor's own download attribute is ignored and the file lands as a bare uuid.
      const url = await repositories.documents.getSignedUrl(storagePath, 60, originalName);
      const link = document.createElement("a");
      link.href = url;
      link.download = originalName;
      link.click();
    },
  });

  if (access.isLoading || documentsQuery.isPending) return <PageLoader />;

  const documents = documentsQuery.data ?? [];
  const canAdd = access.can("documents:add");

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) upload.mutate(file);
  };

  return (
    <PageShell backTo={`/dossiers/${dossierId}`} title={dossierContent.documents.title}>
      <Alert>
        <AlertIndicator />
        <AlertDescription>{dossierContent.documents.notice}</AlertDescription>
      </Alert>

      <ErrorAlert message={upload.errorMessage ?? remove.errorMessage ?? download.errorMessage} />

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {documents.length === 0 ? (
            <Text tone="muted" size="sm">
              {dossierContent.documents.empty}
            </Text>
          ) : (
            documents.map((document_) => (
              <div
                key={document_.id}
                className="flex items-center justify-between gap-3 border-b pb-2 text-sm"
              >
                <div className="flex flex-col">
                  <span>{document_.originalName}</span>
                  <Text tone="muted">
                    {document_.category} · {dossierContent.documents.addedBy}{" "}
                    {access.firstNameOf(document_.addedBy)}
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      download.mutate({
                        storagePath: document_.storagePath,
                        originalName: document_.originalName,
                      })
                    }
                  >
                    {dossierContent.documents.downloadButton}
                  </Button>
                  {/* Owners remove anything; a collaborator only what they added themselves. */}
                  {access.can("documents:deleteAny") ||
                  (access.can("documents:deleteOwn") && document_.addedBy === user?.id) ? (
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate(document_.id)}>
                      {dossierContent.documents.deleteButton}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canAdd ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(",")}
            className="hidden"
            onChange={onFileSelected}
          />
          <Button
            variant="default"
            pending={upload.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {dossierContent.documents.uploadButton}
          </Button>
        </>
      ) : null}
    </PageShell>
  );
};
