import { useEffect, useRef, useState, type RefObject } from "react";

export interface InViewState<TElement extends Element> {
  /** Attach to the element whose visibility decides the answer. */
  ref: RefObject<TElement | null>;
  isInView: boolean;
}

/**
 * Whether an element is on screen, so a decoration can stop working while nobody is looking at
 * it. Answers `false` until the observer has said otherwise, which is what keeps an off-screen
 * animation from running for the frames before the first callback lands.
 *
 * The margin is generous on purpose: an animation that only starts once its element has crossed
 * the fold is visibly stopped for the first frames a reader sees of it.
 */
export const useInView = <TElement extends Element>(
  rootMargin = "120px",
): InViewState<TElement> => {
  const ref = useRef<TElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    // jsdom has no IntersectionObserver, and a test that mounts the section is not the place to
    // discover that. Nothing is observed there, so the element simply stays out of view.
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry?.isIntersecting ?? false),
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isInView };
};
