type ProgressiveBlurProps = {
  className?: string;
  backgroundColor?: string;
  position?: "top" | "bottom";
  height?: string;
  blurAmount?: string;
  /**
   * Deviation from upstream, additive so the default is upstream's exact behaviour: the colour of
   * the background veil, split out from `backgroundColor`. Upstream drives both the veil and the
   * mask's opaque stop from one prop, which makes a blur-only band impossible, and over a dark
   * photograph the cream veil reads as fog rather than as glass. Pass "transparent" for blur with
   * no tint; the mask keeps working because it only ever cared about `backgroundColor`'s alpha.
   */
  tint?: string;
};

// Themed through the tokens per project convention: upstream's literal off-white hex default is
// swapped for the cream brand token so a caller that never overrides backgroundColor still gets
// our palette instead of a hard-coded near-miss of it.
const ProgressiveBlur = ({
  className = "",
  backgroundColor = "var(--brand-cream)",
  position = "top",
  height = "150px",
  blurAmount = "4px",
  tint,
}: ProgressiveBlurProps) => {
  const isTop = position === "top";
  const veil = tint ?? backgroundColor;

  return (
    <div
      className={`pointer-events-none absolute left-0 w-full select-none ${className}`}
      style={{
        [isTop ? "top" : "bottom"]: 0,
        height,
        background: isTop
          ? `linear-gradient(to top, transparent, ${veil})`
          : `linear-gradient(to bottom, transparent, ${veil})`,
        maskImage: isTop
          ? `linear-gradient(to bottom, ${backgroundColor} 50%, transparent)`
          : `linear-gradient(to top, ${backgroundColor} 50%, transparent)`,
        WebkitBackdropFilter: `blur(${blurAmount})`,
        backdropFilter: `blur(${blurAmount})`,
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    />
  );
};

export { ProgressiveBlur };

/**
 * Skiper 41 Canvas_Landing_004: inspired by and adapted from https://devouringdetails.com/.
 * We respect the original creators. This is an inspired rebuild with our own taste and does not
 * claim any ownership. These animations aren't associated with devouringdetails.com. They're
 * independent recreations meant to study interaction design.
 *
 * The upstream file also ships a Skiper41 demo component (a full showcase page with placeholder
 * copy). Dropped here since only ProgressiveBlur itself is used; the demo carried hard-coded
 * hex colours the project's tokens-only rule forbids.
 *
 * License and usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
