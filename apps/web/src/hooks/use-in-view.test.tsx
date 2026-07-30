import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInView } from "@/hooks/use-in-view";
import { must } from "@/test/must";

interface Watch {
  report: IntersectionObserverCallback;
  rootMargin: string | undefined;
  observed: Element[];
  disconnected: boolean;
}

const watches: Watch[] = [];

/**
 * src/test/setup.ts gives jsdom an IntersectionObserver that does nothing, so a component can
 * mount at all. This one records instead, which is the only way to drive the hook through the
 * transitions it exists for.
 */
class RecordingObserver {
  private readonly watch: Watch;

  constructor(report: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.watch = { report, rootMargin: options?.rootMargin, observed: [], disconnected: false };
    watches.push(this.watch);
  }

  observe = (element: Element): void => {
    this.watch.observed.push(element);
  };

  unobserve = (): void => {};
  disconnect = (): void => {
    this.watch.disconnected = true;
  };
  takeRecords = (): [] => [];
}

const Probe = () => {
  const { ref, isInView } = useInView<HTMLDivElement>();
  return <div ref={ref} data-in-view={isInView} data-testid="probe" />;
};

const probe = () => screen.getByTestId("probe");

const onlyWatch = () => must(watches[0], "the observer the hook created");

/** Only the field the hook reads: a complete entry would add nothing the assertion needs. */
const reportIntersecting = (isIntersecting: boolean) => {
  act(() => {
    onlyWatch().report(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as unknown as IntersectionObserver,
    );
  });
};

beforeEach(() => {
  watches.length = 0;
  vi.stubGlobal("IntersectionObserver", RecordingObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useInView", () => {
  // An animation that runs before anyone can see it burns frames for nothing, and on a page this
  // long most of what it decorates is off screen for most of the visit.
  it("answers no until the observer has said otherwise", () => {
    render(<Probe />);

    expect(probe()).toHaveAttribute("data-in-view", "false");
    expect(onlyWatch().observed).toEqual([probe()]);
  });

  it("follows the element in, and back out again", () => {
    render(<Probe />);

    reportIntersecting(true);
    expect(probe()).toHaveAttribute("data-in-view", "true");

    reportIntersecting(false);
    expect(probe()).toHaveAttribute("data-in-view", "false");
  });

  // An element that only starts moving once it has crossed the fold is visibly stopped for the
  // first frames a reader sees of it.
  it("starts watching before the element reaches the fold", () => {
    render(<Probe />);

    expect(onlyWatch().rootMargin).toBe("120px");
  });

  it("stops observing once the element is gone", () => {
    const { unmount } = render(<Probe />);

    unmount();

    expect(onlyWatch().disconnected).toBe(true);
  });

  /**
   * A browser without the API is a browser where nothing can be known about visibility. The hook
   * has to mount there rather than throw: the throw would land in the router's error boundary
   * and replace the whole screen over a decoration.
   */
  it("mounts where the browser has no observer at all", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(<Probe />);

    expect(probe()).toHaveAttribute("data-in-view", "false");
    expect(watches).toEqual([]);
  });
});
