import { useEffect, useRef, useState, type RefObject } from "react";
import { sharedContent } from "@/components/content";
import { landingAnchor, type LandingAnchorId } from "@/navigation";

const { links } = sharedContent.publicNavigation;
const [firstLink] = links;

/** How far down the viewport a section has to reach before the header calls it the current one. */
const ACTIVATION_RATIO = 0.28;
/**
 * How far the page has to scroll for the blur band to go from nothing to full strength. Longer
 * than the header's own height on purpose: the band is the one piece that ramps rather than
 * moves, and over a short distance a ramp reads as a switch being thrown.
 */
const BLUR_RAMP_DISTANCE = 260;
/** The band's blur radius at full progress: enough to read as glass, not a frosted wall. */
const MAX_BLUR_PX = 14;

export interface LandingHeaderState {
  activeAnchor: LandingAnchorId;
  /** Whether the page has moved at all, which is all the bar's own shadow needs to know. */
  hasScrolled: boolean;
  /**
   * Whether the header's own action group has left the viewport. Read from the same per-frame
   * scroll clock as the blur band rather than a separate IntersectionObserver: two independent
   * async sources (an observer callback and a scroll listener) drift apart under fast scroll in
   * either direction, so the pinned action would arrive at a different offset depending on
   * whether the page was moving up or down. One clock, one answer regardless of direction.
   */
  isActionOutOfView: boolean;
  /** Attach to the header's action group: it is what the visibility check above observes. */
  actionRef: RefObject<HTMLDivElement | null>;
  /**
   * Attach to the blur band. Its --header-blur is written straight to the node once per animation
   * frame, read from the live scroll position, rather than going through state or a CSS
   * transition: the band's strength IS a function of how far the page has scrolled, and anything
   * easing on a timer arrives after the scroll it belongs to and reads as a jump. It is also why
   * nothing here is React state: a value that changes every frame would re-render the whole
   * header for a number a single node consumes.
   *
   * The radius is the only thing that ramps, and it has to be. Fading the band in with opacity
   * cannot work: an ancestor with opacity below 1 becomes a backdrop root, and a backdrop-filter
   * inside one samples only what is painted within that ancestor, which here is nothing. The
   * blur stays invisible at every intermediate value and then appears whole the instant opacity
   * reaches exactly 1. A radius of 0 is the honest way to render "no blur yet".
   */
  blurRef: RefObject<HTMLDivElement | null>;
}

/**
 * Scroll state the header needs, read from one passive listener rather than one per concern, so
 * a long homepage does not pay for a second scroll handler doing the same work.
 */
export const useLandingHeader = (): LandingHeaderState => {
  const [activeAnchor, setActiveAnchor] = useState<LandingAnchorId>(firstLink.anchor);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isActionOutOfView, setIsActionOutOfView] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let blurFrame: number | null = null;

    const paintBlurBand = () => {
      blurFrame = null;
      const band = blurRef.current;
      if (!band) {
        return;
      }
      const progress = Math.min(1, Math.max(0, window.scrollY / BLUR_RAMP_DISTANCE));
      band.style.setProperty("--header-blur", `${progress * MAX_BLUR_PX}px`);

      // Read in the same frame the blur band paints in, off the same scroll tick, rather than
      // from an IntersectionObserver callback: an observer fires on its own schedule, and racing
      // it against the blur band's per-frame read is what let the pinned action land at a
      // different offset depending on scroll direction.
      const action = actionRef.current;
      if (action) {
        setIsActionOutOfView(action.getBoundingClientRect().bottom <= 0);
      }
    };

    const syncHeaderState = () => {
      // Coalesced to one write per frame: scroll events can outpace paints, and the band only
      // ever shows the position it is painted at.
      if (blurFrame === null) {
        blurFrame = window.requestAnimationFrame(paintBlurBand);
      }
      setHasScrolled(window.scrollY > 0);

      if (document.documentElement.scrollHeight <= window.innerHeight) {
        setActiveAnchor(firstLink.anchor);
        return;
      }

      const activationLine = window.innerHeight * ACTIVATION_RATIO;
      let reachedAnchor: LandingAnchorId = firstLink.anchor;

      for (const link of links.slice(1)) {
        const section = document.getElementById(landingAnchor[link.anchor]);
        if (!section || section.getBoundingClientRect().top > activationLine) {
          break;
        }
        reachedAnchor = link.anchor;
      }

      setActiveAnchor((current) => (current === reachedAnchor ? current : reachedAnchor));
    };

    syncHeaderState();
    window.addEventListener("scroll", syncHeaderState, { passive: true });
    window.addEventListener("resize", syncHeaderState);

    return () => {
      window.removeEventListener("scroll", syncHeaderState);
      window.removeEventListener("resize", syncHeaderState);
      if (blurFrame !== null) {
        window.cancelAnimationFrame(blurFrame);
      }
    };
  }, []);

  return { activeAnchor, hasScrolled, isActionOutOfView, actionRef, blurRef };
};
