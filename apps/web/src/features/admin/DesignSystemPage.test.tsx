import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { DesignSystemPage } from "@/features/admin/DesignSystemPage";
import { adminContent } from "@/features/admin/content";
import { renderWithProviders } from "@/test/render";

describe("DesignSystemPage", () => {
  it("documents shared components and all their supported visual intentions", () => {
    const { container } = renderWithProviders(<DesignSystemPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: adminContent.designSystem.title }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="public-action"]')).toHaveLength(4);
    expect(container.querySelectorAll('#design-system-cards [data-slot="card"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-slot="icon-badge"]')).toHaveLength(3);

    for (const label of Object.values(adminContent.designSystem.alerts)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
