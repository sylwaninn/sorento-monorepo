import { Link as RouterLink } from "react-router";
import { Tabs, Typography } from "@heroui/react";
import { sharedContent } from "@/components/content";
import { adminContent } from "@/features/admin/content";
import { BenefitsTab } from "@/features/admin/catalog/BenefitsTab";
import { ConditionsTab } from "@/features/admin/catalog/ConditionsTab";
import { LetterTemplatesTab } from "@/features/admin/catalog/LetterTemplatesTab";
import { ProceduresTab } from "@/features/admin/catalog/ProceduresTab";

export const CatalogPage = () => (
  <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
    <div className="flex items-center justify-between">
      <Typography.Heading level={1}>{adminContent.catalog.title}</Typography.Heading>
      <RouterLink className="link text-sm" to="/admin">
        {sharedContent.back}
      </RouterLink>
    </div>

    <Tabs>
      <Tabs.ListContainer>
        <Tabs.List aria-label={adminContent.catalog.title}>
          <Tabs.Tab id="procedures">
            {adminContent.catalog.tabs.procedures}
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="benefits">
            {adminContent.catalog.tabs.benefits}
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="conditions">
            {adminContent.catalog.tabs.conditions}
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="letterTemplates">
            {adminContent.catalog.tabs.letterTemplates}
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel className="pt-4" id="procedures">
        <ProceduresTab />
      </Tabs.Panel>
      <Tabs.Panel className="pt-4" id="benefits">
        <BenefitsTab />
      </Tabs.Panel>
      <Tabs.Panel className="pt-4" id="conditions">
        <ConditionsTab />
      </Tabs.Panel>
      <Tabs.Panel className="pt-4" id="letterTemplates">
        <LetterTemplatesTab />
      </Tabs.Panel>
    </Tabs>
  </div>
);
