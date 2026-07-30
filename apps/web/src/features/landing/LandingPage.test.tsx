import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { LandingPage } from "@/features/landing/LandingPage";
import { landingContent } from "@/features/landing/content";
import { landingPictures } from "@/features/landing/presentation";
import { sharedContent } from "@/components/content";
import { landingAnchor, publicPath } from "@/navigation";
import { renderWithProviders } from "@/test/render";
import { must } from "@/test/must";

describe("LandingPage", () => {
  it("carries the mandatory general-information notice", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(sharedContent.legalNotice)).toBeInTheDocument();
  });

  it("leads with the diagnostic, which is the single main call to action", () => {
    renderWithProviders(<LandingPage />);

    const cta = screen.getByRole("link", { name: landingContent.hero.cta });
    expect(cta).toHaveAttribute("href", publicPath.diagnostic);
  });

  it("presents the two product situations and routes both into the diagnostic", () => {
    renderWithProviders(<LandingPage />);

    for (const audience of landingContent.audiences.items) {
      expect(screen.getByText(audience.title)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: audience.cta })).toHaveAttribute(
        "href",
        publicPath.diagnostic,
      );
    }
  });

  it("links the three legal documents", () => {
    renderWithProviders(<LandingPage />);

    const { publicFooter } = sharedContent;
    expect(screen.getByRole("link", { name: publicFooter.legalNotice })).toHaveAttribute(
      "href",
      publicPath.legalNotice,
    );
    expect(screen.getByRole("link", { name: publicFooter.privacy })).toHaveAttribute(
      "href",
      publicPath.privacy,
    );
    expect(screen.getByRole("link", { name: publicFooter.terms })).toHaveAttribute(
      "href",
      publicPath.terms,
    );
  });

  // The header and the footer both link to sections declared elsewhere in the tree. Nothing in
  // the browser complains when one of those anchors stops existing: the click simply does
  // nothing. This walks the navigation and insists every destination is really on the page.
  it("lands every navigation link on a section that exists", () => {
    const { container } = renderWithProviders(<LandingPage />);

    for (const link of sharedContent.publicNavigation.links) {
      const id = landingAnchor[link.anchor];
      expect(container.querySelector(`#${id}`), `no section with id "${id}"`).not.toBeNull();

      for (const rendered of screen.getAllByRole("link", { name: link.label })) {
        expect(rendered.getAttribute("href")).toMatch(new RegExp(`#${id}$`));
      }
    }
  });

  it("states that no commission is taken on recovered sums", () => {
    renderWithProviders(<LandingPage />);

    // Found by what it says rather than by its position, and read through must so that
    // dropping the promise from the dictionary fails here by name instead of quietly
    // removing the only place the commitment is made.
    const noCommission = must(
      landingContent.reassurance.points.find((point) => /commission/i.test(point.title)),
      "the landing reassurance point about commission",
    );

    expect(screen.getByText(noCommission.title)).toBeInTheDocument();
    expect(screen.getByText(noCommission.description)).toBeInTheDocument();
  });

  it("answers the main questions before asking for an account", () => {
    renderWithProviders(<LandingPage />);

    for (const item of landingContent.faq.items) {
      expect(screen.getByRole("button", { name: item.question })).toBeInTheDocument();
    }
  });

  it("prioritizes the hero image and reserves its layout", () => {
    const { container } = renderWithProviders(<LandingPage />);
    const image = container.querySelector<HTMLImageElement>(
      '[data-slot="picture"][data-variant="hero"] img',
    );

    expect(image).not.toBeNull();
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    // Read from the catalog rather than written again here: the numbers reserve the box before
    // the photograph arrives, and a copy of them is a second place for them to be wrong.
    expect(image).toHaveAttribute("width", String(landingPictures.hero.width));
    expect(image).toHaveAttribute("height", String(landingPictures.hero.height));
    expect(image).toHaveAttribute("srcset");
  });

  it("defers the below-the-fold editorial image", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByAltText(landingContent.familyStory.images.mainAlt)).toHaveAttribute(
      "loading",
      "lazy",
    );
  });

  // The ring used to be a hand-drawn arc with its fraction hard-coded in the stylesheet, so the
  // drawing and the caption beside it could disagree. It is now driven by the same two numbers.
  it("draws the preview progress from the figures it prints", () => {
    renderWithProviders(<LandingPage />);
    const { progress } = landingContent.result.preview;

    const indicator = screen.getByRole("progressbar", { name: progress.ariaLabel });
    expect(indicator).toHaveAttribute("aria-valuenow", String(progress.completed));
    expect(indicator).toHaveAttribute("aria-valuemax", String(progress.total));
  });

  /**
   * The aid streams carry no pause control, so the only thing standing between a reader who
   * cannot take motion and a loop that never ends is the reduced-motion class on the track.
   * jsdom cannot run the animation, but it can insist the escape hatch is still declared.
   */
  it("leaves the aid animation an escape hatch for a reader who asks for less motion", () => {
    const { container } = renderWithProviders(<LandingPage />);
    const tracks = container.querySelectorAll('[data-slot="money-track"]');

    expect(tracks).toHaveLength(2);
    for (const track of tracks) {
      expect(track).toHaveClass("motion-reduce:animate-none");
    }
  });
});
