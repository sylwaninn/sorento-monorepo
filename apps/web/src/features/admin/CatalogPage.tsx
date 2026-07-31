import { adminContent } from "@/features/admin/content";
import { BenefitsTab } from "@/features/admin/catalog/BenefitsTab";
import { ConditionsTab } from "@/features/admin/catalog/ConditionsTab";
import { LetterTemplatesTab } from "@/features/admin/catalog/LetterTemplatesTab";
import { ProceduresTab } from "@/features/admin/catalog/ProceduresTab";
import { PageShell } from "@/layout/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const CatalogPage = () => (
  <PageShell backTo="/admin" title={adminContent.catalog.title}>
    {/* Uncontrolled tabs open on nothing without this: the panel is chosen by value, not by order. */}
    <Tabs defaultValue="procedures">
      <TabsList aria-label={adminContent.catalog.title}>
        <TabsTrigger value="procedures">{adminContent.catalog.tabs.procedures}</TabsTrigger>
        <TabsTrigger value="benefits">{adminContent.catalog.tabs.benefits}</TabsTrigger>
        <TabsTrigger value="conditions">{adminContent.catalog.tabs.conditions}</TabsTrigger>
        <TabsTrigger value="letterTemplates">
          {adminContent.catalog.tabs.letterTemplates}
        </TabsTrigger>
      </TabsList>
      <TabsContent className="pt-4" value="procedures">
        <ProceduresTab />
      </TabsContent>
      <TabsContent className="pt-4" value="benefits">
        <BenefitsTab />
      </TabsContent>
      <TabsContent className="pt-4" value="conditions">
        <ConditionsTab />
      </TabsContent>
      <TabsContent className="pt-4" value="letterTemplates">
        <LetterTemplatesTab />
      </TabsContent>
    </Tabs>
  </PageShell>
);
