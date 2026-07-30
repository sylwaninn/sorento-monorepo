import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { landingContent } from "@/features/landing/content";
import {
  audienceToneById,
  landingPictures,
  moneyPresentationById,
  reassuranceIconById,
  resultIconById,
  stepIconById,
  trustIconById,
} from "@/features/landing/presentation";
import { must } from "@/test/must";

const sorted = (values: readonly string[]) => [...values].sort();

/** Vitest runs from the workspace it belongs to, which is where the document lives. */
const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

const preloadAttribute = (name: string): string =>
  must(
    new RegExp(`<link\\b[^>]*\\brel="preload"[^>]*\\b${name}="([^"]*)"`).exec(indexHtml)?.[1],
    `the hero preload's ${name} in index.html`,
  );

describe("landing presentation", () => {
  it("keys every visual association by the stable content identifier", () => {
    expect(sorted(Object.keys(audienceToneById))).toEqual(
      sorted(landingContent.audiences.items.map((item) => item.id)),
    );
    expect(sorted(Object.keys(resultIconById))).toEqual(
      sorted(landingContent.result.features.map((item) => item.id)),
    );
    expect(sorted(Object.keys(moneyPresentationById))).toEqual(
      sorted(landingContent.forgottenMoney.items.map((item) => item.id)),
    );
    expect(sorted(Object.keys(stepIconById))).toEqual(
      sorted(landingContent.howItWorks.steps.map((item) => item.id)),
    );
    expect(sorted(Object.keys(reassuranceIconById))).toEqual(
      sorted(landingContent.reassurance.points.map((item) => item.id)),
    );
    expect(sorted(Object.keys(trustIconById))).toEqual(
      sorted(landingContent.hero.trustPoints.map((item) => item.id)),
    );
  });

  /**
   * The hero photograph is preloaded from the static document because React has not mounted yet
   * when the browser could start fetching it. A preload only helps if it selects the same
   * candidate the element goes on to request: a different one is a second download of the
   * largest asset on the page, and it competes with the one that will actually be painted.
   *
   * The two lists therefore exist twice, in index.html and here, and this is what compares them.
   */
  it("preloads exactly the hero candidate the hero element will ask for", () => {
    expect(preloadAttribute("imagesrcset")).toBe(landingPictures.hero.avifSrcSet);
    expect(preloadAttribute("imagesizes")).toBe(landingPictures.hero.sizes);
  });

  /** A preloaded image the browser then decides to wait for is a preload working against itself. */
  it("marks the hero as the priority image on both sides", () => {
    expect(landingPictures.hero.priority).toBe(true);
    expect(preloadAttribute("fetchpriority")).toBe("high");
  });
});
