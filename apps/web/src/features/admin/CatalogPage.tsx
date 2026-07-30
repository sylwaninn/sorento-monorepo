import { linkVariants } from "@/components/ui/link";
import { Link as RouterLink } from "react-router";
import { sharedContent } from "@/components/content";
import { adminContent } from "@/features/admin/content";
import { BenefitsTab } from "@/features/admin/catalog/BenefitsTab";
import { ConditionsTab } from "@/features/admin/catalog/ConditionsTab";
import { LetterTemplatesTab } from "@/features/admin/catalog/LetterTemplatesTab";
import { ProceduresTab } from "@/features/admin/catalog/ProceduresTab";
import { Heading } from "@/components/ui/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const CatalogPage = () => (
  <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
    <div className="flex items-center justify-between">
      <Heading level={1}>{adminContent.catalog.title}</Heading>
      <RouterLink className={linkVariants()} to="/admin">
        {sharedContent.back}
      </RouterLink>
    </div>

    <Tabs>
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
  </div>
);
