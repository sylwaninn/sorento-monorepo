import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Procedure } from "@sorento/domain";
import { InlineLoader } from "@/components/PageLoader";
import { adminContent } from "@/features/admin/content";
import { DeleteDialog } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { ProcedureForm } from "@/features/admin/catalog/ProcedureForm";

// The admin list and the list every dossier reads are two cache entries of the same data.
export const INVALIDATES = [queryKeys.catalog.allProcedures(), queryKeys.catalog.procedures()];
export const ProceduresTab = () => {
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const proceduresQuery = useQuery({
    queryKey: queryKeys.catalog.allProcedures(),
    queryFn: () => repositories.catalog.listAllProcedures(),
  });
  const remove = useAppMutation({
    mutationFn: (id: string) => repositories.catalog.deleteProcedure(id),
    invalidates: INVALIDATES,
  });
  if (proceduresQuery.isPending) {
    return <InlineLoader />;
  }
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {proceduresQuery.data && proceduresQuery.data.length > 0 ? (
            proceduresQuery.data.map((procedure) => (
              <div
                key={procedure.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Text className="font-medium">
                    {procedure.title}{" "}
                    {procedure.active ? "" : `(${adminContent.catalog.inactiveLabel})`}
                  </Text>
                  <Text size="sm" tone="muted">
                    {procedure.code} · {procedure.organization}
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(procedure);
                      setIsFormOpen(true);
                    }}
                  >
                    {adminContent.catalog.editButton}
                  </Button>
                  <DeleteDialog
                    label={procedure.title}
                    onConfirm={() => remove.mutate(procedure.id)}
                  />
                </div>
              </div>
            ))
          ) : (
            <Text tone="muted" size="sm">
              {adminContent.catalog.procedures.empty}
            </Text>
          )}
        </CardContent>
      </Card>
      {isFormOpen ? (
        <ProcedureForm
          procedure={editing}
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
        <Button
          variant="default"
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
        >
          {adminContent.catalog.addButton}
        </Button>
      )}
    </div>
  );
};
