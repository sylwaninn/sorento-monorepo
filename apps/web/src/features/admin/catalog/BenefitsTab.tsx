import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Benefit } from "@sorento/domain";
import { InlineLoader } from "@/components/PageLoader";
import { adminContent } from "@/features/admin/content";
import { DeleteDialog } from "@/features/admin/catalog/shared";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { queryKeys } from "@/lib/query-keys";
import { repositories } from "@/lib/repositories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { BenefitForm } from "@/features/admin/catalog/BenefitForm";

// The admin list and the list every dossier reads are two cache entries of the same data.
export const INVALIDATES = [queryKeys.catalog.allBenefits(), queryKeys.catalog.benefits()];
export const BenefitsTab = () => {
  const [editing, setEditing] = useState<Benefit | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const benefitsQuery = useQuery({
    queryKey: queryKeys.catalog.allBenefits(),
    queryFn: () => repositories.catalog.listAllBenefits(),
  });
  const remove = useAppMutation({
    mutationFn: (id: string) => repositories.catalog.deleteBenefit(id),
    invalidates: INVALIDATES,
  });
  if (benefitsQuery.isPending) {
    return <InlineLoader />;
  }
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          {benefitsQuery.data && benefitsQuery.data.length > 0 ? (
            benefitsQuery.data.map((benefit) => (
              <div
                key={benefit.id}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="flex flex-col">
                  <Text className="font-medium">
                    {benefit.title}{" "}
                    {benefit.active ? "" : `(${adminContent.catalog.inactiveLabel})`}
                  </Text>
                  <Text size="sm" tone="muted">
                    {benefit.code} · {benefit.organization}
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(benefit);
                      setIsFormOpen(true);
                    }}
                  >
                    {adminContent.catalog.editButton}
                  </Button>
                  <DeleteDialog label={benefit.title} onConfirm={() => remove.mutate(benefit.id)} />
                </div>
              </div>
            ))
          ) : (
            <Text tone="muted" size="sm">
              {adminContent.catalog.benefits.empty}
            </Text>
          )}
        </CardContent>
      </Card>
      {isFormOpen ? (
        <BenefitForm
          benefit={editing}
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
