import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sharedContent } from "@/components/content";
import { useLandingHeader } from "@/features/landing/use-landing-header";
import { landingAnchor } from "@/navigation";
import { must } from "@/test/must";

const { links } = sharedContent.publicNavigation;
const firstAnchor = must(links[0], "the first public navigation link").anchor;

/** Where the top of each section sits in the viewport, keyed by the DOM id it carries. */
const sectionTops = new Map<string, number>();
/** Where the bottom of the header's own action sits. Above zero means still on screen. */
let actionBottom = 40;
let pendingFrames: FrameRequestCallback[] = [];

const Probe = () => {
  const { activeAnchor, hasScrolled, isActionOutOfView, actionRef, blurRef } = useLandingHeader();

  return (
    <div>
      <div
        data-action-out={isActionOutOfView}
        data-anchor={activeAnchor}
        data-scrolled={hasScrolled}
        data-testid="state"
      />
      <div ref={actionRef} data-testid="action" />
      <div ref={blurRef} data-testid="blur" />
      {links.map((link) => (
        <section key={link.anchor} id={landingAnchor[link.anchor]} />
      ))}
    </div>
  );
};

const state = () => screen.getByTestId("state");

const rectStub = (values: Partial<DOMRect>): DOMRect =>
  ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...values,
  }) as DOMRect;

/**
 * jsdom lays nothing out, so every rectangle reads as zero and every section would answer "I am
 * at the top of the screen". The two things the hook measures are answered from the fixtures
 * above instead: a section by the id it carries, the header's action by having none.
 */
const stubLayout = () => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ): DOMRect {
    if (this.id === "") return rectStub({ bottom: actionBottom });
    return rectStub({ top: sectionTops.get(this.id) ?? Number.POSITIVE_INFINITY });
  });
};

const setDocumentHeight = (scrollHeight: number) => {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
};

const scrollTo = (scrollY: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
};

/** The band is painted in an animation frame, so nothing is written until one is run. */
const paintFrames = () => {
  const frames = pendingFrames;
  pendingFrames = [];
  act(() => {
    for (const frame of frames) frame(0);
  });
};

const blurRadius = () => screen.getByTestId("blur").style.getPropertyValue("--header-blur");

beforeEach(() => {
  sectionTops.clear();
  actionBottom = 40;
  pendingFrames = [];
  setDocumentHeight(5_000);
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => {
    pendingFrames.push(frame);
    return pendingFrames.length;
  });
  stubLayout();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLandingHeader", () => {
  it("opens on the first section, with no shadow and no blur", () => {
    render(<Probe />);
    paintFrames();

    expect(state()).toHaveAttribute("data-anchor", firstAnchor);
    expect(state()).toHaveAttribute("data-scrolled", "false");
    expect(blurRadius()).toBe("0px");
  });

  it("names the last section that has crossed the activation line", () => {
    // The line sits at 28% of the viewport: a section is current once its top is above it, and
    // the answer is the last one that qualifies rather than the first.
    const [, second, third] = links;
    sectionTops.set(landingAnchor[must(second, "the second link").anchor], 10);
    sectionTops.set(landingAnchor[must(third, "the third link").anchor], 5_000);

    render(<Probe />);
    scrollTo(400);

    expect(state()).toHaveAttribute("data-anchor", must(second, "the second link").anchor);
  });

  /**
   * A page too short to scroll has no "current section": every anchor is on screen at once. The
   * header would otherwise light up whichever one happened to sit highest.
   */
  it("falls back to the first section on a page that cannot scroll", () => {
    const [, second] = links;
    sectionTops.set(landingAnchor[must(second, "the second link").anchor], 10);
    setDocumentHeight(window.innerHeight - 1);

    render(<Probe />);
    scrollTo(0);

    expect(state()).toHaveAttribute("data-anchor", firstAnchor);
  });

  it("raises the bar the moment the page moves at all", () => {
    render(<Probe />);

    scrollTo(1);
    expect(state()).toHaveAttribute("data-scrolled", "true");

    scrollTo(0);
    expect(state()).toHaveAttribute("data-scrolled", "false");
  });

  /**
   * The band's radius is the scroll position made visible rather than a state that flips at a
   * threshold, which is why it is written straight to the node and why a halfway scroll has to
   * read as a halfway radius.
   */
  it("ramps the blur with the scroll and then holds it", () => {
    render(<Probe />);

    scrollTo(130);
    paintFrames();
    expect(blurRadius()).toBe("7px");

    scrollTo(10_000);
    paintFrames();
    expect(blurRadius()).toBe("14px");
  });

  it("pins the action only once its twin in the bar has left the screen", () => {
    render(<Probe />);

    scrollTo(200);
    paintFrames();
    expect(state()).toHaveAttribute("data-action-out", "false");

    actionBottom = -1;
    scrollTo(400);
    paintFrames();
    expect(state()).toHaveAttribute("data-action-out", "true");
  });

  // One listener per concern on a page this long is a scroll handler nobody notices until the
  // page they left is still measuring itself.
  it("lets go of the window when the header unmounts", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Probe />);

    unmount();

    const events = removeEventListener.mock.calls.map(([event]) => event);
    expect(events).toContain("scroll");
    expect(events).toContain("resize");
  });
});
